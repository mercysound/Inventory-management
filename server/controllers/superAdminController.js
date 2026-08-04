// server/controllers/superAdminController.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import TenantModel from "../models/TenantModel.js";
import SuperAdminModel from "../models/SuperAdminModel.js";
import { sendResponse, sendError } from "../utils/apiResponse.js";
import { getTenantConnection } from "../db/tenantConnection.js";

const SUPER_JWT_SECRET = process.env.SUPER_ADMIN_JWT_SECRET || process.env.JWT_SECRET;

// ── Super Admin Login ─────────────────────────────────────────────────────────
export const superAdminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return sendError(res, 400, "Email and password required");

    const admin = await SuperAdminModel.findOne({ email: email.toLowerCase().trim() });
    if (!admin) return sendError(res, 401, "Invalid credentials");

    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) return sendError(res, 401, "Invalid credentials");

    admin.lastLogin = new Date();
    await admin.save();

    const token = jwt.sign(
      { id: admin._id, isSuperAdmin: true },
      SUPER_JWT_SECRET,
      { expiresIn: "1d" }
    );

    return sendResponse(res, 200, {
      token,
      admin: { id: admin._id, name: admin.name, email: admin.email },
    }, "Super admin logged in");
  } catch (err) {
    console.error("superAdminLogin error:", err.message);
    return sendError(res, 500, "Login failed");
  }
};

// ── Initialize super admin (run once on first deploy) ────────────────────────
export const initSuperAdmin = async (req, res) => {
  try {
    const existing = await SuperAdminModel.countDocuments();
    if (existing > 0) return sendError(res, 400, "Super admin already initialized");

    const secret = req.body.initSecret;
    if (secret !== process.env.SUPER_ADMIN_INIT_SECRET) {
      return sendError(res, 403, "Invalid init secret");
    }

    const { name, email, password } = req.body;
    const hash = await bcrypt.hash(password, 12);
    const admin = await SuperAdminModel.create({ name, email: email.toLowerCase(), password: hash });

    return sendResponse(res, 201, { id: admin._id, name: admin.name, email: admin.email }, "Super admin created");
  } catch (err) {
    return sendError(res, 500, "Failed to initialize super admin");
  }
};

// ── Get all tenants ───────────────────────────────────────────────────────────
export const getAllTenants = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = "", plan = "", active } = req.query;
    const query = {};
    if (search) {
      query.$or = [
        { name:       { $regex: search, $options: "i" } },
        { slug:       { $regex: search, $options: "i" } },
        { ownerEmail: { $regex: search, $options: "i" } },
      ];
    }
    if (plan)   query.plan = plan;
    if (active !== undefined) query.isActive = active === "true";

    const total   = await TenantModel.countDocuments(query);
    const tenants = await TenantModel.find(query)
      .select("-ownerPasswordHash")
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    return sendResponse(res, 200, {
      tenants,
      total,
      page:  Number(page),
      pages: Math.ceil(total / Number(limit)),
    }, "Tenants retrieved");
  } catch (err) {
    return sendError(res, 500, "Failed to fetch tenants");
  }
};

// ── Get single tenant ─────────────────────────────────────────────────────────
export const getTenant = async (req, res) => {
  try {
    const tenant = await TenantModel.findById(req.params.id).select("-ownerPasswordHash");
    if (!tenant) return sendError(res, 404, "Tenant not found");
    return sendResponse(res, 200, { tenant }, "Tenant retrieved");
  } catch (err) {
    return sendError(res, 500, "Failed to fetch tenant");
  }
};

// ── Create a new tenant (store) ───────────────────────────────────────────────
export const createTenant = async (req, res) => {
  try {
    const {
      name, slug, description = "",
      ownerName, ownerEmail, ownerPassword,
      plan = "trial", planPrice = 0, planNote = "",
      trialDays = 14,
    } = req.body;

    if (!name || !slug || !ownerName || !ownerEmail || !ownerPassword) {
      return sendError(res, 400, "name, slug, ownerName, ownerEmail, ownerPassword are required");
    }

    // Validate slug
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return sendError(res, 400, "Slug must be lowercase letters, numbers, and hyphens only");
    }

    // Check uniqueness
    const exists = await TenantModel.findOne({ $or: [{ slug }, { ownerEmail: ownerEmail.toLowerCase() }] });
    if (exists) {
      return sendError(res, 409, exists.slug === slug ? "Slug already taken" : "Owner email already registered");
    }

    const hash   = await bcrypt.hash(ownerPassword, 12);
    const dbName = `pos_tenant_${slug}`;

    const trialEndsAt = plan === "trial"
      ? new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000)
      : null;

    const tenant = await TenantModel.create({
      name, slug, description,
      ownerName, ownerEmail: ownerEmail.toLowerCase(),
      ownerPasswordHash: hash,
      plan, planPrice, planNote, trialEndsAt, dbName,
      createdBy: "super-admin",
    });

    // Pre-create the tenant database connection to verify it works
    await getTenantConnection(dbName);

    return sendResponse(res, 201, {
      tenant: { ...tenant.toObject(), ownerPasswordHash: undefined },
    }, "Store created successfully");
  } catch (err) {
    console.error("createTenant error:", err.message);
    return sendError(res, 500, "Failed to create store");
  }
};

// ── Update tenant plan / status ───────────────────────────────────────────────
export const updateTenant = async (req, res) => {
  try {
    const {
      name, description, plan, planPrice, planNote,
      trialEndsAt, planExpiresAt, isActive, notes,
      ownerName,
    } = req.body;

    const update = {};
    if (name        !== undefined) update.name        = name;
    if (description !== undefined) update.description = description;
    if (plan        !== undefined) update.plan        = plan;
    if (planPrice   !== undefined) update.planPrice   = Number(planPrice);
    if (planNote    !== undefined) update.planNote    = planNote;
    if (trialEndsAt !== undefined) update.trialEndsAt = trialEndsAt ? new Date(trialEndsAt)  : null;
    if (planExpiresAt !== undefined) update.planExpiresAt = planExpiresAt ? new Date(planExpiresAt) : null;
    if (isActive    !== undefined) update.isActive    = Boolean(isActive);
    if (notes       !== undefined) update.notes       = notes;
    if (ownerName   !== undefined) update.ownerName   = ownerName;

    const tenant = await TenantModel.findByIdAndUpdate(
      req.params.id, { $set: update }, { new: true }
    ).select("-ownerPasswordHash");

    if (!tenant) return sendError(res, 404, "Tenant not found");
    return sendResponse(res, 200, { tenant }, "Tenant updated");
  } catch (err) {
    return sendError(res, 500, "Failed to update tenant");
  }
};

// ── Suspend / activate tenant ─────────────────────────────────────────────────
export const toggleTenantStatus = async (req, res) => {
  try {
    const tenant = await TenantModel.findById(req.params.id);
    if (!tenant) return sendError(res, 404, "Tenant not found");
    tenant.isActive = !tenant.isActive;
    await tenant.save();
    return sendResponse(res, 200, {
      isActive: tenant.isActive, slug: tenant.slug,
    }, tenant.isActive ? "Store activated" : "Store suspended");
  } catch (err) {
    return sendError(res, 500, "Failed to update status");
  }
};

// ── Reset tenant owner password ───────────────────────────────────────────────
export const resetTenantOwnerPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) return sendError(res, 400, "Password must be at least 8 characters");
    const hash = await bcrypt.hash(newPassword, 12);
    await TenantModel.findByIdAndUpdate(req.params.id, { ownerPasswordHash: hash });
    return sendResponse(res, 200, null, "Owner password reset");
  } catch (err) {
    return sendError(res, 500, "Failed to reset password");
  }
};

// ── Delete tenant (permanent — use with extreme caution) ─────────────────────
export const deleteTenant = async (req, res) => {
  try {
    const { confirm } = req.body;
    if (confirm !== "DELETE_PERMANENTLY") {
      return sendError(res, 400, 'Send { confirm: "DELETE_PERMANENTLY" } to confirm');
    }
    const tenant = await TenantModel.findByIdAndDelete(req.params.id);
    if (!tenant) return sendError(res, 404, "Tenant not found");
    return sendResponse(res, 200, null, `Store "${tenant.name}" permanently deleted`);
  } catch (err) {
    return sendError(res, 500, "Failed to delete tenant");
  }
};

// ── Platform-wide stats ───────────────────────────────────────────────────────
export const getPlatformStats = async (req, res) => {
  try {
    const [total, active, suspended, byPlan] = await Promise.all([
      TenantModel.countDocuments(),
      TenantModel.countDocuments({ isActive: true }),
      TenantModel.countDocuments({ isActive: false }),
      TenantModel.aggregate([
        { $group: { _id: "$plan", count: { $sum: 1 } } },
      ]),
    ]);

    const planBreakdown = {};
    byPlan.forEach(p => { planBreakdown[p._id] = p.count; });

    return sendResponse(res, 200, {
      totalStores: total,
      activeStores: active,
      suspendedStores: suspended,
      planBreakdown,
    }, "Platform stats retrieved");
  } catch (err) {
    return sendError(res, 500, "Failed to fetch platform stats");
  }
};

// ── Tenant login (store owner logs in) ───────────────────────────────────────
// This is NOT the super admin login — this is the store owner logging into
// their own dashboard at /store/:slug/dashboard.
export const tenantOwnerLogin = async (req, res) => {
  try {
    const { slug } = req.params;
    const { email, password } = req.body;

    const tenant = await TenantModel.findOne({ slug: slug.toLowerCase() });
    if (!tenant)   return sendError(res, 404, "Store not found");
    if (!tenant.isActive) return sendError(res, 403, "Store is suspended");
    if (!tenant.isPlanValid) return sendError(res, 402, "Store plan expired");

    // Check owner credentials
    if (email.toLowerCase() !== tenant.ownerEmail) {
      return sendError(res, 401, "Invalid credentials");
    }
    const valid = await bcrypt.compare(password, tenant.ownerPasswordHash);
    if (!valid) return sendError(res, 401, "Invalid credentials");

    // Issue a tenant-scoped JWT
    const token = jwt.sign(
      {
        tenantId:   tenant._id,
        tenantSlug: tenant.slug,
        dbName:     tenant.dbName,
        role:       "tenant-admin",
      },
      process.env.JWT_SECRET,
      { expiresIn: "2d" }
    );

    return sendResponse(res, 200, {
      token,
      tenant: {
        id:          tenant._id,
        name:        tenant.name,
        slug:        tenant.slug,
        ownerName:   tenant.ownerName,
        ownerEmail:  tenant.ownerEmail,
        plan:        tenant.plan,
        trialEndsAt: tenant.trialEndsAt,
        planExpiresAt: tenant.planExpiresAt,
      },
    }, "Store owner logged in");
  } catch (err) {
    console.error("tenantOwnerLogin error:", err.message);
    return sendError(res, 500, "Login failed");
  }
};
