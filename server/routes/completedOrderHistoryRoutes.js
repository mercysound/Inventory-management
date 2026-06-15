import express from "express";
import {
  getCompletedHistory,
  getCancelledPendingRefund,
  deleteCompletedOrder,
  clearAllCompletedOrders,
  markRefundMade,
} from "../controllers/completedOrderHistoryController.js";
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// router.get("/", authMiddleware, adminOnly, getCompletedOrders);
router.get("/", authMiddleware, getCompletedHistory);
router.get("/cancelled-pending", authMiddleware, getCancelledPendingRefund);
router.post("/:id/refund", authMiddleware, markRefundMade);
router.delete("/:id", authMiddleware, deleteCompletedOrder);
// router.delete("/:id", authMiddleware, adminOnly, deleteCompletedOrder);
router.delete("/clear/all", authMiddleware, clearAllCompletedOrders);

export default router;
