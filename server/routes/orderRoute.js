import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import {addOrder, getOrders, getPurchaseHistory, clearAllHistory, clearHistoryByDate, removeOneFromOrder,
  clearUserOrders,
  generateOrdersInvoice, generateInvoice} from '../controllers/orderController.js';

const router = express.Router();

router.post('/add', authMiddleware, addOrder);
router.get('/', authMiddleware, getOrders);
router.get("/history", authMiddleware, getPurchaseHistory);
router.delete("/history/clear", authMiddleware, clearAllHistory);
router.delete("/history/clear/:date", authMiddleware, clearHistoryByDate);
router.delete("/:id/remove-one", authMiddleware, removeOneFromOrder); // remove 1 qty
router.delete("/clear", authMiddleware, clearUserOrders); // clear current user's orders
router.get("/invoice", authMiddleware, generateOrdersInvoice); // ?format=pdf|png
router.get("/invoice/:customerName", authMiddleware, generateInvoice);
// router.put('/:id', authMiddleware, updateCategory);
// router.delete('/:id', authMiddleware, deleteCategory);

export default router;