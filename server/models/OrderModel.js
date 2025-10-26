// server/models/OrderModel.js
import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  userOrdering: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
  orderDate: { type: Date, default: Date.now },
  paymentMethod: { type: String }, // saved when order is completed
  buyerName: { type: String },
  deliveryStatus: { type: String },
});

const OrderModel = mongoose.model("Order", orderSchema);
export default OrderModel;
