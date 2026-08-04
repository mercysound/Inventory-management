// server/routes/superAdminRoutes.js
import express from "express";
import rateLimit from "express-rate-limit";
import { superAdminMiddleware } from "../middleware/tenantMiddleware.js";
import {
  superAdminLogin,
  initSuperAdmin,
  getAllTenants,
  getTenant,
  createTenant,
  updateTenant,
  toggleTenantStatus,
  resetTenantOwnerPassword,
  deleteTenant,
  getPlatformStats,
  tenantOwnerLogin,
} from "../controllers/superAdminController.js";

const router = express.Router();

// Strict rate limiting on super admin auth routes
const superAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  handler: (req, res) => res.status(429).json({ success: false, message: "Too many attempts" }),
});

// ── Init (run ONCE to create first super admin) ───────────────────────────────
// Protected by SUPER_ADMIN_INIT_SECRET env var — disable after first use
router.post("/init",  superAuthLimiter, initSuperAdmin);

// ── Auth ──────────────────────────────────────────────────────────────────────
router.post("/login", superAuthLimiter, superAdminLogin);

// ── Tenant (store) owner login ────────────────────────────────────────────────
router.post("/store/:slug/login", superAuthLimiter, tenantOwnerLogin);

// ── Protected routes (super admin only) ──────────────────────────────────────
router.get("/stats",                  superAdminMiddleware, getPlatformStats);
router.get("/tenants",                superAdminMiddleware, getAllTenants);
router.post("/tenants",               superAdminMiddleware, createTenant);
router.get("/tenants/:id",            superAdminMiddleware, getTenant);
router.put("/tenants/:id",            superAdminMiddleware, updateTenant);
router.patch("/tenants/:id/status",   superAdminMiddleware, toggleTenantStatus);
router.post("/tenants/:id/reset-password", superAdminMiddleware, resetTenantOwnerPassword);
router.delete("/tenants/:id",         superAdminMiddleware, deleteTenant);

export default router;
