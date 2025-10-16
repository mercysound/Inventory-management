import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
// import path from "path";
// import { fileURLToPath } from "url";
import connectDB from "./db/connection.js";

import authRoutes from "./routes/auth.js";
import categoryRoutes from "./routes/categoryRoute.js";
import supplierRoutes from "./routes/supplierRoute.js";
import productRoutes from "./routes/productRoute.js";
import userRoute from "./routes/userRoute.js";
import orderRouter from "./routes/orderRoute.js";
import dashboardRouter from "./routes/dashboardRoute.js";

  // const __filename = fileURLToPath(import.meta.url);
  // const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// ✅ Dynamic CORS based on environment
const allowedOrigins =
  process.env.NODE_ENV === "production"
    ? ["https://inventory-management-r2y8.onrender.com"]
    : ["http://localhost:5173"];

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
})); ///

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

// // Serve frontend
// app.use(express.static(path.join(__dirname, "../frontend/dist")));

// // Catch-all for React Router
// app.get("*", (req, res) => {
//   res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
// });

// Start server
app.listen(port, () => {
  connectDB();
  console.log(`Server running on http://localhost:${port}`);
});
