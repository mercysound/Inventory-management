import express from "express";
import {
  getCompletedHistory,
  deleteCompletedOrder,
  clearCompletedOrders,
} from "../controllers/completedOrderHistoryController.js";
import { authMiddleware, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// router.get("/", authMiddleware, adminOnly, getCompletedOrders);
router.get("/", authMiddleware, getCompletedHistory);
router.delete("/:id", authMiddleware, deleteCompletedOrder);
// router.delete("/:id", authMiddleware, adminOnly, deleteCompletedOrder);
router.delete("/clear/all", authMiddleware, clearCompletedOrders);

export default router;
