import express from 'express';
import { authMiddleware, authorizeRoles } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';

import {
  addUser,
  getUsers,
  deleteUser,
  getUser,
  updateUserprofile,
  updateProfile,
} from '../controllers/userController.js';
import { userSchema, userUpdateSchema, completeProfileSchema } from '../validators/schemas.js';

const router = express.Router();

router.post('/register', validate(userSchema), addUser); // public

// Only admin can add staff/admin internally
router.post('/add', authMiddleware, authorizeRoles("admin"), validate(userSchema), addUser);

// Only admin can view all users
router.get('/', authMiddleware, authorizeRoles("admin"), getUsers);

// Only admin can delete
router.delete('/:id', authMiddleware, authorizeRoles("admin"), deleteUser);

// Any logged in user can view their own profile
router.get('/profile', authMiddleware, getUser);

// Any logged in user can update their own profile
router.put('/profile', authMiddleware, validate(userUpdateSchema), updateUserprofile);

// Complete profile
router.put("/complete-profile", authMiddleware, validate(completeProfileSchema), updateProfile);

export default router;