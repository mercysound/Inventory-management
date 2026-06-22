import mongoose from "mongoose";

const completedOrderHistorySchema = new mongoose.Schema(
  {
    userOrdering: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    buyerName: String,
    paymentMethod: String,
    deliveryStatus: { type: String, default: "delivered" },

    // ── Cancel / Refund fields ────────────────────────────────────────────
    // cancelled: true when admin cancels from PlacedOrders page
    cancelled: { type: Boolean, default: false },
    cancelledAt: { type: Date, default: null },

    // refundMade: true once admin clicks the Refund button (one-time, irreversible)
    refundMade: { type: Boolean, default: false },
    refundMadeAt: { type: Date, default: null },

    // When true, this order's totalPrice is excluded from dashboard revenue
    refundExcludeFromRevenue: { type: Boolean, default: false },
    // ─────────────────────────────────────────────────────────────────────

    totalPrice: { type: Number, required: true },
    allQuantity: { type: Number, required: true },
    productList: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        productName: String,
        productDescription: String,
        categoryName: String,
        quantity: Number,
        price: Number,
        totalPrice: Number,
        priceMode: { type: String, enum: ["retail", "wholesale"], default: "retail" },
      },
    ],

    // track which specific users have hidden this order from their view
    hiddenFor: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // mark if admin(s) have hidden it (counts as admin-side delete)
    adminHidden: { type: Boolean, default: false },

    // ── Fulfillment info (carried over from AllOrdersPlaced) ──────────────
    fulfillmentType:       { type: String, enum: ["pickup", "delivery"], default: "pickup" },
    deliveryAddress:       { type: String, default: null },
    deliveryRecipientName: { type: String, default: null },
    deliveryPhone:         { type: String, default: null },
    // ─────────────────────────────────────────────────────────────────────

    // ── Delegation / Status-change audit trail ────────────────────────────
    // changedBy:        the user who changed the delivery status (admin or delegated staff)
    // changedByRole:    "admin" or "staff"
    // changedByName:    snapshot of the changer's name at the time of the change
    // isDelegatedAction: true when a delegated staff (not the admin) made the change
    // staffDelegatedFor: populated only when isDelegatedAction = true; points back
    //                    to the same changedBy user so queries are straightforward.
    // ─────────────────────────────────────────────────────────────────────
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  "User",
      default: null,
    },
    changedByRole: { type: String, default: null },
    changedByName: { type: String, default: null },
    isDelegatedAction: { type: Boolean, default: false },
    staffDelegatedFor: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  "User",
      default: null,
    },
    // ─────────────────────────────────────────────────────────────────────
  },
  { timestamps: true }
);

export default mongoose.model("CompletedOrderHistory", completedOrderHistorySchema);
