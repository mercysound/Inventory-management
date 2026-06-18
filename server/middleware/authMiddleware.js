// server/middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import User from "../models/UserModel.js";

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    if (!token && req.query?.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (!user) return res.status(401).json({ success: false, message: "User not found" });

    // Block deactivated users — every authenticated request is checked here.
    // isActive defaults to true so existing users without the field are unaffected.
    //
    // EXCEPTION: /orders/complete and /orders/payment are allowed through even
    // when the account is suspended. This protects users who have already been
    // charged by Paystack — we must let the order complete and the receipt
    // generate, otherwise the money is taken but nothing is recorded.
    // The controller receives req.accountSuspended = true so it can log it.
    if (user.isActive === false) {
      const url = req.originalUrl || "";
      const isPaymentCompletion = url.includes("/orders/complete") || url.includes("/orders/payment");

      if (!isPaymentCompletion) {
        return res.status(403).json({
          success: false,
          code:    "ACCOUNT_DEACTIVATED",
          message: "Your account has been temporarily suspended. Please contact support.",
        });
      }
      // Payment completion — allow through, flag on req
      req.accountSuspended = true;
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: "Token expired, please login again" });
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }
    console.error("Auth middleware error:", error);
    return res.status(500).json({ success: false, message: "Internal server error in middleware" });
  }
};

const optionalAuthMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select("-password");
        if (user) {
          req.user = user;
        }
      } catch (err) {
        // Token is invalid/expired, but we continue anyway (truly optional)
        console.log("Token validation skipped in optional auth");
      }
    }
    
    // Continue regardless of token
    next();
  } catch (error) {
    console.error("Optional auth error:", error);
    // Continue on error
    next();
  }
};

// ✅ NEW: admin-only middleware
// const adminOnly = (req, res, next) => {
//   if (!req.user || req.user.role !== "admin") {
//     return res.status(403).json({ success: false, message: "Access denied. Admins only." });
//   }
//   next();
// };
// This part replace the admin-only middlware
 const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Access denied",
      });
    }

    next();
  };
};


export { authMiddleware, optionalAuthMiddleware, authorizeRoles };
