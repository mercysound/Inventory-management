// server/models/SettingsModel.js
import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    // One document per admin user — keyed by userId
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  "User",
      required: true,
      unique: true,
    },

    // ── Order expiry settings ─────────────────────────────────────────────
    orderExpiryHours: { type: Number, default: 48 },

    // "once"   — send one email when order first crosses threshold
    // "repeat" — send reminder every `reminderIntervalHours` hours
    reminderMode: {
      type:    String,
      enum:    ["once", "repeat"],
      default: "repeat",
    },

    // Master switch — when false the cron sends NO expiry emails at all
    expiryReminderEnabled: { type: Boolean, default: true },

    reminderIntervalHours:  { type: Number, default: 6 },
    storeName:              { type: String, default: "Melech Store" },
    adminNotificationEmail: { type: String, default: "" },

    // ── Product form draft ────────────────────────────────────────────────
    // Saved per admin user so it follows them across devices.
    // Cleared when the admin successfully adds a product.
    productFormDraft: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    // When the draft was last saved — useful for showing "last saved X minutes ago"
    productFormDraftSavedAt: {
      type:    Date,
      default: null,
    },

    // ── Staff Order Management Delegation ─────────────────────────────────
    delegateToAllStaff: { type: Boolean, default: false },
    delegatedStaffIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // ── Staff Wholesale Pricing Access ────────────────────────────────────
    // When true every staff member can use wholesale pricing on walk-in sales.
    // When false only explicitly listed staff IDs have access.
    wholesaleAllStaff:  { type: Boolean, default: false },
    wholesaleStaffIds:  [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // ── Inventory alert thresholds ────────────────────────────────────────
    lowStockThreshold:             { type: Number, default: 10, min: 1 },
    productExpiryWarningWeeks:     { type: Number, default: 3,  min: 1 },
    // Master switch — when false the daily product expiry digest email is NOT sent
    productExpiryEmailEnabled:     { type: Boolean, default: true },

    // ── Bank / Payment account details (shown on staff preview invoices) ─────
    // Up to two accounts so admin can list e.g. GTB + Opay
    bankName:       { type: String, default: "" },
    accountName:    { type: String, default: "" },
    accountNumber:  { type: String, default: "" },
    bankName2:      { type: String, default: "" },
    accountName2:   { type: String, default: "" },
    accountNumber2: { type: String, default: "" },

    // ── Store contact info (shown publicly on the landing page) ─────────────
    contactEmail:    { type: String, default: "" },
    contactPhone:    { type: String, default: "" },
    contactWhatsapp: { type: String, default: "" },
    contactAddress:  { type: String, default: "" },

    // ── Appearance ────────────────────────────────────────────────────────
    // globalTheme: the admin-chosen brand palette applied to all users.
    // Valid values: default | ocean | forest | royal | sunset
    globalTheme: {
      type:    String,
      enum:    ["default", "ocean", "forest", "royal", "sunset"],
      default: "default",
    },
    // ─────────────────────────────────────────────────────────────────────
  },
  { timestamps: true }
);

const SettingsModel = mongoose.model("Settings", settingsSchema);
export default SettingsModel;
