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
    // delegateToAllStaff: true → every staff member can manage placed orders
    // delegatedStaffIds:  list of specific staff user IDs when not delegating to all
    // Only one mode is active at a time — if delegateToAllStaff is true,
    // delegatedStaffIds is ignored on the server.
    delegateToAllStaff: { type: Boolean, default: false },
    delegatedStaffIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref:  "User",
      },
    ],

    // ── Inventory alert thresholds ────────────────────────────────────────
    lowStockThreshold: { type: Number, default: 10, min: 1 },
    productExpiryWarningWeeks: { type: Number, default: 3, min: 1 },

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
