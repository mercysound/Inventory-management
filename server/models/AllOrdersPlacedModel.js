// models/AllOrdersPlacedModel.js
import mongoose from "mongoose";

const allOrdersPlacedSchema = new mongoose.Schema(
  {
    userOrdering: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    buyerName: { type: String },
    paymentMethod: { type: String },
    deliveryStatus: { type: String, default: "Pending" },
    totalPrice: { type: Number, required: true },
    allQuantity: { type: Number, required: true },
    productList: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        quantity: { type: Number },
        price: { type: Number },
        totalPrice: { type: Number },
      },
    ],
  },
  { timestamps: true }
);

const AllOrdersPlacedModel = mongoose.model(
  "AllOrdersPlaced",
  allOrdersPlacedSchema
);

export default AllOrdersPlacedModel;

