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

// GET all placed orders (admin sees all; others see their own)
router.get("/", authMiddleware, getAllPlacedOrders);

// PUT update delivery status for a placed order
router.put("/:id/status", authMiddleware, authorizeRoles("admin"), updateDeliveryStatus);

// DELETE clear all placed orders
router.delete("/clear/all", authMiddleware, authorizeRoles("admin"), clearAllPlacedOrders);

// DELETE single placed order
router.delete("/:id", authMiddleware, authorizeRoles("admin"), deletePlacedOrder);

export default router;
