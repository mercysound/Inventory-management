import mongoose from "mongoose";

const productDraftSchema = new mongoose.Schema({
  // One draft per admin — their user _id is the unique key
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    unique: true,
    required: true,
  },
  draft: {
    name:        { type: String, default: "" },
    description: { type: String, default: "" },
    price:          { type: String, default: "" }, // String so empty "" is valid
    wholesalePrice: { type: String, default: "" }, // String so empty "" is valid
    stock:          { type: String, default: "" }, // String so empty "" is valid
    categoryId:  { type: String, default: "" }, // stored as raw ObjectId string
    supplierId:  { type: String, default: "" }, // stored as raw ObjectId string
  },
  updatedAt: { type: Date, default: Date.now },
});

const ProductDraftModel = mongoose.model("ProductDraft", productDraftSchema);
export default ProductDraftModel;