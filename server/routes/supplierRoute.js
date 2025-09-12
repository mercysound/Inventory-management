import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { addSupplier, getSupplier } from '../controllers/supplierController.js';

const router = express.Router();

router.post('/add', authMiddleware, addSupplier);
router.get('/', authMiddleware, getSupplier);
// router.put('/:id', authMiddleware, updateCategory);
// router.delete('/:id', authMiddleware, deleteCategory);

export default router;