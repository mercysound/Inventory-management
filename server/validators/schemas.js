// server/validators/schemas.js
import Joi from "joi";

// User validation schemas
export const userSchema = Joi.object({
  name: Joi.string().required().trim().min(2).max(50),
  email: Joi.string().email().required().lowercase().trim(),
  password: Joi.string().min(6).required(),
  phone: Joi.string().required().trim().min(5).max(20),
  address: Joi.string().required().trim().min(3).max(500),
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
   image: Joi.string().allow(null, "").optional(),
  removeImage: Joi.string().allow("true", "false").optional(), 
});

// Supplier validation schemas
export const supplierSchema = Joi.object({
  name: Joi.string().required().trim().min(1),
  email: Joi.string().required().trim(),
  phone: Joi.string().required().trim(),
  address: Joi.string().required().trim(),
  contactPerson: Joi.string().trim().optional(),
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

export const authSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

export const createOrderSchema = Joi.object({
  productId: Joi.string().required().hex().length(24),
  quantity: Joi.number().required().integer().min(1),
  total: Joi.number().required().positive(),
  price: Joi.number().required().positive(),
});

export const completeOrderSchema = Joi.object({
  paymentMethod: Joi.string().valid("card", "bank_transfer", "cash_on_delivery", "Paystack").required(),
  buyerName: Joi.string().trim().max(100).optional(),
});

export const googleLoginSchema = Joi.object({
  tokenId: Joi.string().required(),
});

export const updateOrderSchema = Joi.object({
  quantity: Joi.number().integer().min(1).optional(),
  total: Joi.number().positive().optional(),
  price: Joi.number().positive().optional(),
});

export const deliveryStatusSchema = Joi.object({
  deliveryStatus: Joi.string()
    .valid("pending", "processing", "shipped", "delivered")
    .required(),
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  password: Joi.string().min(6).required(),
});

export const validateResetTokenSchema = Joi.object({
  token: Joi.string().required(),
});

export const productUpdateSchema = productSchema.fork([
  "name",
  "description",
  "price",
  "stock",
  "categoryId",
  "supplierId",
  "images",
  "image",        // ✅ ADD THIS
  "removeImage",
], (field) => field.optional());

export const supplierUpdateSchema = supplierSchema.fork([
  "name",
  "email",
  "phone",
  "address",
  "contactPerson",
], (field) => field.optional());

export const userUpdateSchema = userSchema.fork([
  "name",
  "email",
  "password",
  "phone",
  "address",
  "role",
], (field) => field.optional()).keys({
  oldPassword: Joi.string().optional(),      // ✅ ADD
  confirmPassword: Joi.string().optional(),  // ✅ ADD (validation handled in frontend/controller)
});

export const completeProfileSchema = Joi.object({
  phone: Joi.string().pattern(/^[\+]?[0-9][\d]{0,15}$/).required(),
  address: Joi.string().trim().max(500).optional(),
});

// Pagination schema
export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sort: Joi.string().optional(),
  order: Joi.string().valid("asc", "desc").default("desc"),
});