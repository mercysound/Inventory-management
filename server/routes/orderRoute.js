import express from 'express';
import {addOrder} from '../controllers/orderController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/add', authMiddleware, addOrder);
// router.get('/', authMiddleware, getCategories);
// router.put('/:id', authMiddleware, updateCategory);
// router.delete('/:id', authMiddleware, deleteCategory);

export default router;