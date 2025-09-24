import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import {addOrder, getOrders} from '../controllers/orderController.js';

const router = express.Router();

router.post('/add', authMiddleware, addOrder);
router.get('/', authMiddleware, getOrders);
// router.put('/:id', authMiddleware, updateCategory);
// router.delete('/:id', authMiddleware, deleteCategory);

export default router;