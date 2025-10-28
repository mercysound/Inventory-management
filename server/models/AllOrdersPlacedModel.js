import mongoose from "mongoose";

const AllOrdersPlacedSchema = new mongoose.Schema({
  userOrdering: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  buyerName: {
    type: String,
    required: true,
  },

  productList: {
    type: [String], // array of product names
    required: true,
    validate: {
      validator: (arr) => arr.length > 0,
      message: "Product list cannot be empty",
    },
  },

  productDescription: {
    type: [String], // array of descriptions
    required: true,
    validate: {
      validator: (arr) => arr.length > 0,
      message: "Product description list cannot be empty",
    },
  },

  allQuantity: {
    type: Number,
    required: true,
  },

  paymentMethod: {
    type: String,
    required: true,
  },

  deliveryStatus: {
    type: String,
    default: "pending",
    required: true,
  },

  totalPrice: {
    type: Number,
    required: true,
  },

  paymentStatus: {
    type: String,
    enum: ["Paid", "Unpaid"],
    default: "Paid",
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const AllOrdersPlacedModel = mongoose.model("AllOrdersPlaced", AllOrdersPlacedSchema);

export default AllOrdersPlacedModel;
