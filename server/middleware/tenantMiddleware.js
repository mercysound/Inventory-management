// server/middleware/tenantMiddleware.js
// Reads the tenant slug from the URL (/api/t/:slug/...) and attaches
// the tenant connection + models to req.tenant and req.tenantModels.
// All tenant-scoped routes go through this middleware.

import TenantModel from "../models/TenantModel.js";
import { getTenantConnection, getTenantModels } from "../db/tenantConnection.js";
import { sendError } from "../utils/apiResponse.js";

export const tenantMiddleware = async (req, res, next) => {
  try {
    const slug = req.params.tenantSlug || req.headers["x-tenant-slug"];
    if (!slug) return sendError(res, 400, "Tenant slug is required");

    // Look up the tenant in the MAIN database
    const tenant = await TenantModel.findOne({ slug: slug.toLowerCase().trim() });
    if (!tenant) return sendError(res, 404, `Store "${slug}" not found`);

    // Check if the store is active
    if (!tenant.isActive) {
      return sendError(res, 403, "This store has been suspended. Please contact platform support.");
    }

    // Check plan validity
    if (!tenant.isPlanValid) {
      return sendError(res, 402, "This store's plan has expired. Please contact the store owner.");
    }

    // Get or create the database connection for this tenant
    const connection = await getTenantConnection(tenant.dbName);
    const models     = await getTenantModels(connection);

    // Attach to request so controllers can use req.tenant and req.db.*
    req.tenant       = tenant;
    req.tenantDb     = connection;
    req.db           = models;

    next();
  } catch (err) {
    console.error("[TenantMiddleware] Error:", err.message);
    return sendError(res, 500, "Failed to connect to store");
  }
};

/**
 * Super admin JWT middleware — verifies the platform-level super admin token.
 * Used on /api/super-admin/* routes.
 */
import jwt from "jsonwebtoken";
import SuperAdminModel from "../models/SuperAdminModel.js";

export const superAdminMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return sendError(res, 401, "No super-admin token provided");

    const decoded = jwt.verify(token, process.env.SUPER_ADMIN_JWT_SECRET || process.env.JWT_SECRET);
    if (!decoded.isSuperAdmin) return sendError(res, 403, "Not a super admin");

    const admin = await SuperAdminModel.findById(decoded.id).select("-password");
    if (!admin) return sendError(res, 401, "Super admin not found");

    req.superAdmin = admin;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") return sendError(res, 401, "Token expired");
    return sendError(res, 401, "Invalid super-admin token");
  }
};
