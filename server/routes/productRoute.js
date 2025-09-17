import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { getProducts } from '../controllers/productController.js';
import { addProduct } from '../controllers/productController.js';

const router = express.Router();

router.get('/', authMiddleware, getProducts);
router.post('/add', authMiddleware, addProduct);
// router.put('/:id', authMiddleware, updateSupplier);
// router.delete('/:id', authMiddleware, deleteDelete);

export default router;