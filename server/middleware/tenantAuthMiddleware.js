// server/middleware/tenantAuthMiddleware.js
// Verifies a store owner's JWT and attaches their tenant + db models to req.
// Used on all /api/t/:tenantSlug/* routes that require the store owner to be logged in.
import jwt from "jsonwebtoken";
import TenantModel from "../models/TenantModel.js";
import { getTenantConnection, getTenantModels } from "../db/tenantConnection.js";
import { sendError } from "../utils/apiResponse.js";

export const tenantAuthMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return sendError(res, 401, "No token provided");

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Token must be a tenant-admin token (issued by tenantOwnerLogin)
    if (!decoded.tenantSlug) return sendError(res, 403, "Not a store token");

    const slug = req.params.tenantSlug || decoded.tenantSlug;

    // Verify slug matches the token
    if (slug !== decoded.tenantSlug) return sendError(res, 403, "Token does not match store");

    // Load tenant
    const tenant = await TenantModel.findOne({ slug });
    if (!tenant)          return sendError(res, 404, "Store not found");
    if (!tenant.isActive) return sendError(res, 403, "Store is suspended");
    if (!tenant.isPlanValid) return sendError(res, 402, "Store plan has expired. Please renew.");

    // Attach tenant db
    const connection = await getTenantConnection(tenant.dbName);
    const models     = await getTenantModels(connection);

    req.tenant   = tenant;
    req.tenantDb = connection;
    req.db       = models;
    req.tenantUser = { role: "admin", tenantId: tenant._id }; // store owner is admin of their store

    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") return sendError(res, 401, "Token expired");
    if (err.name === "JsonWebTokenError")  return sendError(res, 401, "Invalid token");
    console.error("[TenantAuth]", err.message);
    return sendError(res, 500, "Authentication failed");
  }
};

// Middleware that also validates regular users (customers/staff) within a tenant.
// Their JWT contains { id, role, tenantSlug } — issued when they login to /shop/:slug.
export const tenantUserAuthMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return sendError(res, 401, "No token provided");

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const slug = req.params.tenantSlug || decoded.tenantSlug;

    if (!slug) return sendError(res, 400, "Tenant slug missing");

    const tenant = await TenantModel.findOne({ slug });
    if (!tenant)          return sendError(res, 404, "Store not found");
    if (!tenant.isActive) return sendError(res, 403, "Store is suspended");

    const connection = await getTenantConnection(tenant.dbName);
    const models     = await getTenantModels(connection);

    // Load user from this tenant's database
    const user = await models.User.findById(decoded.id).select("-password");
    if (!user) return sendError(res, 401, "User not found in this store");

    req.tenant   = tenant;
    req.tenantDb = connection;
    req.db       = models;
    req.user     = user; // same req.user pattern as existing controllers

    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") return sendError(res, 401, "Token expired");
    if (err.name === "JsonWebTokenError")  return sendError(res, 401, "Invalid token");
    return sendError(res, 500, "Authentication failed");
  }
};
