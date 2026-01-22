import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { 
  getProducts, 
  addProduct, 
  updateProduct, 
  deleteProduct, 
  getDeletedProducts,
  restoreProduct,
  deleteProductPermanent 
} from "../controllers/productController.js";
import { upload } from "../config/multer.js";

const router = express.Router();

router.get("/", authMiddleware, getProducts);
router.get("/deleted", authMiddleware, getDeletedProducts); // ✅ new
router.post("/add", authMiddleware, upload.single("image"), addProduct);
router.put("/:id", authMiddleware, upload.single("image"), updateProduct);
router.delete("/:id", authMiddleware, deleteProduct);
router.put("/restore/:id", authMiddleware, restoreProduct); // ✅ new
router.delete("/permanent/:id", authMiddleware, deleteProductPermanent);


export default router;
