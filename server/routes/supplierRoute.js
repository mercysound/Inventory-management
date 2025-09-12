import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { addSupplier, getSupplier, updateSupplier, deleteDelete } from '../controllers/supplierController.js';

const router = express.Router();

router.post('/add', authMiddleware, addSupplier);
router.get('/', authMiddleware, getSupplier);
router.put('/:id', authMiddleware, updateSupplier);
router.delete('/:id', authMiddleware, deleteDelete);

export default router;