import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { addUser, getUser, deleteUser } from '../controllers/userController.js';

const router = express.Router();

router.post('/add', authMiddleware, addUser);
router.get('/', authMiddleware, getUser);
router.delete('/:id', authMiddleware, deleteUser);

export default router;