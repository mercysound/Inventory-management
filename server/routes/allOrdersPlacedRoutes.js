// server/routes/allOrdersPlacedRoutes.js
import express from "express";
import {
  getAllPlacedOrders,
  updateDeliveryStatus,
  clearAllPlacedOrders,
  deletePlacedOrder,
} from "../controllers/allOrdersPlacedController.js";
import { authMiddleware, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, adminOnly, getAllPlacedOrders);
router.put("/:id/status", authMiddleware, adminOnly, updateDeliveryStatus);
router.delete("/clear", authMiddleware, adminOnly, clearAllPlacedOrders);

// ✅ Delete single order
router.delete("/:id", authMiddleware, adminOnly, deletePlacedOrder);

export default router;
