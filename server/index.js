import { setServers, setDefaultResultOrder } from "node:dns";
setServers(["8.8.8.8", "1.1.1.1"]);
setDefaultResultOrder("ipv4first");
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
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
// import path from "path";
// import { fileURLToPath } from "url";
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


// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 5002;

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    statusCode: 429,
    message: "Too many requests from this IP, please try again later.",
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // stricter limit for auth endpoints
  message: {
    success: false,
    statusCode: 429,
    message: "Too many login attempts, please try again later.",
    timestamp: new Date().toISOString(),
  },
});

// Request logging
app.use(requestLogger);

// Apply rate limiting
app.use("/api/", limiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/google-login", authLimiter);

// Sanitize data against NoSQL injection
app.use(mongoSanitize());


// ✅ Dynamic origin detection (auto works in dev + production)
const allowedOrigins = [
  "http://localhost:5173", // your local frontend (Vite)
  "http://localhost:5174", // alternative Vite port
  "http://localhost:3000",
  "http://192.168.227.101:5173",      // ✅ your phone accessing via Wi-Fi
  "https://yourfrontend.onrender.com" // your deployed frontend
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log("❌ CORS blocked request from:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    maxAge: 86400
  })
);


// Middleware
// app.use(cors());
app.use(express.json());

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/category", categoryRoutes);
app.use("/api/supplier", supplierRoutes);
app.use("/api/products", productRoutes);
app.use("/api/users", userRoute);
app.use("/api/orders", orderRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/placed-orders", allOrdersPlacedRoutes);
app.use("/api/completed-history", completedOrderHistoryRoutes);

// Global error handler (must be last)
app.use(errorHandler);

// // Serve frontend
// app.use(express.static(path.join(__dirname, "../frontend/dist")));

// // Catch-all for React Router
// app.get("*", (req, res) => {
//   res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
// });

// Start server
// app.listen(port, () => {
//   connectDB();
//   console.log(`Server running on http://localhost:${port}`);
// });
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

// Handle port conflict
app.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`❌ Port ${port} is already in use. Free it or change PORT in .env`);
    process.exit(1);
  }
});
