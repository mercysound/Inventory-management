// server/jobs/orderExpiryCron.js
import cron from "node-cron";
import AllOrdersPlacedModel from "../models/AllOrdersPlacedModel.js";
import UserModel from "../models/UserModel.js";
import { getExpiryConfigForCron } from "../controllers/settingsController.js";
import { sendOrderExpiryAdminEmail } from "../utils/email/orderExpiryAdminEmail.js";

/**
 * Runs every 15 minutes.
 * Checks all active placed orders against the configured expiry threshold.
 * Sends email notifications to admin based on reminderMode setting.
 */
export const startOrderExpiryCron = () => {
  cron.schedule("*/15 * * * *", async () => {
    try {
      const {
        orderExpiryHours,
        reminderMode,
        reminderIntervalHours,
        adminNotificationEmail,
      } = await getExpiryConfigForCron();

      // Resolve admin notification email
      let targetEmail = adminNotificationEmail?.trim() || "";
      if (!targetEmail) {
        const adminUser = await UserModel.findOne({ role: "admin" }).select("email");
        targetEmail     = adminUser?.email || "";
      }

      if (!targetEmail) {
        console.warn("[OrderExpiryCron] No admin email configured — skipping");
        return;
      }

      const now = new Date();

      const activeOrders = await AllOrdersPlacedModel.find({
        deliveryStatus: { $in: ["pending", "processing"] },
      }).populate("userOrdering", "name email");

      for (const order of activeOrders) {
        const placedAt     = new Date(order.createdAt);
        const hoursElapsed = (now - placedAt) / (1000 * 60 * 60);

        if (hoursElapsed < orderExpiryHours) continue;

        const buyerName    = order.buyerName || order.userOrdering?.name || "Unknown";
        const hoursRounded = Math.floor(hoursElapsed);

        if (reminderMode === "once") {
          if (!order.firstExpiryEmailSentAt) {
            await sendOrderExpiryAdminEmail({
              adminEmail:   targetEmail,
              buyerName,
              orderId:      order._id,
              totalPrice:   order.totalPrice,
              orderDate:    order.createdAt,
              hoursElapsed: hoursRounded,
              expiryHours:  orderExpiryHours,
            });
            order.firstExpiryEmailSentAt   = now;
            order.lastExpiryReminderSentAt = now;
            order.expiryEmailCount         = 1;
            await order.save();
            console.log(`[OrderExpiryCron] Sent once-email for order ${order._id}`);
          }
        } else {
          // repeat mode
          const lastSent         = order.lastExpiryReminderSentAt ? new Date(order.lastExpiryReminderSentAt) : null;
          const hoursSinceLast   = lastSent ? (now - lastSent) / (1000 * 60 * 60) : Infinity;

          if (hoursSinceLast >= reminderIntervalHours) {
            await sendOrderExpiryAdminEmail({
              adminEmail:   targetEmail,
              buyerName,
              orderId:      order._id,
              totalPrice:   order.totalPrice,
              orderDate:    order.createdAt,
              hoursElapsed: hoursRounded,
              expiryHours:  orderExpiryHours,
            });
            if (!order.firstExpiryEmailSentAt) order.firstExpiryEmailSentAt = now;
            order.lastExpiryReminderSentAt = now;
            order.expiryEmailCount         = (order.expiryEmailCount || 0) + 1;
            await order.save();
            console.log(`[OrderExpiryCron] Sent reminder #${order.expiryEmailCount} for order ${order._id}`);
          }
        }
      }
    } catch (err) {
      console.error("[OrderExpiryCron] Error:", err.message);
    }
  });

  console.log("✅ Order expiry cron job started — runs every 15 minutes");
};
