// server/routes/allOrdersPlacedRoutes.js
import express from "express";
import {
  getAllPlacedOrders,
  updateDeliveryStatus,
  clearAllPlacedOrders,
} from "../controllers/allOrdersPlacedController.js";
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware.js";
import orderNotifier from "../utils/orderNotifier.js";

const router = express.Router();

// GET all placed orders (admin sees all; others see their own)
router.get("/", authMiddleware, getAllPlacedOrders);

// PUT update delivery status for a placed order
router.put("/:id/status", authMiddleware, authorizeRoles("admin"), updateDeliveryStatus);

// DELETE clear all placed orders
router.delete("/clear/all", authMiddleware, authorizeRoles("admin"), clearAllPlacedOrders);

// ── SSE stream — pushes real-time order status updates to buyers ─────────────
// Customers / wholesale connect here and get notified instantly when the admin
// changes their order status — no page reload needed.
router.get("/stream", authMiddleware, (req, res) => {
  res.set({
    "Content-Type":  "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection":    "keep-alive",
  });
  res.flushHeaders?.();

  const userId = String(req.user._id);

  const sendEvent = (name, data) => {
    try {
      res.write(`event: ${name}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (e) { /* ignore — client disconnected */ }
  };

  // Only forward events that belong to this user (or broadcast events)
  const onOrderUpdated = (payload) => {
    if (!payload.userId || payload.userId === userId) {
      sendEvent("placedOrderUpdated", payload);
    }
  };

  orderNotifier.on("placedOrderUpdated", onOrderUpdated);

  // Keep-alive ping every 20 s so the connection isn't dropped by proxies
  const keepAlive = setInterval(() => {
    try { res.write(": ping\n\n"); } catch (e) { /* ignore */ }
  }, 20_000);

  req.on("close", () => {
    clearInterval(keepAlive);
    orderNotifier.removeListener("placedOrderUpdated", onOrderUpdated);
  });
});

export default router;
