import express from 'express';
import { login, googleLogin, forgotPassword, validateResetToken, resetPassword, logout, refreshToken } from '../controllers/authController.js';
import { validate } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { authSchema, googleLoginSchema, forgotPasswordSchema, resetPasswordSchema, validateResetTokenSchema } from '../validators/schemas.js';
const router = express.Router();

router.post('/login', validate(authSchema), login);
router.post('/google-login', validate(googleLoginSchema), googleLogin);
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.post('/validate-reset-token', validate(validateResetTokenSchema), validateResetToken);
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);
router.post('/logout', authMiddleware, logout);
router.post('/refresh', refreshToken);

export default router;