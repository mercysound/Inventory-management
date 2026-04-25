// frontend/src/schemas/validationSchemas.js
import * as yup from "yup";

// User validation schemas
export const loginSchema = yup.object({
  email: yup
    .string()
    .email("Please enter a valid email")
    .required("Email is required"),
  password: yup
    .string()
    .required("Password is required"),
});

export const registerSchema = yup.object({
  name: yup
    .string()
    .required("Name is required")
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be less than 50 characters"),
  email: yup
    .string()
    .email("Please enter a valid email")
    .required("Email is required"),
  password: yup
    .string()
    .required("Password is required")
    .min(6, "Password must be at least 6 characters"),
  phone: yup
    .string()
    .matches(/^[\+]?[1-9][\d]{0,15}$/, "Please enter a valid phone number")
    .optional(),
  address: yup
    .string()
    .max(500, "Address must be less than 500 characters")
    .optional(),
});

// Category validation schemas
export const categorySchema = yup.object({
  categoryName: yup
    .string()
    .required("Category name is required")
    .min(2, "Category name must be at least 2 characters")
    .max(50, "Category name must be less than 50 characters"),
  categoryDescription: yup
    .string()
    .required("Description is required")
    .max(500, "Description must be less than 500 characters"),
});

// Product validation schemas
export const productSchema = yup.object({
  name: yup
    .string()
    .required("Product name is required")
    .min(2, "Product name must be at least 2 characters")
    .max(100, "Product name must be less than 100 characters"),
  description: yup
    .string()
    .required("Description is required")
    .max(1000, "Description must be less than 1000 characters"),
  price: yup
    .number()
    .required("Price is required")
    .positive("Price must be positive")
    .max(999999.99, "Price is too high"),
  stock: yup
    .number()
    .required("Stock quantity is required")
    .integer("Stock must be a whole number")
    .min(0, "Stock cannot be negative"),
  categoryId: yup
    .string()
    .required("Category is required"),
  supplierId: yup
    .string()
    .required("Supplier is required"),
});

// Supplier validation schemas
export const supplierSchema = yup.object({
  name: yup
    .string()
    .required("Supplier name is required")
    .min(2, "Supplier name must be at least 2 characters")
    .max(100, "Supplier name must be less than 100 characters"),
  email: yup
    .string()
    .email("Please enter a valid email")
    .required("Email is required"),
  phone: yup
    .string()
    .matches(/^[\+]?[1-9][\d]{0,15}$/, "Please enter a valid phone number")
    .required("Phone number is required"),
  address: yup
    .string()
    .required("Address is required")
    .max(500, "Address must be less than 500 characters"),
  contactPerson: yup
    .string()
    .max(100, "Contact person name must be less than 100 characters")
    .optional(),
});

// Order validation schemas
export const orderSchema = yup.object({
  customerId: yup
    .string()
    .required("Customer is required"),
  items: yup
    .array()
    .of(
      yup.object({
        productId: yup.string().required("Product is required"),
        quantity: yup
          .number()
          .required("Quantity is required")
          .integer("Quantity must be a whole number")
          .min(1, "Quantity must be at least 1"),
      })
    )
    .min(1, "At least one item is required"),
  shippingAddress: yup
    .string()
    .required("Shipping address is required")
    .max(500, "Address must be less than 500 characters"),
  paymentMethod: yup
    .string()
    .oneOf(["card", "bank_transfer", "cash_on_delivery"], "Invalid payment method")
    .required("Payment method is required"),
});

// Profile update schema
export const profileSchema = yup.object({
  name: yup
    .string()
    .required("Name is required")
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be less than 50 characters"),
  email: yup
    .string()
    .email("Please enter a valid email")
    .required("Email is required"),
  phone: yup
    .string()
    .matches(/^[\+]?[1-9][\d]{0,15}$/, "Please enter a valid phone number")
    .optional(),
  address: yup
    .string()
    .max(500, "Address must be less than 500 characters")
    .optional(),
});