import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  name : {type: String, required: true},
  description: {type: String, required:true},
  price: {type: Number, required:true},
  stock: {type: Number, required:true},
  isDeleted: {type: Boolean, default: false},
  categoryId: {type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true},
  supplierId: {type: mongoose.Schema.Types.ObjectId, ref: "Supplier", required: true},
});

const ProductModel = mongoose.model("Product", productSchema);


export default ProductModel; 