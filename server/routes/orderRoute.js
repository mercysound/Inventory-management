import express from "express";
import { authMiddleware, optionalAuthMiddleware } from "../middleware/authMiddleware.js";
import { validate } from '../middleware/validate.js';
import {
  addOrder,
  verifyStock,
  getOrders,
  completeOrder,
  generateInvoice,
  reduceOrder,
  deleteOrderItem,
  clearUserOrders,
  increaseOrderQuantity,
  getOrderByProduct,
  updateOrder,
  setPriceMode,
} from "../controllers/orderController.js";
import orderNotifier from "../utils/orderNotifier.js";
import { createOrderSchema, completeOrderSchema, updateOrderSchema } from '../validators/schemas.js';

const router = express.Router();

router.get("/", authMiddleware, getOrders);
router.post("/add", authMiddleware, validate(createOrderSchema), addOrder);

// ✅ Pre-payment stock verification — call BEFORE opening Paystack popup
// Returns 409 with conflict details if any cart item has insufficient stock
router.post("/verify-stock", authMiddleware, verifyStock);

router.post("/complete", authMiddleware, validate(completeOrderSchema), completeOrder);
router.post("/payment", authMiddleware, validate(completeOrderSchema), completeOrder);

router.delete("/clear", authMiddleware, clearUserOrders);
router.post("/reduce/:orderId", authMiddleware, reduceOrder);
router.post("/increase/:orderId", authMiddleware, increaseOrderQuantity);
router.delete("/remove/:orderId", authMiddleware, deleteOrderItem);

// ✅ Toggle price mode (wholesale <-> retail) for all cart items
router.post("/set-price-mode/:mode", authMiddleware, setPriceMode);

router.get("/invoice", optionalAuthMiddleware, generateInvoice);

router.get("/product/:productId", authMiddleware, getOrderByProduct);
router.patch("/update/:orderId", authMiddleware, validate(updateOrderSchema), updateOrder);

// Server-Sent Events: stream order-related notifications to clients
router.get('/stream', authMiddleware, (req, res) => {
  // SSE headers
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.flushHeaders?.();

  const sendEvent = (name, data) => {
    try {
      res.write(`event: ${name}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (e) {
      // ignore
    }
  };

  const onPriceChanged = (payload) => sendEvent('productPriceChanged', payload);

  orderNotifier.on('productPriceChanged', onPriceChanged);

  // Keep connection alive with pings
  const keepAlive = setInterval(() => {
    res.write(': ping\n\n');
  }, 20 * 1000);

  req.on('close', () => {
    clearInterval(keepAlive);
    orderNotifier.removeListener('productPriceChanged', onPriceChanged);
  });
});

export default router;