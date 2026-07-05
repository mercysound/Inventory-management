// server/jobs/engagementRollupCron.js
// Runs daily at 1 AM.
// Aggregates yesterday's CustomerSession data into one DailyEngagement document.
// Raw sessions older than 30 days are auto-deleted by MongoDB TTL index — no action needed here.
import cron                  from "node-cron";
import CustomerSessionModel  from "../models/CustomerSessionModel.js";
import DailyEngagementModel  from "../models/DailyEngagementModel.js";

export const startEngagementRollupCron = () => {
  // Runs every day at 01:00 AM server time
  cron.schedule("0 1 * * *", async () => {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = yesterday.toISOString().slice(0, 10); // "YYYY-MM-DD"

      const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
      const dayEnd   = new Date(`${dateStr}T23:59:59.999Z`);

      const sessions = await CustomerSessionModel.find({
        startedAt: { $gte: dayStart, $lte: dayEnd },
      });

      if (!sessions.length) {
        console.log(`[EngagementRollup] No sessions for ${dateStr} — skipping`);
        return;
      }

      const totalVisitors   = sessions.length;
      const totalEngaged    = sessions.filter((s) => s.engaged).length;
      const addedToCart     = sessions.filter((s) =>
        s.actions?.some((a) => a.action === "add_to_cart")
      ).length;
      const startedCheckout = sessions.filter((s) =>
        s.actions?.some((a) => a.action === "start_checkout")
      ).length;
      const purchases       = sessions.filter((s) => s.purchased).length;
      const abandonedCart   = sessions.filter((s) => s.engaged && !s.purchased).length;
      const conversionRate  = totalVisitors > 0
        ? Math.round((purchases / totalVisitors) * 100 * 10) / 10
        : 0;

      await DailyEngagementModel.findOneAndUpdate(
        { date: dateStr },
        {
          $set: {
            date: dateStr,
            totalVisitors,
            totalEngaged,
            addedToCart,
            startedCheckout,
            purchases,
            conversionRate,
            abandonedCart,
          },
        },
        { upsert: true }
      );

      console.log(`[EngagementRollup] ${dateStr}: ${totalVisitors} visitors, ${purchases} purchases (${conversionRate}% conversion)`);
    } catch (err) {
      console.error("[EngagementRollup] Error:", err.message);
    }
  });

  console.log("✅ Engagement rollup cron started — runs daily at 1 AM");
};
