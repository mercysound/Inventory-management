import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },           // retail / customer price
  wholesalePrice: { type: Number, default: null },   // wholesale price (optional)
  stock: { type: Number, required: true },
  image: { type: String },
  isDeleted: { type: Boolean, default: false },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: true,
  },
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Supplier",
    required: false,
    default: null,
  },
}, { timestamps: true });

productSchema.index({ isDeleted: 1 });

const ProductModel = mongoose.model("Product", productSchema);
export default ProductModel;
