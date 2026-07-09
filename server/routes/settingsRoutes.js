// server/routes/settingsRoutes.js
import express from "express";
import {
  getSettings,
  updateSettings,
  getProductDraft,
  saveProductDraft,
  clearProductDraft,
  getDelegation,
  updateDelegation,
  getMyDelegationStatus,
  getGlobalTheme,
  getContactInfo,
  getMyWholesaleAccess,
  getWholesaleAccess,
  updateWholesaleAccess,
  getGuestBrowsingStatus,
  getMaintenanceStatus,
  updateMaintenanceMode,
  updateGuestBrowsing,
  getAdminFullSettings,
} from "../controllers/settingsController.js";
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// ── Fully public (no auth) ────────────────────────────────────────────────────
router.get("/theme",               getGlobalTheme);
router.get("/contact-info",        getContactInfo);
router.get("/maintenance-status",  getMaintenanceStatus);
router.get("/guest-browsing",      getGuestBrowsingStatus);

// ── Global settings ───────────────────────────────────────────────────────────
router.get("/",             authMiddleware, authorizeRoles("admin"), getSettings);
router.put("/",             authMiddleware, authorizeRoles("admin"), updateSettings);
router.get("/admin-full",   authMiddleware, authorizeRoles("admin"), getAdminFullSettings);

// ── Guest browsing + Maintenance mode (admin only) ────────────────────────────
router.put("/guest-browsing", authMiddleware, authorizeRoles("admin"), updateGuestBrowsing);
router.put("/maintenance",    authMiddleware, authorizeRoles("admin"), updateMaintenanceMode);

// ── Order management delegation ───────────────────────────────────────────────
router.get("/delegation",    authMiddleware, authorizeRoles("admin"), getDelegation);
router.put("/delegation",    authMiddleware, authorizeRoles("admin"), updateDelegation);
router.get("/my-delegation", authMiddleware, authorizeRoles("staff"), getMyDelegationStatus);

// ── Wholesale pricing access ──────────────────────────────────────────────────
router.get("/wholesale-access",    authMiddleware, authorizeRoles("admin"), getWholesaleAccess);
router.put("/wholesale-access",    authMiddleware, authorizeRoles("admin"), updateWholesaleAccess);
router.get("/my-wholesale",        authMiddleware, authorizeRoles("staff"), getMyWholesaleAccess);

// ── Product form draft — persisted per admin user in DB ───────────────────────
router.get("/product-draft",    authMiddleware, authorizeRoles("admin"), getProductDraft);
router.put("/product-draft",    authMiddleware, authorizeRoles("admin"), saveProductDraft);
router.delete("/product-draft", authMiddleware, authorizeRoles("admin"), clearProductDraft);

export default router;
