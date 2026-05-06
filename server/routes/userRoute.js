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
  updateUser,
  emailBroadcast,
  emailBroadcastStatus,   // NEW
} from '../controllers/userController.js';
import {
  userSchema,
  userUpdateSchema,
  completeProfileSchema,
  updateUserSchema,
  emailBroadcastSchema
} from '../validators/schemas.js';

const router = express.Router();

// ── Public ──────────────────────────────────────────────────────────────────
router.post('/register', validate(userSchema), addUser);

// ── Admin: user management ────────────────────────────────────────────────
router.post('/add', authMiddleware, authorizeRoles('admin'), validate(userSchema), addUser);
router.get('/', authMiddleware, authorizeRoles('admin'), getUsers);
router.put('/:id', authMiddleware, authorizeRoles('admin'), validate(updateUserSchema), updateUser);
router.delete('/:id', authMiddleware, authorizeRoles('admin'), deleteUser);

// ── Admin: email broadcast ─────────────────────────────────────────────────
// Start a broadcast job → responds immediately with jobId
router.post(
  '/email-broadcast',
  authMiddleware,
  authorizeRoles('admin'),
  validate(emailBroadcastSchema),
  emailBroadcast
);
// Poll job status → { status, total, sent, failed, failedList, finishedAt }
router.get(
  '/email-broadcast/:jobId',
  authMiddleware,
  authorizeRoles('admin'),
  emailBroadcastStatus
);

// ── Authenticated user: own profile ───────────────────────────────────────
router.get('/profile', authMiddleware, getUser);
router.put('/profile', authMiddleware, validate(userUpdateSchema), updateUserprofile);
router.put('/complete-profile', authMiddleware, validate(completeProfileSchema), updateProfile);

export default router;


