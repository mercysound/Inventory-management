import express from 'express';
import { addCategory, getCategories, updateCategory, deleteCategory } from '../controllers/categoryController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { categorySchema } from '../validators/schemas.js';

const router = express.Router();

router.post('/add', authMiddleware, validate(categorySchema), addCategory);
router.get('/', authMiddleware, getCategories);
router.put('/:id', authMiddleware, validate(categorySchema), updateCategory);
router.delete('/:id', authMiddleware, deleteCategory);

export default router;