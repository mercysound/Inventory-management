import express from "express";
import { authMiddleware, optionalAuthMiddleware } from "../middleware/authMiddleware.js";
import { validate } from '../middleware/validate.js';
import {
  addOrder,
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
