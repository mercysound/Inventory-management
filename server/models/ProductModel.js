import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  name : {type: String, require: true},
  description: {type: String, required:true},
  price: {type: Number, required:true},
  stock: {type: Number, required:true},
  isDeleted: {type: Boolean, default: false},
  category: {type: mongoose.Schema.Types.ObjectId, ref: "Category", require: true},
  supplier: {type: mongoose.Schema.Types.ObjectId, ref: "Supplier", require: true},
});

const ProductModel = mongoose.model("Product", productSchema);


export default ProductModel; 