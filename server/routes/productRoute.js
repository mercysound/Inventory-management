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
} from "../controllers/productController.js";
import { upload, uploadProductImages } from "../config/multer.js";
import { productSchema, productUpdateSchema } from "../validators/schemas.js";

const router = express.Router();

router.get("/",               authMiddleware, getProducts);
router.get("/deleted",        authMiddleware, getDeletedProducts);
router.post("/add",           authMiddleware, uploadProductImages, validate(productSchema), addProduct);
router.put("/restore/:id",    authMiddleware, restoreProduct);
router.delete("/permanent/:id", authMiddleware, deleteProductPermanent);
router.patch("/:id/new-arrival", authMiddleware, authorizeRoles("admin"), toggleNewArrival);
router.patch("/:id/bonanza",     authMiddleware, authorizeRoles("admin"), toggleBonanza);
router.patch("/:id/staff-only",  authMiddleware, authorizeRoles("admin"), toggleStaffOnly);
router.put("/:id",            authMiddleware, uploadProductImages, validate(productUpdateSchema), updateProduct);
router.delete("/:id",         authMiddleware, deleteProduct);

export default router;