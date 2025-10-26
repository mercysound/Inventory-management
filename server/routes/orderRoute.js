// server/routes/orderRoute.js
import express from "express";
import { authMiddleware, optionalAuthMiddleware } from "../middleware/authMiddleware.js";
import {
  addOrder,
  getOrders,
  completeOrder,
  generateInvoice,
  reduceOrder,
  deleteOrderItem,
  clearUserOrders,
} from "../controllers/orderController.js";

const router = express.Router();

router.post("/add", authMiddleware, addOrder);
router.get("/", authMiddleware, getOrders);
router.post("/payment", authMiddleware, completeOrder);

router.delete("/clear", authMiddleware, clearUserOrders);
router.post("/reduce/:orderId", authMiddleware, reduceOrder);
router.delete("/remove/:orderId", authMiddleware, deleteOrderItem);

router.get("/invoice", optionalAuthMiddleware, generateInvoice);

export default router;
