import express from "express";
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware.js";
import { validate } from '../middleware/validate.js';
import {
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  getDeletedProducts,
  restoreProduct,
  deleteProductPermanent,
  toggleNewArrival,
  toggleBonanza,
  toggleStaffOnly,
  batchDelete,
  batchToggleFlag,
  batchPermanentDelete,
  setLowStockConfig,
} from "../controllers/productController.js";
import { uploadProductImages } from "../config/multer.js";
import { productSchema, productUpdateSchema } from "../validators/schemas.js";
import productNotifier from "../utils/productNotifier.js";

const router = express.Router();

// ── Standard CRUD ─────────────────────────────────────────────────────────────
router.get("/",               authMiddleware, getProducts);
router.get("/deleted",        authMiddleware, getDeletedProducts);
router.post("/add",           authMiddleware, uploadProductImages, validate(productSchema), addProduct);
router.put("/restore/:id",    authMiddleware, restoreProduct);
router.delete("/permanent/:id", authMiddleware, deleteProductPermanent);

// ── Single flag toggles ───────────────────────────────────────────────────────
router.patch("/:id/new-arrival",      authMiddleware, authorizeRoles("admin"), toggleNewArrival);
router.patch("/:id/bonanza",          authMiddleware, authorizeRoles("admin"), toggleBonanza);
router.patch("/:id/staff-only",       authMiddleware, authorizeRoles("admin"), toggleStaffOnly);
router.patch("/:id/low-stock-config", authMiddleware, authorizeRoles("admin"), setLowStockConfig);

// ── Bulk operations (admin only) ──────────────────────────────────────────────
router.post("/batch/delete",           authMiddleware, authorizeRoles("admin"), batchDelete);
router.post("/batch/permanent-delete", authMiddleware, authorizeRoles("admin"), batchPermanentDelete);
router.post("/batch/flag",             authMiddleware, authorizeRoles("admin"), batchToggleFlag);

// ── PUT / DELETE single product ───────────────────────────────────────────────
router.put("/:id",    authMiddleware, uploadProductImages, validate(productUpdateSchema), updateProduct);
router.delete("/:id", authMiddleware, deleteProduct);

// ── Product SSE stream — real-time flag updates to all connected clients ──────
// Emits: productFlagChanged { productId, field, value }
router.get("/stream", authMiddleware, (req, res) => {
  res.set({
    "Content-Type":  "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection":    "keep-alive",
  });
  res.flushHeaders?.();

  const send = (name, data) => {
    try {
      res.write(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch {}
  };

  const onFlagChanged = (payload) => send("productFlagChanged", payload);
  productNotifier.on("productFlagChanged", onFlagChanged);

  // Keep-alive ping every 20s
  const ka = setInterval(() => { try { res.write(": ping\n\n"); } catch {} }, 20000);

  req.on("close", () => {
    clearInterval(ka);
    productNotifier.removeListener("productFlagChanged", onFlagChanged);
  });
});

export default router;
