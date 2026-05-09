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

// Product — supplierId optional
// Product validation schemas
export const productSchema = Joi.object({
  name: Joi.string().required().trim().min(2).max(100),
  description: Joi.string().required().trim().max(1000),
  price: Joi.number().required().positive().precision(2),
  stock: Joi.number().required().integer().min(0),
  categoryId: Joi.string().required().hex().length(24),
  supplierId: Joi.string().hex().length(24).allow("", null).optional(), // ✅ optional
  images: Joi.array().items(Joi.string().uri()).max(10).optional(),
  image: Joi.string().allow(null, "").optional(),
  removeImage: Joi.string().allow("true", "false").optional(),
});


// Supplier validation schemas
// Supplier — only name required
export const supplierSchema = Joi.object({
  name: Joi.string().required().trim().min(1).max(100),
  email: Joi.string().email().allow("", null).optional(),
  phone: Joi.string().allow("", null).optional(),
  address: Joi.string().allow("", null).optional(),
  contactPerson: Joi.string().allow("", null).optional(),
  notes: Joi.string().allow("", null).optional(),
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
  quantity:  Joi.number().required().integer().min(1),
  price:     Joi.number().required().positive(),
  total:     Joi.number().positive().optional(), // ✅ was required, now optional
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
  "image",
  "removeImage",
], (field) => field.optional());

export const supplierUpdateSchema = supplierSchema.fork(
  ["name"], (field) => field.optional()
);

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



// ──────────────────────────────────────────────────────────────────────────────
// ADD THESE TWO SCHEMAS to your validators/schemas.js  (Joi example shown)
// ──────────────────────────────────────────────────────────────────────────────

export const updateUserSchema = Joi.object({
  name:    Joi.string().min(2).max(100),
  email:   Joi.string().email(),
  phone:   Joi.string().allow('', null),
  address: Joi.string().allow('', null),
  role:    Joi.string().valid('admin', 'staff', 'customer'),
}).min(1);

export const emailBroadcastSchema = Joi.object({
  targetRole:  Joi.string().valid('all', 'admin', 'staff', 'customer').allow(null),
  singleEmail: Joi.string().email().allow(null, ''),
  subject:     Joi.string().min(1).max(200).required(),
  body:        Joi.string().min(1).required(),
  attachments: Joi.array().items(
    Joi.object({
      name:   Joi.string().required(),
      type:   Joi.string().required(),
      base64: Joi.string().required(),
      size:   Joi.number(),
    })
  ).max(5).default([]),
}).or('targetRole', 'singleEmail');