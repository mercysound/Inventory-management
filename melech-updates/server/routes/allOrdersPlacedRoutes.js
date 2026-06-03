// server/routes/allOrdersPlacedRoutes.js
import express from "express";
import {
  getAllPlacedOrders,
  updateDeliveryStatus,
  clearAllPlacedOrders,
  deletePlacedOrder,
} from "../controllers/allOrdersPlacedController.js";
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, getAllPlacedOrders);

// ✅ "cancelled" is now a valid status option
router.put("/:id/status", authMiddleware, authorizeRoles("admin"), updateDeliveryStatus);

router.delete("/clear", authMiddleware, authorizeRoles("admin"), clearAllPlacedOrders);
router.delete("/:id", authMiddleware, authorizeRoles("admin"), deletePlacedOrder);

export default router;
