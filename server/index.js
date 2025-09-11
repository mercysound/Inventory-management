// const express = require("express")
import express from "express";
import  cors from "cors";
import connectDB from "./db/connection.js";
import authRoutes from './routes/auth.js'
import categoryRoute from './routes/categoryRoute.js'
import supplierRoute from './routes/supplierRoute.js'

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/category', categoryRoute)
app.use('/api/supplier', supplierRoute)



app.listen(process.env.PORT, () => {
  connectDB()
  console.log('Server is running on http://localhost:3000');
}
);