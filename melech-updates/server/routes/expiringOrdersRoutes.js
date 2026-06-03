// server/routes/expiringOrdersRoutes.js
import express from "express";
import { getExpiringOrders, getExpiringOrdersCount } from "../controllers/expiringOrdersController.js";
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// Full list — used by the ExpiringOrders page
router.get("/", authMiddleware, authorizeRoles("admin"), getExpiringOrders);

// Count only — used by the notification bell (polled every 2 minutes)
router.get("/count", authMiddleware, authorizeRoles("admin"), getExpiringOrdersCount);

export default router;
