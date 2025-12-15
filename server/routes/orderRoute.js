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
  increaseOrderQuantity,
  getOrderByProduct,
  updateOrder,
} from "../controllers/orderController.js";

const router = express.Router();

router.get("/", authMiddleware, getOrders);
router.post("/add", authMiddleware, addOrder);

// ✅ UNIVERSAL COMPLETE ORDER (staff + customer)
router.post("/complete", authMiddleware, completeOrder);

// (Optional legacy support)
router.post("/payment", authMiddleware, completeOrder);

router.delete("/clear", authMiddleware, clearUserOrders);
router.post("/reduce/:orderId", authMiddleware, reduceOrder);
router.post("/increase/:orderId", authMiddleware, increaseOrderQuantity);
router.delete("/remove/:orderId", authMiddleware, deleteOrderItem);

router.get("/invoice", optionalAuthMiddleware, generateInvoice);

// extra
router.get("/product/:productId", authMiddleware, getOrderByProduct);
router.patch("/update/:orderId", authMiddleware, updateOrder);

export default router;
