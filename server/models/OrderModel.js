import mongoose from "mongoose";

const orderShema = new mongoose.Schema({
  customer: {type: mongoose.Schema.Types.ObjectId, re: 'User', required: true},
  product: {type: mongoose.Schema.Types.ObjectId, re: 'Product', required: true},
  quantity: {type: Number, required: true},
  totalPrice: {type: Number, required: true},
  orderDate: {type:Date, default: Date.now},
});

const OrderModel = mongoose.model('Order', orderShema);

export default OrderModel;