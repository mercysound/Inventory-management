import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/UserModel.js';
import { OAuth2Client } from "google-auth-library";
import { sendResponse, sendError } from '../utils/apiResponse.js';
import { sendPasswordResetEmail } from '../utils/email/passwordReset.js';


const JWT_SECRET = process.env.JWT_SECRET;
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);


const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return sendError(res, 404, "User not found");
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return sendError(res, 401, "Invalid credentials");
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '2d' });

    return sendResponse(res, 200, {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        picture: user.picture || "",
        phone: user.phone || "",
        address: user.address || "",
        profileCompleted: user.profileCompleted,
      }
    }, "Login successful");

  } catch (error) {
    console.error('Login error:', error);
    return sendError(res, 500, "Failed to login");
  }
};
const googleLogin = async (req, res) => {
  try {
    const { tokenId } = req.body;

    // Verify token with Google
    const ticket = await client.verifyIdToken({
      idToken: tokenId,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { email, name, picture } = ticket.getPayload();

    // Check if user exists
    let user = await User.findOne({ email });

    if (!user) {
      // New user → create automatically
      const password = await bcrypt.hash(email + JWT_SECRET, 10); // pseudo-password
      user = await User.create({
        name,
        email,
        password,
        role: "customer",  // default role
        profileCompleted: false,   // ❗ Google users must complete profile
      });
    }

    // Generate token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: "2d" }
    );

    // Send full user details including profileCompleted status
    return sendResponse(res, 200, {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        picture,
        phone: user.phone || "",
        address: user.address || "",
        profileCompleted: user.profileCompleted,
      },
    }, "Google login successful");

  } catch (error) {
    console.error("Google login error:", error);
    return sendError(res, 500, "Google login failed");
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      // Don't reveal if email exists or not for security
      return sendResponse(res, 200, null, "If an account with that email exists, a password reset link has been sent.");
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Set token and expiry (1 hour)
    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Send email
    try {
      await sendPasswordResetEmail(user.email, resetToken);
      return sendResponse(res, 200, null, "Password reset link sent to your email.");
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
      // Reset the token if email fails
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      return sendError(res, 500, "Failed to send reset email. Please try again.");
    }

  } catch (error) {
    console.error('Forgot password error:', error);
    return sendError(res, 500, "Failed to process request");
  }
};

const validateResetToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return sendResponse(res, 400, null, "Token is required");
    }

    // Hash the token to compare with stored hash
    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: resetTokenHash,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return sendResponse(res, 200, { valid: false }, "Invalid or expired token");
    }

    return sendResponse(res, 200, { valid: true }, "Token is valid");

  } catch (error) {
    console.error('Validate reset token error:', error);
    return sendError(res, 500, "Failed to validate token");
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return sendError(res, 400, "Token and password are required");
    }

    // Hash the token to compare with stored hash
    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: resetTokenHash,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return sendError(res, 400, "Invalid or expired reset token");
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return sendResponse(res, 200, null, "Password reset successfully");

  } catch (error) {
    console.error('Reset password error:', error);
    return sendError(res, 500, "Failed to reset password");
  }
};

const logout = async (req, res) => {
  try {
    // If using token blacklist, add token to blacklist here
    // For now, client-side logout is sufficient since we're using client-stored tokens
    return sendResponse(res, 200, null, "Logged out successfully");
  } catch (error) {
    console.error('Logout error:', error);
    return sendError(res, 500, "Failed to logout");
  }
};

const refreshToken = async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return sendError(res, 401, "No token provided");
    }

    // Verify the existing token
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });
    
    const user = await User.findById(decoded.id);
    if (!user) {
      return sendError(res, 404, "User not found");
    }

    // Generate new token
    const newToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '2d' }
    );

    return sendResponse(res, 200, { accessToken: newToken }, "Token refreshed successfully");
  } catch (error) {
    console.error('Token refresh error:', error);
    return sendError(res, 401, "Failed to refresh token");
  }
};

export { login, googleLogin, forgotPassword, validateResetToken, resetPassword, logout, refreshToken };