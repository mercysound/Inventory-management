import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import {addOrder, getOrders, getPurchaseHistory, clearAllHistory, clearHistoryByDate,} from '../controllers/orderController.js';

const router = express.Router();

router.post('/add', authMiddleware, addOrder);
router.get('/', authMiddleware, getOrders);
router.get("/history", authMiddleware, getPurchaseHistory);
router.delete("/history/clear", authMiddleware, clearAllHistory);
router.delete("/history/clear/:date", authMiddleware, clearHistoryByDate);
// router.put('/:id', authMiddleware, updateCategory);
// router.delete('/:id', authMiddleware, deleteCategory);

export default router;