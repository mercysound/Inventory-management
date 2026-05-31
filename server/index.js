// import { setServers, setDefaultResultOrder } from "node:dns";
// setServers(["8.8.8.8", "1.1.1.1"]);
// setDefaultResultOrder("ipv4first");
import dotenv from "dotenv";

dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET', 'GOOGLE_CLIENT_ID', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length) {
  console.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
  process.exit(1);
}

import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import connectDB from "./db/connection.js";
import { requestLogger } from "./middleware/logger.js";
import { errorHandler } from "./middleware/errorHandler.js";

import authRoutes from "./routes/auth.js";
import categoryRoutes from "./routes/categoryRoute.js";
import supplierRoutes from "./routes/supplierRoute.js";
import productRoutes from "./routes/productRoute.js";
import userRoute from "./routes/userRoute.js";
import orderRouter from "./routes/orderRoute.js";
import dashboardRouter from "./routes/dashboardRoute.js";
import allOrdersPlacedRoutes from "./routes/allOrdersPlacedRoutes.js";
import completedOrderHistoryRoutes from "./routes/completedOrderHistoryRoutes.js";
import cloudinary from "./config/cloudinary.js";
//meant for production only, to serve frontend from same server whe
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 5002;
const isDev = process.env.NODE_ENV === "development";

// ── CORS (MUST BE FIRST — before rate limiters and helmet)
// If CORS comes after rate limiters, 429 responses won't have CORS headers
// and the browser will show a CORS error instead of the actual rate limit error.
const allowedOrigins = [
  // DEV MODE TESTING: uncomment these when running frontend locally.
  // Do not leave local origins enabled in production.
  // "http://localhost:5173",
  // "http://127.0.0.1:5173",
  // "http://localhost:3000",

  // Production origin for Render fullstack deployment.
  // If you deploy to a different domain, set FRONTEND_URL in Render env vars.
  process.env.FRONTEND_URL || "https://inventory-management-zs8z.onrender.com",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log("❌ CORS blocked request from:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    maxAge: 86400,
  })
);

// ── SECURITY MIDDLEWARE ──
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "https://js.paystack.co",
          "https://accounts.google.com",
          "https://www.gstatic.com",
        ],
        scriptSrcElem: [
          "'self'",
          "https://js.paystack.co",
          "https://accounts.google.com",
          "https://www.gstatic.com",
        ],
        connectSrc: [
          "'self'",
          "https://api.paystack.co",
          "https://accounts.google.com",
          "https://www.googleapis.com",
          "https://oauth2.googleapis.com",
        ],
        frameSrc: [
          "'self'",
          "blob:",
          "https://js.paystack.co",
          "https://checkout.paystack.com",
          "https://accounts.google.com",
        ],
        objectSrc: ["'self'", "blob:"],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://accounts.google.com",
          "https://www.gstatic.com",
        ],
        styleSrcElem: [
          "'self'",
          "'unsafe-inline'",
          "https://accounts.google.com",
          "https://www.gstatic.com",
        ],
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https://accounts.google.com",
          "https://www.gstatic.com",
          // Allow Google profile / avatar images used by the OAuth flow
          "https://lh3.googleusercontent.com",
          "https://*.googleusercontent.com",
          // Cloudinary images used for product photos
          "https://res.cloudinary.com",
        ],
      },
    },
  })
);

// ── RATE LIMITING ──
//
// Why these numbers?
// A normal user navigating the app fires 3-5 API calls per page load.
// With 10 pages visited and auto-refreshes, that's easily 100+ calls per session.
// 100/15min is way too low — it punishes normal usage, especially on shared IPs.
//
// General API limiter — keyed by user ID when authenticated, IP otherwise.
// This prevents one user from burning another user's quota on shared IPs (office/university NAT).
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 2000 : 500,   // 500/15min = ~33 req/min — comfortable for real app usage
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?._id?.toString() || ipKeyGenerator(req),
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many requests, please try again later.",
    });
  },
});

// Auth limiter — only login/register/google-login routes
// Tight here is correct — legitimate users rarely login more than a few times
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 100 : 20,   // 20 login attempts per 15 min in production is generous
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req),  // always IP-based for auth routes
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      statusCode: 429,
      message: "Too many login attempts, please try again later.",
      timestamp: new Date().toISOString(),
    });
  },
});

// ── REQUEST LOGGING ──
app.use(requestLogger);

// ── APPLY RATE LIMITING ──
app.use("/api/", limiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/google-login", authLimiter);

// ── SANITIZE AGAINST NoSQL INJECTION ──
app.use(mongoSanitize());

// ── BODY SIZE LIMITS ──
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// ── API ROUTES ──
app.use("/api/auth", authRoutes);
app.use("/api/category", categoryRoutes);
app.use("/api/supplier", supplierRoutes);
app.use("/api/products", productRoutes);
app.use("/api/users", userRoute);
app.use("/api/orders", orderRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/placed-orders", allOrdersPlacedRoutes);
app.use("/api/completed-history", completedOrderHistoryRoutes);

// ── SERVE FRONTEND IN PRODUCTION WHEN DEPLOYING FULLSTACK TOGETHER ──
if (!isDev) {
  // Try a few likely locations for the built frontend to make deployment diagnostics easier.
  const candidatePaths = [
    path.join(__dirname, "../frontend/dist"),
    path.join(process.cwd(), "frontend", "dist"),
    path.join(__dirname, "dist"),
  ];

  const frontendDistPath = candidatePaths.find((p) => fs.existsSync(p));

  if (!frontendDistPath) {
    console.error("❌ Frontend 'dist' folder not found. Checked:", candidatePaths);
    // Keep the server running but return a helpful error for any non-API requests.
    app.get("/*", (req, res) => {
      if (req.path.startsWith("/api")) {
        return res.status(404).json({ success: false, message: "API route not found" });
      }
      return res.status(500).send(
        "Frontend build missing on server. Check deployment logs for the frontend build step."
      );
    });
  } else {
    console.log("✅ Serving frontend from:", frontendDistPath);
    app.use(express.static(frontendDistPath));

    app.get("/*", (req, res) => {
      if (req.path.startsWith("/api")) {
        return res.status(404).json({ success: false, message: "API route not found" });
      }

      const indexPath = path.join(frontendDistPath, "index.html");
      if (!fs.existsSync(indexPath)) {
        console.error("❌ index.html missing in frontend dist:", indexPath);
        return res.status(500).send("Frontend index.html missing. Check deployment build output.");
      }

      return res.sendFile(indexPath);
    });
  }
}

// ── GLOBAL ERROR HANDLER (must be last) ──
app.use(errorHandler);

// ── START SERVER ──
const IP = process.env.LOCAL_IP || "localhost";

app.listen(port, "0.0.0.0", async () => {
  try {
    await connectDB();
    console.log(`✅ Server running on http://${IP}:${port}`);
  } catch (error) {
    console.error("❌ Server startup failed:", error);
    process.exit(1);
  }
});

// ── HANDLE PORT CONFLICT ──
app.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`❌ Port ${port} is already in use. Free it or change PORT in .env`);
    process.exit(1);
  }
});