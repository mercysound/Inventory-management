import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },           // retail / customer price
  wholesalePrice: { type: Number, default: null },   // wholesale price (optional)
  stock: { type: Number, required: true },

  // ── Images ───────────────────────────────────────────────────────────────
  // `images` holds up to 5 Cloudinary URLs. The first element is the
  // primary/thumbnail image shown in product lists.
  // `image` is kept for backward compatibility with existing records that
  // only have a single image field — if `images` is empty, fall back to it.
  images: { type: [String], default: [] },
  image:  { type: String, default: null },           // legacy single image
  // ─────────────────────────────────────────────────────────────────────────

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

  // ── Optional product metadata ─────────────────────────────────────────────
  expiryDate:  { type: Date,   default: null },
  batchNumber: { type: String, default: null, trim: true },

  // Tracks when the last expiry-warning email was sent for this product.
  // Used by the cron to avoid sending duplicate warnings on the same day.
  lastExpiryWarningSentAt: { type: Date, default: null },
  // ─────────────────────────────────────────────────────────────────────────

}, { timestamps: true });

productSchema.index({ isDeleted: 1 });

const ProductModel = mongoose.model("Product", productSchema);
export default ProductModel;
