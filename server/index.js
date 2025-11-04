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
import allOrdersPlacedRoutes from "./routes/allOrdersPlacedRoutes.js";
import completedOrderHistoryRoutes from "./routes/completedOrderHistoryRoutes.js";


  // const __filename = fileURLToPath(import.meta.url);
  // const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// ✅ Dynamic origin detection (auto works in dev + production)
const allowedOrigins = [
  "http://localhost:5173", // your local frontend (Vite)
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
    credentials: true, // allows cookies or tokens to be sent
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
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
app.listen(port, "0.0.0.0", () => {
  connectDB();
  console.log(`✅ Server running on http://${IP}:${port}`);
});

