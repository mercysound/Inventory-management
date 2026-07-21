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
    if (!user) return sendError(res, 404, "User not found");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return sendError(res, 401, "Invalid credentials");

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "2d" }
    );

    return sendResponse(res, 200, {
      token,
      user: {
        id:               user._id,
        name:             user.name,
        email:            user.email,
        role:             user.role,       // ← wholesale role returned correctly
        picture:          user.picture || "",
        phone:            user.phone   || "",
        address:          user.address || "",
        profileCompleted: user.profileCompleted,
      },
    }, "Login successful");
  } catch (error) {
    console.error("Login error:", error);
    return sendError(res, 500, "Failed to login");
  }
};
const googleLogin = async (req, res) => {
  try {
    const { tokenId } = req.body;
    const ticket = await client.verifyIdToken({
      idToken:  tokenId,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const { email, name, picture } = ticket.getPayload();

    let user = await User.findOne({ email });
    if (!user) {
      const password = await bcrypt.hash(email + JWT_SECRET, 10);
      user = await User.create({
        name, email, password,
        role:             "customer",
        profileCompleted: false,
      });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: "2d" }
    );

    return sendResponse(res, 200, {
      token,
      user: {
        id:               user._id,
        name:             user.name,
        email:            user.email,
        role:             user.role,
        picture,
        phone:            user.phone   || "",
        address:          user.address || "",
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
      return sendResponse(res, 200, null,
        "If an account with that email exists, a password reset link has been sent.");
    }
    const resetToken     = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");
    user.resetPasswordToken   = resetTokenHash;
    user.resetPasswordExpires = Date.now() + 3600000;
    await user.save();
    try {
      await sendPasswordResetEmail(user.email, resetToken);
      return sendResponse(res, 200, null, "Password reset link sent to your email.");
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
      user.resetPasswordToken   = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      return sendError(res, 500, "Failed to send reset email. Please try again.");
    }
  } catch (error) {
    console.error("Forgot password error:", error);
    return sendError(res, 500, "Failed to process request");
  }
};

const validateResetToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return sendResponse(res, 400, null, "Token is required");
    const resetTokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      resetPasswordToken:   resetTokenHash,
      resetPasswordExpires: { $gt: Date.now() },
    });
    if (!user) return sendResponse(res, 200, { valid: false }, "Invalid or expired token");
    return sendResponse(res, 200, { valid: true }, "Token is valid");
  } catch (error) {
    console.error("Validate reset token error:", error);
    return sendError(res, 500, "Failed to validate token");
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return sendError(res, 400, "Token and password are required");
    const resetTokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      resetPasswordToken:   resetTokenHash,
      resetPasswordExpires: { $gt: Date.now() },
    });
    if (!user) return sendError(res, 400, "Invalid or expired reset token");
    user.password             = await bcrypt.hash(password, 10);
    user.resetPasswordToken   = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    return sendResponse(res, 200, null, "Password reset successfully");
  } catch (error) {
    console.error("Reset password error:", error);
    return sendError(res, 500, "Failed to reset password");
  }
};

const logout = async (req, res) => {
  try {
    return sendResponse(res, 200, null, "Logged out successfully");
  } catch (error) {
    return sendError(res, 500, "Failed to logout");
  }
};

const refreshToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return sendError(res, 401, "No token provided");
    // Verify without ignoring expiration — expired tokens must not get new tokens
    // This enforces the 2-day session limit. The frontend handles re-login.
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await User.findById(decoded.id);
    if (!user) return sendError(res, 404, "User not found");
    if (user.isActive === false) return sendError(res, 403, "Account suspended");
    const newToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "2d" }
    );
    return sendResponse(res, 200, { accessToken: newToken }, "Token refreshed successfully");
  } catch (error) {
    console.error("Token refresh error:", error);
    return sendError(res, 401, "Failed to refresh token");
  }
};

export { login, googleLogin, forgotPassword, validateResetToken, resetPassword, logout, refreshToken };