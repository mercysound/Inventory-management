import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { addUser, getUsers, deleteUser, getUser, updateUserprofile} from '../controllers/userController.js';

const router = express.Router();

router.post('/add', authMiddleware, addUser);
router.get('/', authMiddleware, getUsers);
router.delete('/:id', authMiddleware, deleteUser);
router.get('/profile', authMiddleware, getUser);
router.put('/profile', authMiddleware, updateUserprofile);

export default router;