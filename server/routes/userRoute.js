import express from 'express';
import {authMiddleware, authorizeRoles} from '../middleware/authMiddleware.js';

import { addUser, getUsers, deleteUser, getUser, updateUserprofile, updateProfile} from '../controllers/userController.js';

const router = express.Router();

router.post('/register', addUser); // public

// Only admin can add staff/admin internally
router.post('/add', authMiddleware, authorizeRoles("admin"), addUser);

// Only admin can view all users
router.get('/', authMiddleware, authorizeRoles("admin"), getUsers);

// Only admin can delete
router.delete('/:id', authMiddleware, authorizeRoles("admin"), deleteUser);

// Any logged in user can view their own profile
router.get('/profile', authMiddleware, getUser);

// Any logged in user can update their own profile
router.put('/profile', authMiddleware, updateUserprofile);

// Complete profile
router.put("/complete-profile", authMiddleware, updateProfile);


export default router;