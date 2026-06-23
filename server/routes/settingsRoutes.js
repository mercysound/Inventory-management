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
} from "../controllers/settingsController.js";
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// ── Public: global theme (no auth — used by all users on load) ───────────────
router.get("/theme",        getGlobalTheme);
// ── Public: store contact info (no auth — shown on landing page) ─────────────
router.get("/contact-info", getContactInfo);

// ── Global settings ───────────────────────────────────────────────────────────
router.get("/",  authMiddleware, authorizeRoles("admin"), getSettings);
router.put("/",  authMiddleware, authorizeRoles("admin"), updateSettings);

// ── Delegation settings — admin manages, staff reads their own status ─────────
router.get("/delegation",    authMiddleware, authorizeRoles("admin"), getDelegation);
router.put("/delegation",    authMiddleware, authorizeRoles("admin"), updateDelegation);
router.get("/my-delegation", authMiddleware, authorizeRoles("staff"), getMyDelegationStatus);

// ── Product form draft — persisted per admin user in DB ───────────────────────
router.get("/product-draft",    authMiddleware, authorizeRoles("admin"), getProductDraft);
router.put("/product-draft",    authMiddleware, authorizeRoles("admin"), saveProductDraft);
router.delete("/product-draft", authMiddleware, authorizeRoles("admin"), clearProductDraft);

export default router;
