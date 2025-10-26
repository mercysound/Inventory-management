import express from 'express';
import {authMiddleware} from '../middleware/authMiddleware.js';
import { getData } from '../controllers/dashboardController.js';

const router = express.Router();

router.get('/', authMiddleware, getData);
// router.post('/', authMiddleware, getData);
// router.put('/:id', authMiddleware, updateCategory);
// router.delete('/:id', authMiddleware, deleteCategory);

export default router;