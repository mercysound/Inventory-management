// server/validators/schemas.js
import Joi from "joi";

// User validation schemas
export const userSchema = Joi.object({
  name: Joi.string().required().trim().min(2).max(50),
  email: Joi.string().email().required().lowercase().trim(),
  password: Joi.string().min(6).required(),
  phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).optional(),
  address: Joi.string().trim().max(500).optional(),
  role: Joi.string().valid("admin", "staff", "customer").default("customer"),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

// Category validation schemas
export const categorySchema = Joi.object({
  categoryName: Joi.string().required().trim().min(2).max(50),
  categoryDescription: Joi.string().required().trim().max(500),
});

// Product validation schemas
export const productSchema = Joi.object({
  name: Joi.string().required().trim().min(2).max(100),
  description: Joi.string().required().trim().max(1000),
  price: Joi.number().required().positive().precision(2),
  stock: Joi.number().required().integer().min(0),
  categoryId: Joi.string().required().hex().length(24),
  supplierId: Joi.string().required().hex().length(24),
  images: Joi.array().items(Joi.string().uri()).max(10).optional(),
});

// Supplier validation schemas
export const supplierSchema = Joi.object({
  name: Joi.string().required().trim().min(2).max(100),
  email: Joi.string().email().required().lowercase().trim(),
  phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).required(),
  address: Joi.string().required().trim().max(500),
  contactPerson: Joi.string().trim().max(100).optional(),
});

// Order validation schemas
export const orderSchema = Joi.object({
  items: Joi.array().items(
    Joi.object({
      productId: Joi.string().required().hex().length(24),
      quantity: Joi.number().required().integer().min(1),
      price: Joi.number().required().positive().precision(2),
    })
  ).min(1).required(),
  customerId: Joi.string().required().hex().length(24),
  totalAmount: Joi.number().required().positive().precision(2),
  status: Joi.string().valid("pending", "processing", "shipped", "delivered", "cancelled").default("pending"),
  shippingAddress: Joi.string().required().trim().max(500),
  paymentMethod: Joi.string().valid("card", "bank_transfer", "cash_on_delivery").required(),
});

// Pagination schema
export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sort: Joi.string().optional(),
  order: Joi.string().valid("asc", "desc").default("desc"),
});