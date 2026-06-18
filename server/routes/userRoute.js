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
  emailBroadcastStatus,
  toggleUserStatus,
  bulkToggleUserStatus,
} from '../controllers/userController.js';
import {
  userSchema,
  userUpdateSchema,
  completeProfileSchema,
  updateUserSchema,
  emailBroadcastSchema
} from '../validators/schemas.js';

const router = express.Router();

// ── Public ───────────────────────────────────────────────────────────────────
router.post('/register', validate(userSchema), addUser);

// ── Authenticated user: own profile ──────────────────────────────────────────
// ✅ CRITICAL: These MUST come BEFORE /:id routes.
// Express matches routes top-to-bottom. If /:id is registered first,
// PUT /profile matches it with id="profile" → hits admin-only guard → 403.
router.get('/profile', authMiddleware, getUser);
router.put('/profile', authMiddleware, updateUserprofile);
router.put('/complete-profile', authMiddleware, validate(completeProfileSchema), updateProfile);

// ── Admin: email broadcast ────────────────────────────────────────────────────
// Also before /:id so /email-broadcast doesn't match /:id
router.post('/email-broadcast', authMiddleware, authorizeRoles('admin'), validate(emailBroadcastSchema), emailBroadcast);
router.get('/email-broadcast/:jobId', authMiddleware, authorizeRoles('admin'), emailBroadcastStatus);

// ── Admin: user management ────────────────────────────────────────────────────
router.post('/add', authMiddleware, authorizeRoles('admin'), validate(userSchema), addUser);
router.get('/', authMiddleware, authorizeRoles('admin'), getUsers);

// ── Admin: activate / deactivate ─────────────────────────────────────────────
// bulk-status MUST be registered before /:id so Express doesn't treat
// "bulk-status" as a user id parameter.
router.post('/bulk-status', authMiddleware, authorizeRoles('admin'), bulkToggleUserStatus);
router.patch('/:id/status', authMiddleware, authorizeRoles('admin'), toggleUserStatus);

router.put('/:id', authMiddleware, authorizeRoles('admin'), validate(updateUserSchema), updateUser);
router.delete('/:id', authMiddleware, authorizeRoles('admin'), deleteUser);

export default router;