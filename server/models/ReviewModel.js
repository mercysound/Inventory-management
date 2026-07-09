// server/models/ReviewModel.js
import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    productId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "Product",
      required: true,
      index:    true,
    },
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
    },
    // Stored for display without a join when userId is populated
    userName:    { type: String, default: "" },

    rating:  { type: Number, required: true, min: 1, max: 5 },
    title:   { type: String, trim: true, maxlength: 120, default: "" },
    body:    { type: String, trim: true, maxlength: 1000, default: "" },

    // Admin can approve / hide reviews
    approved: { type: Boolean, default: true },

    // Has this user actually purchased the product?
    verified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// One review per user per product
reviewSchema.index({ productId: 1, userId: 1 }, { unique: true });

const ReviewModel = mongoose.model("Review", reviewSchema);
export default ReviewModel;
