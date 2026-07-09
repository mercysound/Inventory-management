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

  // ── New Arrival flag ──────────────────────────────────────────────────────
  // Admin can mark any product as a "New Arrival" independently of its
  // category. Products can be promoted and demoted freely.
  // newArrivalAt tracks when it was promoted (for sorting newest-first).
  isNewArrival:  { type: Boolean, default: false },
  newArrivalAt:  { type: Date,    default: null  },

  // ── Bonanza flag ──────────────────────────────────────────────────────────
  // Admin can mark any product as a "Bonanza" (special deal / cheap offer).
  // These show in the Bonanza tab on the customer product page.
  isBonanza:   { type: Boolean, default: false },

  // ── Staff-only flag ───────────────────────────────────────────────────────
  // When true the product is hidden from online customer/wholesale listings.
  // Only staff can purchase it at the physical counter.
  isStaffOnly: { type: Boolean, default: false },

  // ─────────────────────────────────────────────────────────────────────────
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
  lastExpiryWarningSentAt: { type: Date, default: null },

  // ── Per-product low stock alert ───────────────────────────────────────────
  // When set, overrides the global lowStockThreshold from Settings for this
  // product. null = use the global setting.
  individualLowStockThreshold: { type: Number, default: null, min: 0 },
  // When false, no low-stock alert is sent for this product regardless of
  // the global ON/OFF switch. When true (default), both global and individual
  // thresholds apply normally.
  individualLowStockAlertEnabled: { type: Boolean, default: true },
  // Tracks when the last low-stock email was sent — prevents duplicate emails
  // within the same check cycle.
  lastLowStockAlertSentAt: { type: Date, default: null },

  // ── Product variants ──────────────────────────────────────────────────────
  // Optional attribute variants (e.g. Color, Flavor, Size).
  // Each variant has its own stock and can have an optional price override.
  // If `price` is null the product's base price is used.
  // Variants with stock === 0 are hidden from buyers automatically.
  variants: {
    type: [
      {
        _id:   { type: String, required: true },  // client-generated nanoid
        label: { type: String, required: true, trim: true, maxlength: 50 },  // e.g. "Red", "Mango"
        value: { type: String, required: true, trim: true, maxlength: 50 },  // same as label, kept for client convenience
        stock: { type: Number, required: true, min: 0, default: 0 },
        price: { type: Number, default: null },   // null = use product base price
        sku:   { type: String, default: null, trim: true },
      }
    ],
    default: [],
  },

  // ── Ratings ───────────────────────────────────────────────────────────────
  // Aggregated rating data stored on the product for fast reads.
  // Individual reviews live in the ReviewModel collection.
  ratingAvg:   { type: Number, default: 0, min: 0, max: 5 },
  ratingCount: { type: Number, default: 0, min: 0 },
  // ─────────────────────────────────────────────────────────────────────────

}, { timestamps: true });

productSchema.index({ isDeleted: 1 });

const ProductModel = mongoose.model("Product", productSchema);
export default ProductModel;
