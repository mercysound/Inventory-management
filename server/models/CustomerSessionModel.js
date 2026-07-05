// server/models/CustomerSessionModel.js
// Raw session data — auto-deleted after 30 days via TTL index on endedAt.
// Rolled up into DailyEngagementModel by the nightly cron at 1 AM.
import mongoose from "mongoose";

const customerSessionSchema = new mongoose.Schema({
  customerId:  { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  sessionId:   { type: String, required: true, index: true },
  startedAt:   { type: Date,   default: Date.now },
  endedAt:     { type: Date,   default: null, index: { expireAfterSeconds: 2592000 } }, // 30 days TTL

  // Actions performed during the session
  // Each entry: { action: String, productId?, ts: Date }
  actions: [{
    action:    { type: String }, // "product_view" | "add_to_cart" | "start_checkout"
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", default: null },
    ts:        { type: Date, default: Date.now },
  }],

  // Cart snapshot at session end
  cartItems: [{ name: String, quantity: Number, price: Number }],

  engaged:     { type: Boolean, default: false }, // true if any engagement action
  purchased:   { type: Boolean, default: false }, // true if completed an order
  totalSpent:  { type: Number,  default: 0 },
}, { timestamps: true });

// Compound indexes for dashboard queries
customerSessionSchema.index({ engaged: 1, purchased: 1 });
customerSessionSchema.index({ startedAt: -1 });

const CustomerSessionModel = mongoose.model("CustomerSession", customerSessionSchema);
export default CustomerSessionModel;
