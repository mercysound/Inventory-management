// server/jobs/lowStockCron.js
//
// Runs every 30 minutes.
// Checks all active products against their effective low-stock threshold:
//   - If product has individualLowStockThreshold set → use that
//   - Otherwise use global lowStockThreshold from Settings
//
// Sends ONE digest email per run listing every product at/below threshold.
// Uses lastLowStockAlertSentAt to avoid sending duplicate emails within
// a 6-hour window (prevents spam if stock stays low for days).
//
// Individual alert can be disabled per product via individualLowStockAlertEnabled.
// The global productExpiryEmailEnabled toggle in Settings also gates emails here.

import cron from "node-cron";
import ProductModel  from "../models/ProductModel.js";
import SettingsModel from "../models/SettingsModel.js";
import UserModel     from "../models/UserModel.js";
import { sendLowStockAdminEmail } from "../utils/email/lowStockAdminEmail.js";

const RESEND_HOURS = 6; // don't re-alert for the same product within 6 hours

export const startLowStockCron = () => {
  // Run every 30 minutes
  cron.schedule("*/30 * * * *", async () => {
    try {
      const settings = await SettingsModel.findOne({}).sort({ createdAt: 1 });

      // Respect the global low-stock email toggle
      // We reuse productExpiryEmailEnabled as the general inventory alerts switch.
      // Admin can turn off all inventory emails with one toggle.
      if (settings?.productExpiryEmailEnabled === false) {
        return; // silently skip — emails disabled
      }

      const globalThreshold = settings?.lowStockThreshold ?? 10;

      // Resolve admin email
      let adminEmail = settings?.adminNotificationEmail?.trim() || "";
      if (!adminEmail) {
        const adminUser = await UserModel.findOne({ role: "admin" }).select("email");
        adminEmail      = adminUser?.email || "";
      }
      if (!adminEmail) return;

      const now          = new Date();
      const resendCutoff = new Date(now.getTime() - RESEND_HOURS * 60 * 60 * 1000);

      // Fetch all active products that have stock ≥ 0
      // We filter by effective threshold in JS so we can handle per-product values
      const products = await ProductModel.find({ isDeleted: false, stock: { $gte: 0 } })
        .select("name stock image individualLowStockThreshold individualLowStockAlertEnabled lastLowStockAlertSentAt categoryId supplierId")
        .populate("categoryId", "name")
        .populate("supplierId", "name");

      const toAlert = products.filter((p) => {
        // Individual alert disabled for this product
        if (p.individualLowStockAlertEnabled === false) return false;

        // Effective threshold: individual overrides global; null means use global
        const threshold =
          p.individualLowStockThreshold !== null &&
          p.individualLowStockThreshold !== undefined
            ? p.individualLowStockThreshold
            : globalThreshold;

        // Only alert if stock is AT or BELOW threshold
        if (p.stock > threshold) return false;

        // Throttle: don't re-alert within RESEND_HOURS
        if (p.lastLowStockAlertSentAt && new Date(p.lastLowStockAlertSentAt) > resendCutoff) {
          return false;
        }

        return true;
      });

      if (!toAlert.length) return;

      // Build payload sorted by stock ascending (most critical first)
      const payload = toAlert
        .map((p) => ({
          _id:       p._id,
          name:      p.name,
          stock:     p.stock,
          threshold: p.individualLowStockThreshold ?? globalThreshold,
          category:  p.categoryId?.name || "",
          supplier:  p.supplierId?.name || "",
          image:     p.image || null,
        }))
        .sort((a, b) => a.stock - b.stock);

      // Send digest email
      await sendLowStockAdminEmail({
        adminEmail,
        products:  payload,
        storeName: settings?.storeName || "Melech Store",
      });

      // Update lastLowStockAlertSentAt for all alerted products
      await ProductModel.updateMany(
        { _id: { $in: toAlert.map((p) => p._id) } },
        { $set: { lastLowStockAlertSentAt: now } }
      );

      console.log(`[LowStockCron] Sent low-stock digest for ${toAlert.length} product(s)`);
    } catch (err) {
      console.error("[LowStockCron] Error:", err.message);
    }
  });

  console.log("✅ Low stock cron started — runs every 30 minutes");
};
