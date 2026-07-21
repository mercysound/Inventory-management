// server/validators/schemas.js
import Joi from "joi";

const VALID_ROLES = ["admin", "staff", "customer", "wholesale"];

// ─── User schemas ─────────────────────────────────────────────────────────────
// Public registration — role field is STRIPPED (not allowed from public)
// The controller always assigns "customer" on public register.
export const userSchema = Joi.object({
  name:     Joi.string().required().trim().min(3).max(80),
  email:    Joi.string().email().required().lowercase().trim(),
  password: Joi.string().min(8).required(),
  phone:    Joi.string().required().trim().min(10).max(20),
  address:  Joi.string().required().trim().min(10).max(500),
  // role is intentionally excluded — public users cannot self-assign roles
});

// Admin-only user creation schema — allows role assignment
export const adminCreateUserSchema = Joi.object({
  name:     Joi.string().required().trim().min(3).max(80),
  email:    Joi.string().email().required().lowercase().trim(),
  password: Joi.string().min(8).required(),
  phone:    Joi.string().required().trim().min(10).max(20),
  address:  Joi.string().required().trim().min(10).max(500),
  role:     Joi.string().valid(...VALID_ROLES).default("customer"),
});

export const loginSchema = Joi.object({
  email:    Joi.string().email().required(),
  password: Joi.string().required(),
});

export const authSchema = Joi.object({
  email:    Joi.string().email().required(),
  password: Joi.string().required(),
});

// ─── Category schemas ─────────────────────────────────────────────────────────
export const categorySchema = Joi.object({
  categoryName:        Joi.string().required().trim().min(2).max(50),
  categoryDescription: Joi.string().required().trim().max(500),
});

// ─── Product schemas ──────────────────────────────────────────────────────────
export const productSchema = Joi.object({
  name:           Joi.string().required().trim().min(2).max(100),
  description:    Joi.string().required().trim().max(1000),
  price: Joi.alternatives().try(
    Joi.number().positive().precision(2),
    Joi.string().pattern(/^\d+(\.\d{1,2})?$/)
  ).required(),
  wholesalePrice: Joi.alternatives().try(
    Joi.number().positive().precision(2),
    Joi.string().pattern(/^\d+(\.\d{1,2})?$/)
  ).allow("", null).optional(),
  stock: Joi.alternatives().try(
    Joi.number().integer().min(0),
    Joi.string().pattern(/^\d+$/)
  ).required(),
  categoryId:   Joi.string().required().hex().length(24),
  supplierId:   Joi.string().hex().length(24).allow("", null).optional(),
  images:       Joi.array().items(Joi.string().uri()).max(10).optional(),
  image:        Joi.string().allow(null, "").optional(),
  removeImage:  Joi.string().allow("true", "false").optional(),
  keepImages:   Joi.string().allow("", null).optional(),
  // Optional product metadata
  expiryDate:   Joi.date().iso().allow(null, "").optional(),
  batchNumber:  Joi.string().trim().max(100).allow("", null).optional(),
  // Variants — JSON-stringified array sent via multipart form
  variants:     Joi.string().allow("", null).optional(),
});

export const productUpdateSchema = productSchema.fork([
  "name", "description", "price", "wholesalePrice",
  "stock", "categoryId", "supplierId", "images", "image", "removeImage",
], (field) => field.optional());

// ─── Supplier schemas ─────────────────────────────────────────────────────────
export const supplierSchema = Joi.object({
  name:          Joi.string().required().trim().min(1).max(100),
  email:         Joi.string().allow("", null).optional(),
  phone:         Joi.string().allow("", null).optional(),
  address:       Joi.string().allow("", null).optional(),
  contactPerson: Joi.string().allow("", null).optional(),
  notes:         Joi.string().allow("", null).optional(),
});

export const supplierUpdateSchema = supplierSchema.fork(
  ["name"], (field) => field.optional()
);

// ─── Order schemas ────────────────────────────────────────────────────────────
export const orderSchema = Joi.object({
  items: Joi.array().items(
    Joi.object({
      productId: Joi.string().required().hex().length(24),
      quantity:  Joi.number().required().integer().min(1),
      price:     Joi.number().required().positive().precision(2),
    })
  ).min(1).required(),
  customerId:      Joi.string().required().hex().length(24),
  totalAmount:     Joi.number().required().positive().precision(2),
  status:          Joi.string().valid("pending", "processing", "shipped", "delivered", "cancelled").default("pending"),
  shippingAddress: Joi.string().required().trim().max(500),
  paymentMethod:   Joi.string().valid("card", "bank_transfer", "cash_on_delivery").required(),
});

export const createOrderSchema = Joi.object({
  productId:   Joi.string().required().hex().length(24),
  quantity:    Joi.number().required().integer().min(1),
  price:       Joi.number().required().positive(),
  total:       Joi.number().positive().optional(),
  isWholesale: Joi.boolean().optional(),
});

export const completeOrderSchema = Joi.object({
  paymentMethod:         Joi.string().valid("cash", "card", "bank_transfer", "cash_on_delivery", "Paystack").required(),
  buyerName:             Joi.string().trim().max(100).optional(),
  paystackReference:     Joi.string().optional(),
  isWholesale:           Joi.boolean().optional(),
  // Fulfillment preference — delivery or pickup
  fulfillmentType:       Joi.string().valid("pickup", "delivery").optional(),
  deliveryAddress:       Joi.string().trim().max(500).allow("", null).optional(),
  deliveryRecipientName: Joi.string().trim().max(100).allow("", null).optional(),
  deliveryPhone:         Joi.string().trim().max(30).allow("", null).optional(),
});

export const updateOrderSchema = Joi.object({
  quantity:    Joi.number().integer().min(1).optional(),
  total:       Joi.number().positive().optional(),
  price:       Joi.number().positive().optional(),
  isWholesale: Joi.boolean().optional(),
});

export const deliveryStatusSchema = Joi.object({
  deliveryStatus: Joi.string()
    .valid("pending", "processing", "delivered", "cancelled")
    .required(),
});

// ─── Auth / password schemas ──────────────────────────────────────────────────
export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});

export const resetPasswordSchema = Joi.object({
  token:    Joi.string().required(),
  password: Joi.string().min(6).required(),
});

export const validateResetTokenSchema = Joi.object({
  token: Joi.string().required(),
});

export const googleLoginSchema = Joi.object({
  tokenId: Joi.string().required(),
});

// ─── Profile schemas ──────────────────────────────────────────────────────────
export const completeProfileSchema = Joi.object({
  phone:   Joi.string().pattern(/^[\+]?[0-9][\d]{0,15}$/).required(),
  address: Joi.string().trim().max(500).optional(),
});

export const paginationSchema = Joi.object({
  page:  Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sort:  Joi.string().optional(),
  order: Joi.string().valid("asc", "desc").default("desc"),
});

// ─── User update schemas ──────────────────────────────────────────────────────
// Admin editing any user — includes optional password reset
export const updateUserSchema = Joi.object({
  name:        Joi.string().min(2).max(100),
  email:       Joi.string().email(),
  phone:       Joi.string().allow("", null),
  address:     Joi.string().allow("", null),
  role:        Joi.string().valid(...VALID_ROLES),
  newPassword: Joi.string().min(6).allow("", null).optional(),
}).min(1);

export const userUpdateSchema = Joi.object({
  name:            Joi.string().min(3).max(80).optional(),
  email:           Joi.string().email().optional(),
  password:        Joi.string().min(8).optional(),
  phone:           Joi.string().min(10).max(20).allow("", null).optional(),
  address:         Joi.string().min(10).max(500).allow("", null).optional(),
  oldPassword:     Joi.string().optional(),
  confirmPassword: Joi.string().optional(),
}).min(1);

// ─── Email broadcast schema — wholesale role included ─────────────────────────
export const emailBroadcastSchema = Joi.object({
  targetRole:  Joi.string().valid("all", ...VALID_ROLES).allow(null),
  singleEmail: Joi.string().email().allow(null, ""),
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
}).or("targetRole", "singleEmail");

// ─── Settings schemas ─────────────────────────────────────────────────────────
export const updateSettingsSchema = Joi.object({
  orderExpiryHours:       Joi.number().integer().min(1).max(720).optional(),
  reminderMode:           Joi.string().valid("once", "repeat").optional(),
  reminderIntervalHours:  Joi.number().integer().min(1).max(168).optional(),
  storeName:              Joi.string().trim().max(100).optional(),
  adminNotificationEmail: Joi.string().email().allow("", null).optional(),
  guestBrowsingEnabled:   Joi.boolean().optional(),
  maintenanceMode:        Joi.boolean().optional(),
  maintenanceModeMessage: Joi.string().trim().max(500).allow("", null).optional(),
}).min(1);

// ─── Product form draft schema ────────────────────────────────────────────────
// Validates the draft payload saved from the add product form.
// All fields are optional — admin may have only partially filled the form.
export const saveProductDraftSchema = Joi.object({
  draft: Joi.object({
    name:           Joi.string().allow("", null).optional(),
    description:    Joi.string().allow("", null).optional(),
    price:          Joi.alternatives().try(
      Joi.number().min(0),
      Joi.string().pattern(/^\d*(\.\d{0,2})?$/)
    ).allow("", null).optional(),
    wholesalePrice: Joi.alternatives().try(
      Joi.number().min(0),
      Joi.string().pattern(/^\d*(\.\d{0,2})?$/)
    ).allow("", null).optional(),
    stock:          Joi.alternatives().try(
      Joi.number().integer().min(0),
      Joi.string().pattern(/^\d*$/)
    ).allow("", null).optional(),
    categoryId:     Joi.string().allow("", null).optional(),
    supplierId:     Joi.string().allow("", null).optional(),
    _imageName:     Joi.string().allow("", null).optional(),
  }).required(),
});
