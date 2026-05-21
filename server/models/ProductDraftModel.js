// ── Draft schema (add to your models or as a standalone model) ──
// models/ProductDraftModel.js
import mongoose from "mongoose";

const productDraftSchema = new mongoose.Schema({
  // One draft per admin user — we use their _id as the key
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true, required: true },
  draft: {
    name:        { type: String, default: "" },
    description: { type: String, default: "" },
    price:       { type: String, default: "" },
    stock:       { type: String, default: "" },
    categoryId:  { type: String, default: "" },
    supplierId:  { type: String, default: "" },
  },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model("ProductDraft", productDraftSchema);