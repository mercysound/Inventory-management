import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  userOrdering: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
  orderDate: { type: Date, default: Date.now },
  productDescription: { type: String },
  deliveryStatus: { type: String, default: "Pending"}

  // New fields
  // paymentMethod: { type: String, default: null }, // e.g. "Cash", "POS"
  // paymentStatus: { 
  //   type: String, 
  //   enum: ["Unpaid", "Paid"], 
  //   default: "Unpaid" 
  // }, // <-- this ensures orders start as Unpaid

  // buyerName: { type: String },
  // deliveryStatus: { type: String, default: "pending" },
});

const OrderModel = mongoose.model("Order", orderSchema);
export default OrderModel;
