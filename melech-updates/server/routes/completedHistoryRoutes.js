// server/routes/completedHistoryRoutes.js
import express from "express";
import {
  getCompletedHistory,
  getCancelledPendingRefund,
  markRefundMade,
  deleteCompletedOrder,
  clearAllCompletedOrders,
} from "../controllers/completedHistoryController.js";
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET all completed history (role-filtered inside controller)
router.get("/", authMiddleware, getCompletedHistory);

// GET cancelled orders pending refund — used by buyer's PendingOrdersModal
router.get("/cancelled-pending", authMiddleware, getCancelledPendingRefund);

// POST mark refund as done — admin only, one-time irreversible
router.post("/:id/refund", authMiddleware, authorizeRoles("admin"), markRefundMade);

// DELETE clear all (soft delete)
router.delete("/clear/all", authMiddleware, clearAllCompletedOrders);

// DELETE single order (soft delete / hide)
router.delete("/:id", authMiddleware, deleteCompletedOrder);

export default router;
