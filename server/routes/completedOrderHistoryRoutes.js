import express from "express";
import {
  getCompletedOrders,
  deleteCompletedOrder,
  clearCompletedOrders,
} from "../controllers/completedOrderHistoryController.js";
import { authMiddleware, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, adminOnly, getCompletedOrders);
router.delete("/:id", authMiddleware, adminOnly, deleteCompletedOrder);
router.delete("/clear/all", authMiddleware, adminOnly, clearCompletedOrders);

export default router;
