// server/routes/allOrdersPlacedRoutes.js
import express from "express";
import {
  getAllPlacedOrders,
  updateDeliveryStatus,
  clearAllPlacedOrders,
  deletePlacedOrder,
} from "../controllers/allOrdersPlacedController.js";
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware.js";
import { validate } from '../middleware/validate.js';
import { deliveryStatusSchema } from '../validators/schemas.js';

const router = express.Router();

router.get("/", authMiddleware, getAllPlacedOrders);
router.put(
  "/:id/status",
  authMiddleware,
  authorizeRoles("admin"),
  validate(deliveryStatusSchema),
  updateDeliveryStatus
);
router.delete("/clear", authMiddleware, authorizeRoles("admin"), clearAllPlacedOrders);

// ✅ Delete single order
router.delete("/:id", authMiddleware, authorizeRoles("admin"), deletePlacedOrder);

export default router;
