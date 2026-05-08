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
} from "../controllers/orderController.js";
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

router.get("/invoice", optionalAuthMiddleware, generateInvoice);

router.get("/product/:productId", authMiddleware, getOrderByProduct);
router.patch("/update/:orderId", authMiddleware, validate(updateOrderSchema), updateOrder);

export default router;