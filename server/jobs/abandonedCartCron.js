// server/jobs/abandonedCartCron.js
//
// Runs every 10 minutes.
// Finds carts that will expire within `abandonedCartReminderMinutes` and
// sends a one-time reminder email to the owner so they can complete their purchase.
//
// "One-time" is enforced by storing the time we last sent a reminder on each
// OrderModel document (abandonedReminderSentAt). If that field is already set
// we skip that cart so we never spam the same user twice per cart lifecycle.
//
// Cart TTL = 1 hour (cartExpiresAt field, index expireAfterSeconds: 0).
// Default reminder window = 15 minutes before expiry.

import cron          from "node-cron";
import OrderModel    from "../models/OrderModel.js";
import UserModel     from "../models/UserModel.js";
import SettingsModel from "../models/SettingsModel.js";
import { sendAbandonedCartEmail } from "../utils/email/abandonedCartEmail.js";

export const startAbandonedCartCron = () => {
  cron.schedule("*/10 * * * *", async () => {
    try {
      // ── Read config from settings ──────────────────────────────────────
      const settings = await SettingsModel.findOne({}).sort({ createdAt: 1 });
      if (!settings?.abandonedCartReminderEnabled) return;

      const reminderMinutes = settings.abandonedCartReminderMinutes ?? 15;
      const eligibleRoles   = settings.abandonedCartReminderRoles   ?? ["customer", "wholesale"];
      const storeName       = settings.storeName                    ?? "Melech Store";

      if (!eligibleRoles.length) return;

      const now = new Date();

      // Find carts whose TTL will expire within the reminder window
      // and for which we have NOT yet sent a reminder this lifecycle.
      //
      // cartExpiresAt <= now + reminderMinutes  means it expires within the window.
      // cartExpiresAt >  now                   means it hasn't expired yet.
      const windowEnd = new Date(now.getTime() + reminderMinutes * 60 * 1000);

      const carts = await OrderModel.find({
        cartExpiresAt:            { $gt: now, $lte: windowEnd },
        abandonedReminderSentAt:  { $exists: false },
        paid:                     { $ne: true },
      })
        .populate("userOrdering", "name email role")
        .populate("product",      "name price");

      if (!carts.length) return;

      // Group by user so we send one consolidated email per user
      const byUser = {};
      for (const cart of carts) {
        const user = cart.userOrdering;
        if (!user?.email || !eligibleRoles.includes(user.role)) continue;
        const uid = String(user._id);
        if (!byUser[uid]) byUser[uid] = { user, items: [], cartDocs: [], total: 0 };
        byUser[uid].items.push({
          name:     cart.product?.name ?? "Product",
          quantity: cart.quantity,
          price:    cart.price,
        });
        byUser[uid].total += cart.quantity * cart.price;
        byUser[uid].cartDocs.push(cart);
      }

      for (const uid of Object.keys(byUser)) {
        const { user, items, cartDocs, total } = byUser[uid];
        const minutesLeft = Math.ceil(
          (cartDocs[0].cartExpiresAt - now) / (1000 * 60)
        );

        try {
          await sendAbandonedCartEmail({
            customerEmail: user.email,
            customerName:  user.name,
            storeName,
            cartItems:     items,
            cartTotal:     total,
            minutesLeft,
          });

          // Mark all their cart documents as reminded
          const now2 = new Date();
          await OrderModel.updateMany(
            { _id: { $in: cartDocs.map((c) => c._id) } },
            { $set: { abandonedReminderSentAt: now2 } }
          );

          console.log(`[AbandonedCartCron] Reminder sent to ${user.email} (${items.length} items)`);
        } catch (emailErr) {
          console.error(`[AbandonedCartCron] Email failed for ${user.email}:`, emailErr.message);
        }
      }
    } catch (err) {
      console.error("[AbandonedCartCron] Error:", err.message);
    }
  });

  console.log("✅ Abandoned cart cron started — runs every 10 minutes");
};
