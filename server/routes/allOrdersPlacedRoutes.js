// server/routes/allOrdersPlacedRoutes.js
import express from "express";
import {
  getAllPlacedOrders,
  getPlacedOrderById,
  updateDeliveryStatus,
  clearAllPlacedOrders,
} from "../controllers/allOrdersPlacedController.js";
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware.js";
import { checkDelegatedAccess, softDelegationCheck } from "../middleware/delegationMiddleware.js";
import orderNotifier from "../utils/orderNotifier.js";

const router = express.Router();

// ── SSE stream — MUST be defined before /:id so "stream" is not treated as an id ──
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

  const onOrderUpdated = (payload) => {
    if (!payload.userId || payload.userId === userId) {
      sendEvent("placedOrderUpdated", payload);
    }
  };

  orderNotifier.on("placedOrderUpdated", onOrderUpdated);

  const keepAlive = setInterval(() => {
    try { res.write(": ping\n\n"); } catch (e) { /* ignore */ }
  }, 20_000);

  req.on("close", () => {
    clearInterval(keepAlive);
    orderNotifier.removeListener("placedOrderUpdated", onOrderUpdated);
  });
});

// GET all placed orders — all authenticated users; controller filters by role
// softDelegationCheck passes customers/wholesale through and sets isDelegatedStaff for staff
router.get("/", authMiddleware, softDelegationCheck, getAllPlacedOrders);

// GET a single placed order by ID — admin and delegated staff only
router.get("/:id", authMiddleware, checkDelegatedAccess, getPlacedOrderById);

// PUT update delivery status — admin and delegated staff only
router.put("/:id/status", authMiddleware, checkDelegatedAccess, updateDeliveryStatus);

// DELETE clear all placed orders — admin only
router.delete("/clear/all", authMiddleware, authorizeRoles("admin"), clearAllPlacedOrders);

export default router;
