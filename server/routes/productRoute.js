import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { validate } from '../middleware/validate.js';
import {
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  getDeletedProducts,
  restoreProduct,
  deleteProductPermanent,
  getProductDraft, // these three are for draft management
  saveProductDraft,
  clearProductDraft
} from "../controllers/productController.js";
import { upload } from "../config/multer.js";
import { productSchema, productUpdateSchema } from "../validators/schemas.js";

const router = express.Router();
// ── Routes — add these alongside your existing product routes ──
// Make sure your auth middleware (e.g. protect/isAdmin) is applied

router.get("/products/draft",    authMiddleware, getProductDraft);
router.put("/products/draft",    authMiddleware, saveProductDraft);
router.delete("/products/draft", authMiddleware, clearProductDraft);

// ⚠️ These three must be registered ABOVE any route that has
// "/products/:id" — otherwise Express will match "draft" as an :id
router.get("/", authMiddleware, getProducts);
router.get("/deleted", authMiddleware, getDeletedProducts);
router.post("/add", authMiddleware, upload.single("image"), validate(productSchema), addProduct);
router.put("/restore/:id", authMiddleware, restoreProduct);
router.delete("/permanent/:id", authMiddleware, deleteProductPermanent);
router.put("/:id", authMiddleware, upload.single("image"), validate(productUpdateSchema), updateProduct);
router.delete("/:id", authMiddleware, deleteProduct);

export default router;
