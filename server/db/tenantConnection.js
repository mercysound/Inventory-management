// server/db/tenantConnection.js
// Each tenant gets their own MongoDB database on the SAME Atlas cluster.
// We maintain a connection pool — one Mongoose connection per tenant dbName.
// Connections are cached so we don't reconnect on every request.

import mongoose from "mongoose";

// Map of dbName → mongoose.Connection
const connectionCache = new Map();

/**
 * Get (or create) a Mongoose connection for a tenant's database.
 * @param {string} dbName  e.g. "pos_tenant_my-store"
 * @returns {Promise<mongoose.Connection>}
 */
export const getTenantConnection = async (dbName) => {
  if (connectionCache.has(dbName)) {
    const conn = connectionCache.get(dbName);
    // Return cached connection if it's still alive
    if (conn.readyState === 1) return conn;
    // Otherwise fall through and reconnect
    connectionCache.delete(dbName);
  }

  // Build the URI for this tenant's database by replacing the database name
  // in the main MONGO_URI. Atlas URIs end with /dbName?options
  const baseUri = process.env.MONGO_URI;
  if (!baseUri) throw new Error("MONGO_URI not set");

  // Replace the database name segment: everything between last / and ?
  const tenantUri = baseUri.replace(
    /\/[^/?]+(\?|$)/,
    `/${dbName}$1`
  );

  const conn = await mongoose.createConnection(tenantUri, {
    maxPoolSize: 5,          // smaller pool per tenant
    serverSelectionTimeoutMS: 10000,
  }).asPromise();

  connectionCache.set(dbName, conn);
  console.log(`[TenantDB] Connected to database: ${dbName}`);
  return conn;
};

/**
 * Get tenant-scoped models from a connection.
 * We register models lazily on the connection to avoid conflicts.
 */
export const getTenantModels = async (tenantConnection) => {
  const conn = tenantConnection;

  // Import schemas (not models) so we can register on a specific connection
  const { default: UserModel }      = await import("../models/UserModel.js");
  const { default: ProductModel }   = await import("../models/ProductModel.js");
  const { default: CategoryModel }  = await import("../models/CategoryModel.js");
  const { default: SupplierModel }  = await import("../models/SupplierModel.js");
  const { default: OrderModel }     = await import("../models/OrderModel.js");
  const { default: SettingsModel }  = await import("../models/SettingsModel.js");
  const { default: AllOrdersPlacedModel }        = await import("../models/AllOrdersPlacedModel.js");
  const { default: CompletedOrderHistoryModel }  = await import("../models/CompletedOrderHistoryModel.js");
  const { default: FavoriteModel }  = await import("../models/FavoriteModel.js");
  const { default: ReviewModel }    = await import("../models/ReviewModel.js");

  // Helper: get or create a model on this specific connection
  const model = (name, schema) => {
    try { return conn.model(name); }
    catch { return conn.model(name, schema.schema || schema); }
  };

  return {
    User:                    conn.models.User                    || conn.model("User",                    UserModel.schema),
    Product:                 conn.models.Product                 || conn.model("Product",                 ProductModel.schema),
    Category:                conn.models.Category                || conn.model("Category",                CategoryModel.schema),
    Supplier:                conn.models.Supplier                || conn.model("Supplier",                SupplierModel.schema),
    Order:                   conn.models.Order                   || conn.model("Order",                   OrderModel.schema),
    Settings:                conn.models.Settings                || conn.model("Settings",                SettingsModel.schema),
    AllOrdersPlaced:         conn.models.AllOrdersPlaced         || conn.model("AllOrdersPlaced",         AllOrdersPlacedModel.schema),
    CompletedOrderHistory:   conn.models.CompletedOrderHistory   || conn.model("CompletedOrderHistory",   CompletedOrderHistoryModel.schema),
    Favorite:                conn.models.Favorite                || conn.model("Favorite",                FavoriteModel.schema),
    Review:                  conn.models.Review                  || conn.model("Review",                  ReviewModel.schema),
  };
};

/**
 * Close all tenant connections (called on server shutdown).
 */
export const closeAllTenantConnections = async () => {
  for (const [dbName, conn] of connectionCache.entries()) {
    await conn.close();
    console.log(`[TenantDB] Closed connection: ${dbName}`);
  }
  connectionCache.clear();
};
