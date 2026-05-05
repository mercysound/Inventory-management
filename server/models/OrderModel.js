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
}, { timestamps: true });

const OrderModel = mongoose.model("Order", orderSchema);
export default OrderModel;
