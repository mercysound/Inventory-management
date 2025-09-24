// const express = require("express")
import express from "express";
import  cors from "cors";
import connectDB from "./db/connection.js";
import authRoutes from './routes/auth.js'
import categoryRoutes from './routes/categoryRoute.js'
import supplierRoutes from './routes/supplierRoute.js'
import productRoutes from './routes/productRoute.js'
import userRoute from './routes/userRoute.js'
import orderRouter from './routes/orderRoute.js'

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/category', categoryRoutes)
app.use('/api/supplier', supplierRoutes)
app.use('/api/products', productRoutes);
app.use('/api/users', userRoute);
app.use('/api/orders', orderRouter);




app.listen(process.env.PORT, () => {
  connectDB()
  console.log('Server is running on http://localhost:3000');
}
);