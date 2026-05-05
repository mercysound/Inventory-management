import express from 'express';
import { addCategory, getCategories, updateCategory, deleteCategory } from '../controllers/categoryController.js';
import { authMiddleware, authorizeRoles } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { categorySchema } from '../validators/schemas.js';

const router = express.Router();

router.post('/add', authMiddleware, authorizeRoles('admin'), validate(categorySchema), addCategory);
router.get('/', authMiddleware, getCategories);
router.put('/:id', authMiddleware, authorizeRoles('admin'), validate(categorySchema), updateCategory);
router.delete('/:id', authMiddleware, authorizeRoles('admin'), deleteCategory);

export default router;