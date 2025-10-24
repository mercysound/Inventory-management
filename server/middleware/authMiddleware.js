import jwt from "jsonwebtoken";
import User from "../models/UserModel.js";

const authMiddleware = async (req, res, next) => {
  try {
    // 🔹 Get token from header OR query string
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (req.query.token) {
      token = req.query.token; // ✅ allow token from URL query
    }

    if (!token) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({ success: false, message: "User not found" });
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

export default authMiddleware;
