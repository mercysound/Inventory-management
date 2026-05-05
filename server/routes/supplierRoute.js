import express from 'express';
import { authMiddleware, authorizeRoles } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { addSupplier, getSupplier, updateSupplier, deleteSupplier } from '../controllers/supplierController.js';
import { supplierSchema, supplierUpdateSchema } from '../validators/schemas.js';

const router = express.Router();

router.post('/add', authMiddleware, authorizeRoles('admin'), validate(supplierSchema), addSupplier);
router.get('/', authMiddleware, getSupplier);
router.put('/:id', authMiddleware, authorizeRoles('admin'), validate(supplierUpdateSchema), updateSupplier);
router.delete('/:id', authMiddleware, authorizeRoles('admin'), deleteSupplier);

export default router;