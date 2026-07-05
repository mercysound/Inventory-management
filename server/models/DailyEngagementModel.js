// server/models/DailyEngagementModel.js
// Aggregate daily stats — kept forever, no TTL.
// Built by the nightly rollup cron at 1 AM from CustomerSession data.
import mongoose from "mongoose";

const dailyEngagementSchema = new mongoose.Schema({
  date:             { type: String, required: true, index: true }, // "YYYY-MM-DD"
  totalVisitors:    { type: Number, default: 0 },
  totalEngaged:     { type: Number, default: 0 },  // had engagement action
  addedToCart:      { type: Number, default: 0 },  // added at least one item
  startedCheckout:  { type: Number, default: 0 },  // opened Paystack / checkout
  purchases:        { type: Number, default: 0 },  // completed an order
  conversionRate:   { type: Number, default: 0 },  // purchases / totalVisitors × 100
  abandonedCart:    { type: Number, default: 0 },  // engaged but no purchase
}, { timestamps: true });

dailyEngagementSchema.index({ date: -1 });

const DailyEngagementModel = mongoose.model("DailyEngagement", dailyEngagementSchema);
export default DailyEngagementModel;
