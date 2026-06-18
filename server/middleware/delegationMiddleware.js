// server/middleware/delegationMiddleware.js

import SettingsModel from "../models/SettingsModel.js";

// ─────────────────────────────────────────────────────────────────────────────
// isDelegatedStaffCheck (shared helper)
// Returns true when the given staff user ID has delegation access.
// ─────────────────────────────────────────────────────────────────────────────
const resolveIsDelegated = async (userId) => {
  const settings = await SettingsModel.findOne({}).sort({ createdAt: 1 });
  if (!settings) return false;
  return (
    settings.delegateToAllStaff === true ||
    (settings.delegatedStaffIds || []).some((id) => String(id) === String(userId))
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// checkDelegatedAccess  (STRICT)
// Used on routes that ONLY admin or delegated staff may access.
// Blocks customers, wholesale, and non-delegated staff with 403.
// Sets req.isDelegatedStaff = true when a delegated staff passes through.
// ─────────────────────────────────────────────────────────────────────────────
export const checkDelegatedAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Admins always pass
    if (req.user.role === "admin") {
      req.isDelegatedStaff = false;
      return next();
    }

    // Only staff can have delegation — all other roles are blocked here
    if (req.user.role !== "staff") {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Only admin or delegated staff can perform this action.",
      });
    }

    const isDelegated = await resolveIsDelegated(req.user._id);

    if (!isDelegated) {
      return res.status(403).json({
        success: false,
        message:
          "Forbidden: You have not been granted order management access. Ask your admin to delegate this to you.",
      });
    }

    req.isDelegatedStaff = true;
    return next();
  } catch (err) {
    console.error("checkDelegatedAccess error:", err.message);
    return res.status(500).json({ success: false, message: "Server error in delegation check" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// softDelegationCheck  (PERMISSIVE)
// Used on GET /placed-orders — ALL authenticated roles pass through.
// Customers and wholesale hit this too (they see only their own orders
// via the controller's query filter).
// For staff, sets req.isDelegatedStaff so the controller knows whether
// to show all orders or just their own.
// ─────────────────────────────────────────────────────────────────────────────
export const softDelegationCheck = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (req.user.role === "admin") {
      req.isDelegatedStaff = false;
      return next();
    }

    if (req.user.role === "staff") {
      req.isDelegatedStaff = await resolveIsDelegated(req.user._id);
      return next();
    }

    // customer / wholesale — pass through, controller filters by userOrdering
    req.isDelegatedStaff = false;
    return next();
  } catch (err) {
    console.error("softDelegationCheck error:", err.message);
    // On error, fail safe: let the request through without delegation flag
    req.isDelegatedStaff = false;
    return next();
  }
};
