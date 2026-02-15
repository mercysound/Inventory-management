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
router.put("/:id/status", authMiddleware, authorizeRoles("admin"), updateDeliveryStatus);
router.delete("/clear", authMiddleware, authorizeRoles("admin"), clearAllPlacedOrders);

// ✅ Delete single order
router.delete("/:id", authMiddleware, authorizeRoles("admin"), deletePlacedOrder);
// router.get("/", authMiddleware, getAllPlacedOrders);
// router.put("/:id/status", authMiddleware, adminOnly, updateDeliveryStatus);
// router.delete("/clear", authMiddleware, adminOnly, clearAllPlacedOrders);

// // ✅ Delete single order
// router.delete("/:id", authMiddleware, adminOnly, deletePlacedOrder);

export default router;
