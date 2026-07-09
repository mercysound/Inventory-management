// server/controllers/settingsController.js
import SettingsModel from "../models/SettingsModel.js";
import UserModel     from "../models/UserModel.js";
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
      lowStockThreshold,
      productExpiryWarningWeeks,
      globalTheme,
      expiryReminderEnabled,
    } = req.body;

    const update = {};
    if (orderExpiryHours        !== undefined) update.orderExpiryHours        = Number(orderExpiryHours);
    if (reminderMode            !== undefined) update.reminderMode            = reminderMode;
    if (reminderIntervalHours   !== undefined) update.reminderIntervalHours   = Number(reminderIntervalHours);
    if (storeName               !== undefined) update.storeName               = storeName;
    if (adminNotificationEmail  !== undefined) update.adminNotificationEmail  = adminNotificationEmail;
    if (lowStockThreshold       !== undefined) update.lowStockThreshold       = Math.max(1, Number(lowStockThreshold));
    if (productExpiryWarningWeeks !== undefined) update.productExpiryWarningWeeks = Math.max(1, Number(productExpiryWarningWeeks));
    if (req.body.productExpiryEmailEnabled !== undefined) update.productExpiryEmailEnabled = Boolean(req.body.productExpiryEmailEnabled);
    // Bank account details
    const bankFields = ["bankName","accountName","accountNumber","bankName2","accountName2","accountNumber2"];
    bankFields.forEach((f) => {
      if (req.body[f] !== undefined) update[f] = String(req.body[f] || "").trim();
    });
    if (globalTheme             !== undefined) {
      const valid = ["default", "ocean", "forest", "royal", "sunset"];
      if (valid.includes(globalTheme)) update.globalTheme = globalTheme;
    }
    if (expiryReminderEnabled   !== undefined) update.expiryReminderEnabled   = Boolean(expiryReminderEnabled);
    // Abandoned cart reminder
    if (req.body.abandonedCartReminderEnabled  !== undefined) update.abandonedCartReminderEnabled  = Boolean(req.body.abandonedCartReminderEnabled);
    if (req.body.abandonedCartReminderMinutes  !== undefined) update.abandonedCartReminderMinutes  = Math.max(1, Number(req.body.abandonedCartReminderMinutes));
    if (req.body.abandonedCartReminderRoles    !== undefined) {
      const validRoles = ["customer", "wholesale"];
      update.abandonedCartReminderRoles = (req.body.abandonedCartReminderRoles || []).filter((r) => validRoles.includes(r));
    }
    if (req.body.contactEmail    !== undefined) update.contactEmail    = String(req.body.contactEmail    || "").trim();
    if (req.body.contactPhone    !== undefined) update.contactPhone    = String(req.body.contactPhone    || "").trim();
    if (req.body.contactWhatsapp !== undefined) update.contactWhatsapp = String(req.body.contactWhatsapp || "").trim();
    if (req.body.contactAddress  !== undefined) update.contactAddress  = String(req.body.contactAddress  || "").trim();

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
    expiryReminderEnabled:  settings?.expiryReminderEnabled  ?? true,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// getAdminEmail — shared helper used by orderController and anywhere that
// needs to send a notification to the admin.
//
// Resolution order:
//   1. adminNotificationEmail from settings (what admin set in the UI)
//   2. Admin user's account email from the DB
//   3. ADMIN_EMAIL env variable as last resort
// ─────────────────────────────────────────────────────────────────────────────
export const getAdminEmail = async () => {
  try {
    const settings = await SettingsModel.findOne({}).sort({ createdAt: 1 });
    const fromSettings = settings?.adminNotificationEmail?.trim();
    if (fromSettings) return fromSettings;

    const adminUser = await UserModel.findOne({ role: "admin" }).select("email");
    if (adminUser?.email) return adminUser.email;
  } catch (err) {
    console.error("getAdminEmail error:", err.message);
  }

  return process.env.ADMIN_EMAIL || "";
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /settings/delegation
// Admin reads current delegation config (which staff are delegated).
// Populates staff user details for the UI.
// ─────────────────────────────────────────────────────────────────────────────
export const getDelegation = async (req, res) => {
  try {
    const settings = await SettingsModel.findOne({ userId: req.user._id })
      .populate("delegatedStaffIds", "name email role isActive");

    return sendResponse(res, 200, {
      delegateToAllStaff: settings?.delegateToAllStaff ?? false,
      delegatedStaffIds:  settings?.delegatedStaffIds  ?? [],
    }, "Delegation settings retrieved");
  } catch (err) {
    console.error("getDelegation error:", err.message);
    return sendError(res, 500, "Failed to fetch delegation settings");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /settings/delegation
// Admin sets delegation mode.
//
// Body:
//   { delegateToAllStaff: boolean, delegatedStaffIds: string[] }
//
// If delegateToAllStaff is true, delegatedStaffIds is cleared on the server
// so there is no ambiguity about which mode is active.
//
// Sends email notifications to staff when their access is granted or revoked.
// ─────────────────────────────────────────────────────────────────────────────
export const updateDelegation = async (req, res) => {
  try {
    const { delegateToAllStaff, delegatedStaffIds } = req.body;

    // Load current settings to diff who was added/removed
    const current = await SettingsModel.findOne({ userId: req.user._id });
    const prevAllStaff  = current?.delegateToAllStaff ?? false;
    const prevIds       = (current?.delegatedStaffIds || []).map((id) => String(id));

    const patch = {};

    if (typeof delegateToAllStaff === "boolean") {
      patch.delegateToAllStaff = delegateToAllStaff;
      if (delegateToAllStaff) patch.delegatedStaffIds = [];
    }

    if (Array.isArray(delegatedStaffIds) && !delegateToAllStaff) {
      patch.delegatedStaffIds  = delegatedStaffIds;
      patch.delegateToAllStaff = false;
    }

    const settings = await SettingsModel.findOneAndUpdate(
      { userId: req.user._id },
      { $set: patch },
      { new: true, upsert: true }
    ).populate("delegatedStaffIds", "name email role isActive");

    // ── Fire-and-forget delegation change emails ──────────────────────────
    setImmediate(async () => {
      try {
        const { sendStaffDelegationEmail } = await import("../utils/email/staffDelegationEmail.js");
        const storeName = current?.storeName || "Melech Store";
        const adminName = req.user.name || "Admin";

        const newAllStaff = settings.delegateToAllStaff;
        const newIds      = (settings.delegatedStaffIds || []).map((u) =>
          typeof u === "object" ? String(u._id) : String(u)
        );

        // Mode changed to "all staff" — notify all current staff
        if (newAllStaff && !prevAllStaff) {
          const allStaff = await UserModel.find({ role: "staff", isActive: true }).select("name email");
          for (const s of allStaff) {
            await sendStaffDelegationEmail({ staffEmail: s.email, staffName: s.name, adminName, granted: true, storeName }).catch(() => {});
          }
          return;
        }

        // Mode changed away from "all staff" — notify all staff that access is revoked
        if (!newAllStaff && prevAllStaff) {
          const allStaff = await UserModel.find({ role: "staff", isActive: true }).select("name email");
          for (const s of allStaff) {
            // Only revoke those NOT in the new specific list
            if (!newIds.includes(String(s._id))) {
              await sendStaffDelegationEmail({ staffEmail: s.email, staffName: s.name, adminName, granted: false, storeName }).catch(() => {});
            }
          }
          return;
        }

        // Specific-list mode: diff additions and removals
        const added   = newIds.filter((id) => !prevIds.includes(id));
        const removed = prevIds.filter((id) => !newIds.includes(id));

        if (added.length > 0) {
          const addedUsers = await UserModel.find({ _id: { $in: added } }).select("name email");
          for (const s of addedUsers) {
            await sendStaffDelegationEmail({ staffEmail: s.email, staffName: s.name, adminName, granted: true, storeName }).catch(() => {});
          }
        }
        if (removed.length > 0) {
          const removedUsers = await UserModel.find({ _id: { $in: removed } }).select("name email");
          for (const s of removedUsers) {
            await sendStaffDelegationEmail({ staffEmail: s.email, staffName: s.name, adminName, granted: false, storeName }).catch(() => {});
          }
        }
      } catch (emailErr) {
        console.error("Delegation email error:", emailErr.message);
      }
    });

    return sendResponse(res, 200, {
      delegateToAllStaff: settings.delegateToAllStaff,
      delegatedStaffIds:  settings.delegatedStaffIds,
    }, "Delegation settings updated");
  } catch (err) {
    console.error("updateDelegation error:", err.message);
    return sendError(res, 500, "Failed to update delegation settings");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /settings/my-delegation
// Staff calls this to find out whether they have order-management delegation.
// Returns { isDelegated: boolean } — lightweight, no sensitive data.
// ─────────────────────────────────────────────────────────────────────────────
export const getMyDelegationStatus = async (req, res) => {
  try {
    // Only makes sense for staff — other roles always get false
    if (req.user.role !== "staff") {
      return sendResponse(res, 200, { isDelegated: false }, "Not a staff account");
    }

    const settings = await SettingsModel.findOne({}).sort({ createdAt: 1 });

    if (!settings) {
      return sendResponse(res, 200, { isDelegated: false }, "No settings found");
    }

    const staffId = String(req.user._id);
    const isDelegated =
      settings.delegateToAllStaff === true ||
      (settings.delegatedStaffIds || []).some((id) => String(id) === staffId);

    return sendResponse(res, 200, { isDelegated }, "Delegation status retrieved");
  } catch (err) {
    console.error("getMyDelegationStatus error:", err.message);
    return sendError(res, 500, "Failed to check delegation status");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /settings/my-wholesale
// Staff calls this to find out whether they can use wholesale pricing.
// Returns { canUseWholesale: boolean }
// ─────────────────────────────────────────────────────────────────────────────
export const getMyWholesaleAccess = async (req, res) => {
  try {
    if (req.user.role !== "staff") {
      return sendResponse(res, 200, { canUseWholesale: false }, "Not a staff account");
    }
    const settings = await SettingsModel.findOne({}).sort({ createdAt: 1 });
    if (!settings) return sendResponse(res, 200, { canUseWholesale: false }, "No settings found");

    const staffId = String(req.user._id);
    const canUseWholesale =
      settings.wholesaleAllStaff === true ||
      (settings.wholesaleStaffIds || []).some((id) => String(id) === staffId);

    return sendResponse(res, 200, { canUseWholesale }, "Wholesale access status retrieved");
  } catch (err) {
    console.error("getMyWholesaleAccess error:", err.message);
    return sendError(res, 500, "Failed to check wholesale access");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /settings/wholesale-access   (admin reads current wholesale access config)
// ─────────────────────────────────────────────────────────────────────────────
export const getWholesaleAccess = async (req, res) => {
  try {
    const settings = await SettingsModel.findOne({ userId: req.user._id })
      .populate("wholesaleStaffIds", "name email role isActive");
    return sendResponse(res, 200, {
      wholesaleAllStaff: settings?.wholesaleAllStaff ?? false,
      wholesaleStaffIds: settings?.wholesaleStaffIds  ?? [],
    }, "Wholesale access settings retrieved");
  } catch (err) {
    console.error("getWholesaleAccess error:", err.message);
    return sendError(res, 500, "Failed to fetch wholesale access settings");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /settings/wholesale-access   (admin sets wholesale access)
// Body: { wholesaleAllStaff: boolean, wholesaleStaffIds: string[] }
// ─────────────────────────────────────────────────────────────────────────────
export const updateWholesaleAccess = async (req, res) => {
  try {
    const { wholesaleAllStaff, wholesaleStaffIds } = req.body;
    const patch = {};

    if (typeof wholesaleAllStaff === "boolean") {
      patch.wholesaleAllStaff = wholesaleAllStaff;
      if (wholesaleAllStaff) patch.wholesaleStaffIds = [];
    }
    if (Array.isArray(wholesaleStaffIds) && !wholesaleAllStaff) {
      patch.wholesaleStaffIds = wholesaleStaffIds;
      patch.wholesaleAllStaff = false;
    }

    const settings = await SettingsModel.findOneAndUpdate(
      { userId: req.user._id },
      { $set: patch },
      { new: true, upsert: true }
    ).populate("wholesaleStaffIds", "name email role isActive");

    // Notify all connected staff clients to re-check their wholesale access
    try {
      global.io?.emit?.("wholesaleAccessChanged");
    } catch {}

    return sendResponse(res, 200, {
      wholesaleAllStaff: settings.wholesaleAllStaff,
      wholesaleStaffIds: settings.wholesaleStaffIds,
    }, "Wholesale access updated");
  } catch (err) {
    console.error("updateWholesaleAccess error:", err.message);
    return sendError(res, 500, "Failed to update wholesale access");
  }
};
// Returns only the store contact fields so the landing page can show them
// without any authenticated session.
// ─────────────────────────────────────────────────────────────────────────────
export const getContactInfo = async (req, res) => {
  try {
    const settings = await SettingsModel.findOne({}).sort({ createdAt: 1 })
      .select("storeName contactEmail contactPhone contactWhatsapp contactAddress");
    return sendResponse(res, 200, {
      storeName:       settings?.storeName       || "",
      contactEmail:    settings?.contactEmail    || "",
      contactPhone:    settings?.contactPhone    || "",
      contactWhatsapp: settings?.contactWhatsapp || "",
      contactAddress:  settings?.contactAddress  || "",
    }, "Contact info retrieved");
  } catch (err) {
    console.error("getContactInfo error:", err.message);
    return sendResponse(res, 200, {
      storeName: "", contactEmail: "", contactPhone: "",
      contactWhatsapp: "", contactAddress: "",
    }, "Default contact info");
  }
};
// Returns only the globalTheme so any user can sync the brand palette on load
// without needing admin-level access to the full settings document.
// ─────────────────────────────────────────────────────────────────────────────
export const getGlobalTheme = async (req, res) => {
  try {
    const settings = await SettingsModel.findOne({}).sort({ createdAt: 1 }).select("globalTheme");
    return sendResponse(res, 200, {
      globalTheme: settings?.globalTheme || "default",
    }, "Global theme retrieved");
  } catch (err) {
    console.error("getGlobalTheme error:", err.message);
    return sendResponse(res, 200, { globalTheme: "default" }, "Default theme");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /settings/guest-browsing
// Public — frontend uses this to decide whether to show the public shop.
// ─────────────────────────────────────────────────────────────────────────────
export const getGuestBrowsingStatus = async (req, res) => {
  try {
    const settings = await SettingsModel.findOne({}).sort({ createdAt: 1 });
    return sendResponse(res, 200, {
      guestBrowsingEnabled: settings?.guestBrowsingEnabled !== false, // default true
    }, "Guest browsing status retrieved");
  } catch (err) {
    console.error("getGuestBrowsingStatus error:", err.message);
    return sendResponse(res, 200, { guestBrowsingEnabled: true }, "Default");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /settings/maintenance-status
// Public — login page calls this to block logins during maintenance.
// Returns { maintenanceMode, maintenanceModeMessage }
// ─────────────────────────────────────────────────────────────────────────────
export const getMaintenanceStatus = async (req, res) => {
  try {
    const settings = await SettingsModel.findOne({}).sort({ createdAt: 1 });
    return sendResponse(res, 200, {
      maintenanceMode:        settings?.maintenanceMode        ?? false,
      maintenanceModeMessage: settings?.maintenanceModeMessage ?? "We are performing scheduled maintenance. We'll be back shortly.",
    }, "Maintenance status retrieved");
  } catch (err) {
    console.error("getMaintenanceStatus error:", err.message);
    return sendResponse(res, 200, { maintenanceMode: false, maintenanceModeMessage: "" }, "Default");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /settings/maintenance
// Admin only. Toggle maintenance mode ON or OFF.
// When toggling ON: broadcasts SSE event to all connected non-admin clients
// so they receive an in-app notification and get auto-logged-out.
// Body: { maintenanceMode: boolean, maintenanceModeMessage?: string }
// ─────────────────────────────────────────────────────────────────────────────
export const updateMaintenanceMode = async (req, res) => {
  try {
    const { maintenanceMode, maintenanceModeMessage } = req.body;

    if (typeof maintenanceMode !== "boolean") {
      return sendError(res, 400, "maintenanceMode must be a boolean");
    }

    const patch = { maintenanceMode };
    if (maintenanceModeMessage !== undefined) {
      patch.maintenanceModeMessage = String(maintenanceModeMessage).trim().slice(0, 500) ||
        "We are performing scheduled maintenance. We'll be back shortly.";
    }
    if (maintenanceMode) {
      patch.maintenanceModeStartedAt = new Date();
    } else {
      patch.maintenanceModeStartedAt = null;
    }

    const settings = await SettingsModel.findOneAndUpdate(
      { userId: req.user._id },
      { $set: patch },
      { new: true, upsert: true }
    );

    // Broadcast via global SSE emitter so all connected clients know immediately
    if (maintenanceMode) {
      try {
        global.maintenanceEmitter?.emit("maintenanceStarted", {
          message: settings.maintenanceModeMessage,
        });
      } catch {}
    } else {
      try {
        global.maintenanceEmitter?.emit("maintenanceEnded", {});
      } catch {}
    }

    return sendResponse(res, 200, {
      maintenanceMode:        settings.maintenanceMode,
      maintenanceModeMessage: settings.maintenanceModeMessage,
    }, maintenanceMode ? "Maintenance mode enabled" : "Maintenance mode disabled");
  } catch (err) {
    console.error("updateMaintenanceMode error:", err.message);
    return sendError(res, 500, "Failed to update maintenance mode");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /settings/guest-browsing
// Admin only. Toggle whether guests can browse products.
// Body: { guestBrowsingEnabled: boolean }
// ─────────────────────────────────────────────────────────────────────────────
export const updateGuestBrowsing = async (req, res) => {
  try {
    const { guestBrowsingEnabled } = req.body;
    if (typeof guestBrowsingEnabled !== "boolean") {
      return sendError(res, 400, "guestBrowsingEnabled must be a boolean");
    }

    const settings = await SettingsModel.findOneAndUpdate(
      { userId: req.user._id },
      { $set: { guestBrowsingEnabled } },
      { new: true, upsert: true }
    );

    return sendResponse(res, 200, {
      guestBrowsingEnabled: settings.guestBrowsingEnabled,
    }, "Guest browsing setting updated");
  } catch (err) {
    console.error("updateGuestBrowsing error:", err.message);
    return sendError(res, 500, "Failed to update guest browsing setting");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /settings/admin-full
// Admin-only endpoint that returns the full settings doc including
// guestBrowsingEnabled and maintenanceMode for the settings page.
// Supplements the existing GET / endpoint.
// ─────────────────────────────────────────────────────────────────────────────
export const getAdminFullSettings = async (req, res) => {
  try {
    const settings = await getOrCreate(req.user._id);
    return sendResponse(res, 200, { settings }, "Full settings retrieved");
  } catch (err) {
    console.error("getAdminFullSettings error:", err.message);
    return sendError(res, 500, "Failed to fetch settings");
  }
};
