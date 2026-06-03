// server/controllers/settingsController.js
import SettingsModel from "../models/SettingsModel.js";
import { sendResponse, sendError } from "../utils/apiResponse.js";

// ── Helper: get or create settings doc for the current admin user ─────────────
const getOrCreate = async (userId) => {
  let settings = await SettingsModel.findOne({ userId });
  if (!settings) {
    settings = await SettingsModel.create({ userId });
  }
  return settings;
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /settings
// Returns settings for the logged-in admin
// ─────────────────────────────────────────────────────────────────────────────
export const getSettings = async (req, res) => {
  try {
    const settings = await getOrCreate(req.user._id);
    return sendResponse(res, 200, { settings }, "Settings retrieved successfully");
  } catch (error) {
    console.error("getSettings error:", error);
    return sendError(res, 500, "Failed to fetch settings");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /settings
// Admin updates their settings
// ─────────────────────────────────────────────────────────────────────────────
export const updateSettings = async (req, res) => {
  try {
    const {
      orderExpiryHours,
      reminderMode,
      reminderIntervalHours,
      storeName,
      adminNotificationEmail,
    } = req.body;

    const update = {};
    if (orderExpiryHours      !== undefined) update.orderExpiryHours      = Number(orderExpiryHours);
    if (reminderMode          !== undefined) update.reminderMode          = reminderMode;
    if (reminderIntervalHours !== undefined) update.reminderIntervalHours = Number(reminderIntervalHours);
    if (storeName             !== undefined) update.storeName             = storeName;
    if (adminNotificationEmail !== undefined) update.adminNotificationEmail = adminNotificationEmail;

    const settings = await SettingsModel.findOneAndUpdate(
      { userId: req.user._id },
      { $set: update },
      { new: true, upsert: true }
    );

    return sendResponse(res, 200, { settings }, "Settings updated successfully");
  } catch (error) {
    console.error("updateSettings error:", error);
    return sendError(res, 500, "Failed to update settings");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /settings/product-draft
// Returns the saved product form draft for the current admin user.
// Returns null if no draft exists.
// ─────────────────────────────────────────────────────────────────────────────
export const getProductDraft = async (req, res) => {
  try {
    const settings = await getOrCreate(req.user._id);
    return sendResponse(res, 200, {
      draft:       settings.productFormDraft       || null,
      savedAt:     settings.productFormDraftSavedAt || null,
    }, "Draft retrieved successfully");
  } catch (error) {
    console.error("getProductDraft error:", error);
    return sendError(res, 500, "Failed to fetch draft");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /settings/product-draft
// Saves (or updates) the product form draft for the current admin.
// Called with debounce from the frontend — 1.5s after admin stops typing.
// ─────────────────────────────────────────────────────────────────────────────
export const saveProductDraft = async (req, res) => {
  try {
    const { draft } = req.body;

    if (draft === undefined) {
      return sendError(res, 400, "Draft data is required");
    }

    // Strip image-related fields — they are blobs/URLs that can't be
    // meaningfully restored across devices
    const { image, removeImage, _imageName, ...safeDraft } = draft;

    const settings = await SettingsModel.findOneAndUpdate(
      { userId: req.user._id },
      {
        $set: {
          productFormDraft:         safeDraft,
          productFormDraftSavedAt:  new Date(),
        },
      },
      { new: true, upsert: true }
    );

    return sendResponse(res, 200, {
      savedAt: settings.productFormDraftSavedAt,
    }, "Draft saved");
  } catch (error) {
    console.error("saveProductDraft error:", error);
    return sendError(res, 500, "Failed to save draft");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /settings/product-draft
// Clears the draft — called ONLY after a product is successfully added.
// ─────────────────────────────────────────────────────────────────────────────
export const clearProductDraft = async (req, res) => {
  try {
    await SettingsModel.findOneAndUpdate(
      { userId: req.user._id },
      {
        $set: {
          productFormDraft:        null,
          productFormDraftSavedAt: null,
        },
      },
      { upsert: true }
    );
    return sendResponse(res, 200, null, "Draft cleared");
  } catch (error) {
    console.error("clearProductDraft error:", error);
    return sendError(res, 500, "Failed to clear draft");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /settings/expiring-config
// Used by the cron job to read expiry settings without going through auth
// (internal call only — do not expose this route publicly)
// ─────────────────────────────────────────────────────────────────────────────
export const getExpiryConfigForCron = async () => {
  // Get settings of the first admin user found
  // In most single-admin setups this is sufficient
  const settings = await SettingsModel.findOne({}).sort({ createdAt: 1 });
  return {
    orderExpiryHours:       settings?.orderExpiryHours       ?? 48,
    reminderMode:           settings?.reminderMode           ?? "repeat",
    reminderIntervalHours:  settings?.reminderIntervalHours  ?? 6,
    adminNotificationEmail: settings?.adminNotificationEmail ?? "",
  };
};
