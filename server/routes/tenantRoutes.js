// server/routes/tenantRoutes.js
// All store-scoped API routes live under /api/t/:tenantSlug/
// The tenantAuthMiddleware or tenantUserAuthMiddleware connects to the
// correct per-tenant database before any controller runs.

import express from "express";
import bcrypt  from "bcryptjs";
import jwt     from "jsonwebtoken";
import TenantModel from "../models/TenantModel.js";
import { tenantAuthMiddleware, tenantUserAuthMiddleware } from "../middleware/tenantAuthMiddleware.js";
import { sendResponse, sendError } from "../utils/apiResponse.js";
import cloudinary from "../config/cloudinary.js";
import { uploadProductImages } from "../config/multer.js";

const router = express.Router({ mergeParams: true }); // mergeParams lets us read :tenantSlug

// ─────────────────────────────────────────────────────────────────────────────
// AUTH — user login / register within a store
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/t/:tenantSlug/auth/register
router.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password, phone = "", address = "", role = "customer" } = req.body;
    if (!name || !email || !password) return sendError(res, 400, "name, email, password required");

    const { getTenantConnection, getTenantModels } = await import("../db/tenantConnection.js");
    const tenant = await TenantModel.findOne({ slug: req.params.tenantSlug });
    if (!tenant || !tenant.isActive) return sendError(res, 404, "Store not found");

    const conn   = await getTenantConnection(tenant.dbName);
    const models = await getTenantModels(conn);

    const existing = await models.User.findOne({ email: email.toLowerCase() });
    if (existing) return sendError(res, 409, "Email already registered in this store");

    const hash = await bcrypt.hash(password, 10);
    // Only allow customer/wholesale on self-register — not admin/staff
    const assignedRole = ["customer","wholesale"].includes(role) ? role : "customer";
    const user = await models.User.create({
      name, email: email.toLowerCase(), password: hash,
      phone, address, role: assignedRole, profileCompleted: !!(phone && address),
    });

    const token = jwt.sign(
      { id: user._id, role: user.role, tenantSlug: tenant.slug },
      process.env.JWT_SECRET,
      { expiresIn: "2d" }
    );
    return sendResponse(res, 201, {
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, phone, address },
      tenant: { name: tenant.name, slug: tenant.slug },
    }, "Registered successfully");
  } catch (err) {
    console.error("[tenant register]", err.message);
    return sendError(res, 500, "Registration failed");
  }
});

// POST /api/t/:tenantSlug/auth/login
router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const { getTenantConnection, getTenantModels } = await import("../db/tenantConnection.js");
    const tenant = await TenantModel.findOne({ slug: req.params.tenantSlug });
    if (!tenant || !tenant.isActive) return sendError(res, 404, "Store not found");

    const conn   = await getTenantConnection(tenant.dbName);
    const models = await getTenantModels(conn);

    const user = await models.User.findOne({ email: email.toLowerCase() });
    if (!user) return sendError(res, 401, "Invalid credentials");
    if (user.isActive === false) return sendError(res, 403, "Account suspended");

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return sendError(res, 401, "Invalid credentials");

    const token = jwt.sign(
      { id: user._id, role: user.role, tenantSlug: tenant.slug },
      process.env.JWT_SECRET,
      { expiresIn: "2d" }
    );
    return sendResponse(res, 200, {
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role,
        phone: user.phone || "", address: user.address || "" },
      tenant: { name: tenant.name, slug: tenant.slug },
    }, "Login successful");
  } catch (err) {
    return sendError(res, 500, "Login failed");
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTS — public (no auth) + authenticated routes
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/t/:tenantSlug/products/public — no auth, for public shop
router.get("/products/public", async (req, res) => {
  try {
    const { getTenantConnection, getTenantModels } = await import("../db/tenantConnection.js");
    const tenant = await TenantModel.findOne({ slug: req.params.tenantSlug });
    if (!tenant || !tenant.isActive) return sendError(res, 404, "Store not found");

    const conn   = await getTenantConnection(tenant.dbName);
    const models = await getTenantModels(conn);

    const products = await models.Product.find({ isDeleted: false, isStaffOnly: false })
      .populate("categoryId", "name")
      .sort({ isNewArrival: -1, createdAt: -1 })
      .limit(100);

    const sanitized = products.map(p => {
      const obj = p.toObject();
      delete obj.wholesalePrice; delete obj.batchNumber; delete obj.supplierId;
      delete obj.lastExpiryWarningSentAt; delete obj.lastLowStockAlertSentAt;
      if (Array.isArray(obj.variants)) obj.variants = obj.variants.filter(v => v.stock > 0);
      return obj;
    });

    const categories = await models.Category.find().select("name");
    return sendResponse(res, 200, { products: sanitized, categories, tenant: { name: tenant.name, slug: tenant.slug } });
  } catch (err) {
    return sendError(res, 500, "Failed to fetch products");
  }
});

// GET /api/t/:tenantSlug/products — admin/staff only
router.get("/products", tenantAuthMiddleware, async (req, res) => {
  try {
    const products = await req.db.Product.find({ isDeleted: false })
      .populate("categoryId", "name")
      .populate("supplierId", "name")
      .sort({ createdAt: -1 });
    const categories = await req.db.Category.find().select("name");
    const suppliers  = await req.db.Supplier.find().select("name");
    return sendResponse(res, 200, { products, categories, suppliers });
  } catch (err) {
    return sendError(res, 500, "Failed to fetch products");
  }
});

// POST /api/t/:tenantSlug/products/add — admin only
router.post("/products/add", tenantAuthMiddleware, uploadProductImages, async (req, res) => {
  try {
    const { name, description, price, wholesalePrice, stock, categoryId, supplierId, variants } = req.body;
    let imageUrls = [];
    if (req.files?.length) {
      for (const file of req.files) {
        const result = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream({ folder: `tenants/${req.tenant.slug}/products` },
            (err, result) => err ? reject(err) : resolve(result)
          ).end(file.buffer);
        });
        imageUrls.push(result.secure_url);
      }
    }
    const product = await req.db.Product.create({
      name, description,
      price: Number(price),
      wholesalePrice: wholesalePrice ? Number(wholesalePrice) : null,
      stock: Number(stock),
      categoryId: categoryId || null,
      supplierId: supplierId || null,
      images: imageUrls,
      image: imageUrls[0] || null,
      variants: variants ? JSON.parse(variants) : [],
    });
    return sendResponse(res, 201, product, "Product added");
  } catch (err) {
    console.error("[tenant addProduct]", err.message);
    return sendError(res, 500, "Failed to add product");
  }
});

// PUT /api/t/:tenantSlug/products/:id
router.put("/products/:id", tenantAuthMiddleware, uploadProductImages, async (req, res) => {
  try {
    const update = { ...req.body };
    if (update.variants) { try { update.variants = JSON.parse(update.variants); } catch { delete update.variants; } }
    if (req.files?.length) {
      const imageUrls = [];
      for (const file of req.files) {
        const result = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream({ folder: `tenants/${req.tenant.slug}/products` },
            (err, r) => err ? reject(err) : resolve(r)
          ).end(file.buffer);
        });
        imageUrls.push(result.secure_url);
      }
      update.images = imageUrls; update.image = imageUrls[0];
    }
    const product = await req.db.Product.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!product) return sendError(res, 404, "Product not found");
    return sendResponse(res, 200, product, "Product updated");
  } catch (err) {
    return sendError(res, 500, "Failed to update product");
  }
});

// DELETE /api/t/:tenantSlug/products/:id
router.delete("/products/:id", tenantAuthMiddleware, async (req, res) => {
  try {
    await req.db.Product.findByIdAndUpdate(req.params.id, { isDeleted: true });
    return sendResponse(res, 200, null, "Product deleted");
  } catch (err) {
    return sendError(res, 500, "Failed to delete product");
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORIES
// ─────────────────────────────────────────────────────────────────────────────

router.get("/categories", tenantUserAuthMiddleware, async (req, res) => {
  try {
    const cats = await req.db.Category.find().sort({ name: 1 });
    return sendResponse(res, 200, { categories: cats });
  } catch { return sendError(res, 500, "Failed to fetch categories"); }
});

router.post("/categories/add", tenantAuthMiddleware, async (req, res) => {
  try {
    const { categoryName, categoryDescription } = req.body;
    const cat = await req.db.Category.create({ name: categoryName, description: categoryDescription });
    return sendResponse(res, 201, cat, "Category added");
  } catch { return sendError(res, 500, "Failed to add category"); }
});

router.put("/categories/:id", tenantAuthMiddleware, async (req, res) => {
  try {
    const { categoryName, categoryDescription } = req.body;
    const cat = await req.db.Category.findByIdAndUpdate(
      req.params.id, { name: categoryName, description: categoryDescription }, { new: true }
    );
    return sendResponse(res, 200, cat, "Category updated");
  } catch { return sendError(res, 500, "Failed to update category"); }
});

router.delete("/categories/:id", tenantAuthMiddleware, async (req, res) => {
  try {
    await req.db.Category.findByIdAndDelete(req.params.id);
    return sendResponse(res, 200, null, "Category deleted");
  } catch { return sendError(res, 500, "Failed to delete category"); }
});

// ─────────────────────────────────────────────────────────────────────────────
// USERS (admin manages staff/customers within their store)
// ─────────────────────────────────────────────────────────────────────────────

router.get("/users", tenantAuthMiddleware, async (req, res) => {
  try {
    const users = await req.db.User.find().select("-password").sort({ createdAt: -1 });
    return sendResponse(res, 200, { users });
  } catch { return sendError(res, 500, "Failed to fetch users"); }
});

router.patch("/users/:id/status", tenantAuthMiddleware, async (req, res) => {
  try {
    const { isActive } = req.body;
    await req.db.User.findByIdAndUpdate(req.params.id, { isActive: Boolean(isActive) });
    return sendResponse(res, 200, null, isActive ? "User activated" : "User suspended");
  } catch { return sendError(res, 500, "Failed to update user"); }
});

// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS — store owner's settings
// ─────────────────────────────────────────────────────────────────────────────

router.get("/settings", tenantAuthMiddleware, async (req, res) => {
  try {
    let s = await req.db.Settings.findOne({});
    if (!s) s = await req.db.Settings.create({});
    return sendResponse(res, 200, { settings: s });
  } catch { return sendError(res, 500, "Failed to fetch settings"); }
});

router.put("/settings", tenantAuthMiddleware, async (req, res) => {
  try {
    const s = await req.db.Settings.findOneAndUpdate(
      {}, { $set: req.body }, { new: true, upsert: true }
    );
    return sendResponse(res, 200, { settings: s }, "Settings saved");
  } catch { return sendError(res, 500, "Failed to save settings"); }
});

// ─────────────────────────────────────────────────────────────────────────────
// ORDERS — customer cart and placed orders
// ─────────────────────────────────────────────────────────────────────────────

// GET cart (authenticated user)
router.get("/orders", tenantUserAuthMiddleware, async (req, res) => {
  try {
    const orders = await req.db.Order.find({ userOrdering: req.user._id })
      .populate("product", "name price wholesalePrice images image stock");
    return sendResponse(res, 200, { data: orders });
  } catch { return sendError(res, 500, "Failed to fetch cart"); }
});

// PUT add/update item in cart
router.put("/orders/qty/:productId", tenantUserAuthMiddleware, async (req, res) => {
  try {
    const { quantity, price } = req.body;
    if (Number(quantity) <= 0) {
      await req.db.Order.deleteOne({ userOrdering: req.user._id, product: req.params.productId });
      return sendResponse(res, 200, { deleted: true });
    }
    const order = await req.db.Order.findOneAndUpdate(
      { userOrdering: req.user._id, product: req.params.productId },
      { quantity: Number(quantity), price: Number(price) },
      { new: true, upsert: true }
    );
    return sendResponse(res, 200, order);
  } catch { return sendError(res, 500, "Failed to update cart"); }
});

// POST complete order (checkout)
router.post("/orders/complete", tenantUserAuthMiddleware, async (req, res) => {
  try {
    const { paymentMethod, buyerName } = req.body;
    const cartItems = await req.db.Order.find({ userOrdering: req.user._id }).populate("product");
    if (!cartItems.length) return sendError(res, 400, "Cart is empty");

    const productList = cartItems.map(o => ({
      productId:   o.product._id,
      productName: o.product.name,
      quantity:    o.quantity,
      price:       o.price,
      totalPrice:  o.price * o.quantity,
    }));
    const totalPrice  = productList.reduce((s, i) => s + i.totalPrice, 0);
    const allQuantity = productList.reduce((s, i) => s + i.quantity, 0);

    const completed = await req.db.CompletedOrderHistory.create({
      userOrdering: req.user._id,
      buyerName:    buyerName || req.user.name,
      paymentMethod,
      totalPrice, allQuantity,
      productList,
      paid: true,
      deliveryStatus: "processing",
    });

    await req.db.Order.deleteMany({ userOrdering: req.user._id });
    return sendResponse(res, 200, { orderId: completed._id }, "Order placed successfully");
  } catch (err) {
    return sendError(res, 500, "Failed to complete order");
  }
});

// GET order history (customer sees their own, admin sees all)
router.get("/history", tenantUserAuthMiddleware, async (req, res) => {
  try {
    const query = req.user.role === "admin" ? {} : { userOrdering: req.user._id };
    const orders = await req.db.CompletedOrderHistory.find(query)
      .sort({ createdAt: -1 }).limit(100);
    return sendResponse(res, 200, { orders });
  } catch { return sendError(res, 500, "Failed to fetch history"); }
});

// ─────────────────────────────────────────────────────────────────────────────
// STORE DASHBOARD STATS — admin only
// ─────────────────────────────────────────────────────────────────────────────
router.get("/dashboard", tenantAuthMiddleware, async (req, res) => {
  try {
    const [totalProducts, totalUsers, totalOrders, revenueAgg] = await Promise.all([
      req.db.Product.countDocuments({ isDeleted: false }),
      req.db.User.countDocuments(),
      req.db.CompletedOrderHistory.countDocuments(),
      req.db.CompletedOrderHistory.aggregate([
        { $group: { _id: null, total: { $sum: "$totalPrice" } } }
      ]),
    ]);
    const totalRevenue = revenueAgg[0]?.total || 0;
    // Update cached stats on the tenant record
    await TenantModel.findByIdAndUpdate(req.tenant._id, {
      totalProducts, totalUsers, totalOrders, totalRevenue,
    });
    return sendResponse(res, 200, {
      totalProducts, totalUsers, totalOrders, totalRevenue,
      tenant: { name: req.tenant.name, slug: req.tenant.slug, plan: req.tenant.plan },
    });
  } catch { return sendError(res, 500, "Failed to fetch stats"); }
});

export default router;
