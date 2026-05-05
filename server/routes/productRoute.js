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
} from "../controllers/productController.js";
import { upload } from "../config/multer.js";
import { productSchema, productUpdateSchema } from "../validators/schemas.js";

const router = express.Router();

router.get("/", authMiddleware, getProducts);
router.get("/deleted", authMiddleware, getDeletedProducts);
router.post("/add", authMiddleware, upload.single("image"), validate(productSchema), addProduct);
router.put("/restore/:id", authMiddleware, restoreProduct);
router.delete("/permanent/:id", authMiddleware, deleteProductPermanent);
router.put("/:id", authMiddleware, upload.single("image"), validate(productUpdateSchema), updateProduct);
router.delete("/:id", authMiddleware, deleteProduct);

export default router;
