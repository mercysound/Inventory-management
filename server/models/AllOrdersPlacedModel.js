// import mongoose from "mongoose";

// const AllOrdersPlacedSchema = new mongoose.Schema({
//   userOrdering: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
//   productList: {type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true},
//   allQuantity: {type: Number, required: true},
//   paymentMethod: {type: String, required: true},
//   deliveryStatus: {type: String, required: true},
//   buyerName: {type: String, required: true},
// //   price: {type: Number, required: true},
//   totalPrice: {type: Number, required: true},
//   orderDate: {type:Date, default: Date.now},
// });

// const AllOrdersPlacedModel = mongoose.model('Purchased', AllOrdersPlacedSchema);

// export default AllOrdersPlacedModel;
// server/models/AllOrdersPlacedModel.js
import mongoose from "mongoose";

const AllOrdersPlacedSchema = new mongoose.Schema({
  userOrdering: { type: String }, // name or id as you prefer
  buyerName: { type: String },
  productList: [{ type: String }],
  allQuantity: { type: Number },
  paymentMethod: { type: String },
  deliveryStatus: { type: String },
  totalPrice: { type: Number },
  createdAt: { type: Date, default: Date.now },
});

const AllOrdersPlacedModel = mongoose.model("AllOrdersPlaced", AllOrdersPlacedSchema);
export default AllOrdersPlacedModel;
