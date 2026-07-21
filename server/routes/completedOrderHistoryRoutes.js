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

// Any authenticated user can view their own history (controller filters by role)
router.get("/",                authMiddleware,                              getCompletedHistory);
router.get("/cancelled-pending", authMiddleware,                            getCancelledPendingRefund);

// Refund marking — admin only
router.post("/:id/refund",    authMiddleware, authorizeRoles("admin"),      markRefundMade);

// Delete — admin only
router.delete("/clear/all",   authMiddleware, authorizeRoles("admin"),      clearAllCompletedOrders);
router.delete("/:id",         authMiddleware, authorizeRoles("admin", "staff"), deleteCompletedOrder);

export default router;
