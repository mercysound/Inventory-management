import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  userOrdering: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
  orderDate: { type: Date, default: Date.now },
  productDescription: { type: String },
  deliveryStatus: { type: String, default: "Pending" },
  paymentMethod: { type: String },
  paymentStatus: { type: String, enum: ["Unpaid", "Paid"], default: "Unpaid" },
  paid: { type: Boolean, default: false },
  buyerName: { type: String },
  priceMode: { type: String, enum: ["retail", "wholesale"], default: "retail" },

  // ✅ TTL field — MongoDB auto-deletes the document 1 hour after this date
  // Every time a user adds/updates items, reset this field to extend the window
  cartExpiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
    index: { expireAfterSeconds: 0 }, // TTL index — expires AT the date value
  },

}, { timestamps: true });

orderSchema.index({ userOrdering: 1 });
// Unique compound index: one cart entry per user per product
// Prevents duplicate documents even under high-concurrency rapid taps
orderSchema.index({ userOrdering: 1, product: 1 }, { unique: true });

const OrderModel = mongoose.model("Order", orderSchema);
export default OrderModel;