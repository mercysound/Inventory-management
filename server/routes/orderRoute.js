// backend/routes/orderRoutes.js
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
  getOrderByProduct,      // new
  updateOrder,            // new
  getInvoiceByOrderId,
  getInvoiceByHistoryId
} from "../controllers/orderController.js";



const router = express.Router();

router.get("/", authMiddleware, getOrders);
router.post("/add", authMiddleware, addOrder);
router.post("/payment", authMiddleware, completeOrder);
router.delete("/clear", authMiddleware, clearUserOrders);
router.post("/reduce/:orderId", authMiddleware, reduceOrder);
router.post("/increase/:orderId", authMiddleware, increaseOrderQuantity);
router.delete("/remove/:orderId", authMiddleware, deleteOrderItem);
router.get("/invoice", optionalAuthMiddleware, generateInvoice);

// NEW endpoints
router.get("/product/:productId", authMiddleware, getOrderByProduct); // get order by product for current user
router.patch("/update/:orderId", authMiddleware, updateOrder); // update an existing order
router.get("/invoice/:id", authMiddleware, getInvoiceByOrderId);
router.get("/invoice/history/:id", authMiddleware, getInvoiceByHistoryId);

export default router;
