// server/models/TenantModel.js
// A Tenant = one store on the platform.
// Every store has its own slug (URL-safe name), owner, plan, and branding.
import mongoose from "mongoose";

const tenantSchema = new mongoose.Schema(
  {
    // ── Identity ──────────────────────────────────────────────────────────
    name:  { type: String, required: true, trim: true },   // "My Electronics Store"
    slug:  {                                                // URL key: /shop/my-electronics
      type: String, required: true, unique: true,
      trim: true, lowercase: true,
      match: [/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"],
    },
    description: { type: String, default: "", trim: true, maxlength: 500 },
    logoUrl:     { type: String, default: null },

    // ── Owner (the store's admin user) ────────────────────────────────────
    ownerName:  { type: String, required: true, trim: true },
    ownerEmail: { type: String, required: true, trim: true, lowercase: true },
    ownerPasswordHash: { type: String, required: true }, // bcrypt hash

    // ── Plan / billing ────────────────────────────────────────────────────
    // plan: "free" | "trial" | "basic" | "pro" | "custom"
    plan: {
      type:    String,
      enum:    ["free", "trial", "basic", "pro", "custom"],
      default: "trial",
    },
    // planPrice: monthly fee in Naira (0 = free, null = custom arrangement)
    planPrice:     { type: Number, default: 0, min: 0 },
    planNote:      { type: String, default: "", trim: true }, // super-admin notes
    trialEndsAt:   { type: Date, default: null },    // null = no trial limit
    planExpiresAt: { type: Date, default: null },    // null = no expiry (free/manual)
    isActive:      { type: Boolean, default: true }, // super-admin can suspend a store

    // ── Separate MongoDB database for this tenant ─────────────────────────
    // Each tenant gets their own database in the same Atlas cluster.
    // e.g. "pos_tenant_my-electronics"
    dbName: { type: String, required: true },

    // ── Contact / settings ────────────────────────────────────────────────
    contactEmail:   { type: String, default: "", trim: true },
    contactPhone:   { type: String, default: "", trim: true },
    storeCurrency:  { type: String, default: "NGN" },
    storeCountry:   { type: String, default: "Nigeria" },

    // ── Stats (cached, updated periodically) ─────────────────────────────
    totalOrders:   { type: Number, default: 0 },
    totalRevenue:  { type: Number, default: 0 },
    totalProducts: { type: Number, default: 0 },
    totalUsers:    { type: Number, default: 0 },

    // ── Meta ─────────────────────────────────────────────────────────────
    createdBy: { type: String, default: "super-admin" }, // "super-admin" or "self-signup"
    notes:     { type: String, default: "" },
  },
  { timestamps: true }
);

// Index for fast slug lookup
tenantSchema.index({ slug: 1 });
tenantSchema.index({ ownerEmail: 1 });
tenantSchema.index({ isActive: 1 });

// Virtual: is this tenant's plan still valid?
tenantSchema.virtual("isPlanValid").get(function () {
  if (!this.isActive) return false;
  if (this.plan === "free") return true;
  if (this.plan === "trial" && this.trialEndsAt) {
    return new Date() < new Date(this.trialEndsAt);
  }
  if (this.planExpiresAt) {
    return new Date() < new Date(this.planExpiresAt);
  }
  return true; // no expiry set = valid
});

const TenantModel = mongoose.model("Tenant", tenantSchema);
export default TenantModel;
