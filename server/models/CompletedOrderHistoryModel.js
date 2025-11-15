// models/CompletedOrderHistoryModel.js
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
    deliveryStatus: { type: String, default: "Delivered" },
    totalPrice: { type: Number, required: true },
    allQuantity: { type: Number, required: true },
    productList: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        quantity: Number,
        price: Number,
        totalPrice: Number,
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
