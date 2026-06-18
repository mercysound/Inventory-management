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
  },
  { timestamps: true }
);

export default mongoose.model("CompletedOrderHistory", completedOrderHistorySchema);
