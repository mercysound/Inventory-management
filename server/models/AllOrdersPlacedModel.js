// models/AllOrdersPlacedModel.js
import mongoose from "mongoose";

const allOrdersPlacedSchema = new mongoose.Schema(
  {
    userOrdering: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    buyerName:      { type: String },
    paymentMethod:  { type: String },
    deliveryStatus: { type: String, default: "pending" },
    totalPrice:     { type: Number, required: true },
    allQuantity:    { type: Number, required: true },
    productList: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        productName: { type: String },
        productDescription: { type: String },
        categoryName: { type: String },
        quantity:  { type: Number },
        price:     { type: Number },
        totalPrice:{ type: Number },
        priceMode: { type: String, enum: ["retail", "wholesale"], default: "retail" },
      },
    ],
    paid: { type: Boolean, default: false },

    // ── Fulfillment preference ────────────────────────────────────────────
    // fulfillmentType: "pickup" (customer collects) | "delivery" (we deliver)
    // Delivery-specific fields are only populated when type = "delivery".
    fulfillmentType: {
      type:    String,
      enum:    ["pickup", "delivery"],
      default: "pickup",
    },
    deliveryAddress:       { type: String, default: null },
    deliveryRecipientName: { type: String, default: null },
    deliveryPhone:         { type: String, default: null },
    // ─────────────────────────────────────────────────────────────────────

    // ── Expiry notification tracking ──────────────────────────────────────
    // firstExpiryEmailSentAt: timestamp of the first expiry notification email
    // Used to avoid duplicate "first" emails in "once" mode
    firstExpiryEmailSentAt: { type: Date, default: null },

    // lastExpiryReminderSentAt: timestamp of the most recent reminder email
    // Used in "repeat" mode to track when the next reminder is due
    lastExpiryReminderSentAt: { type: Date, default: null },

    // expiryEmailCount: how many expiry emails have been sent for this order
    expiryEmailCount: { type: Number, default: 0 },
    // ─────────────────────────────────────────────────────────────────────
  },
  { timestamps: true }
);

const AllOrdersPlacedModel = mongoose.model("AllOrdersPlaced", allOrdersPlacedSchema);
export default AllOrdersPlacedModel;
