// server/jobs/productExpiryCron.js
//
// Runs once every day at 08:00.
// Checks all active (non-deleted) products that have an expiryDate set.
// Sends a single digest email to admin listing every product that will expire
// within the configured warning window (default 3 weeks) or has already expired.
//
// Design decisions:
//   - One digest email per day instead of per-product — avoids inbox spam.
//   - A `lastExpiryWarningSentAt` field on the product controls whether
//     a warning has been sent today, so re-runs within the same day are safe.
//   - Already-expired products are included until they are removed/deleted.

import cron from "node-cron";
import ProductModel from "../models/ProductModel.js";
import SettingsModel from "../models/SettingsModel.js";
import UserModel     from "../models/UserModel.js";
import { sendProductExpiryAdminEmail } from "../utils/email/productExpiryAdminEmail.js";

export const startProductExpiryCron = () => {
  // Runs at 08:00 every day
  cron.schedule("0 8 * * *", async () => {
    try {
      // ── Read admin settings ─────────────────────────────────────────────
      const settings = await SettingsModel.findOne({}).sort({ createdAt: 1 });

      // Master switch — skip everything when product expiry emails are disabled
      if (settings?.productExpiryEmailEnabled === false) {
        console.log("[ProductExpiryCron] Product expiry emails are disabled — skipping");
        return;
      }

      const warningWeeks = settings?.productExpiryWarningWeeks ?? 3;
      const warningMs    = warningWeeks * 7 * 24 * 60 * 60 * 1000;

      // Resolve notification email — same priority as order expiry cron:
      // 1. adminNotificationEmail from settings
      // 2. admin account email from DB
      let adminEmail = settings?.adminNotificationEmail?.trim() || "";
      if (!adminEmail) {
        const adminUser = await UserModel.findOne({ role: "admin" }).select("email");
        adminEmail      = adminUser?.email || "";
      }
      if (!adminEmail) {
        console.warn("[ProductExpiryCron] No admin email — skipping");
        return;
      }

      const now          = new Date();
      const warningCutoff = new Date(now.getTime() + warningMs);

      // ── Find products expiring within the window ─────────────────────────
      const expiring = await ProductModel.find({
        isDeleted:  false,
        expiryDate: { $ne: null, $lte: warningCutoff },
      }).select("name batchNumber expiryDate stock lastExpiryWarningSentAt");

      if (!expiring.length) {
        console.log("[ProductExpiryCron] No expiring products found");
        return;
      }

      // ── Filter: only include those not already warned today ──────────────
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);

      const toNotify = expiring.filter((p) => {
        if (!p.lastExpiryWarningSentAt) return true;
        return new Date(p.lastExpiryWarningSentAt) < todayStart;
      });

      if (!toNotify.length) {
        console.log("[ProductExpiryCron] All expiring products already notified today");
        return;
      }

      // ── Build digest payload ─────────────────────────────────────────────
      const payload = toNotify.map((p) => {
        const msLeft  = new Date(p.expiryDate) - now;
        const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
        return {
          name:        p.name,
          batchNumber: p.batchNumber || null,
          expiryDate:  p.expiryDate,
          stock:       p.stock,
          daysLeft,
        };
      });

      // Sort: soonest expiry first
      payload.sort((a, b) => a.daysLeft - b.daysLeft);

      // ── Send digest email ────────────────────────────────────────────────
      await sendProductExpiryAdminEmail({
        adminEmail,
        products:  payload,
        storeName: settings?.storeName || "Melech Store",
      });

      // ── Mark each product as notified today ─────────────────────────────
      await ProductModel.updateMany(
        { _id: { $in: toNotify.map((p) => p._id) } },
        { $set: { lastExpiryWarningSentAt: now } }
      );

      console.log(`[ProductExpiryCron] Sent expiry digest for ${toNotify.length} product(s)`);
    } catch (err) {
      console.error("[ProductExpiryCron] Error:", err.message);
    }
  });

  console.log("✅ Product expiry cron started — runs daily at 08:00");
};
