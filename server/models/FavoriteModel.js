// server/models/FavoriteModel.js
import mongoose from "mongoose";

const favoriteSchema = new mongoose.Schema(
  {
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
      index:    true,
    },
    productId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "Product",
      required: true,
    },
  },
  { timestamps: true }
);

// One favorite per user per product
favoriteSchema.index({ userId: 1, productId: 1 }, { unique: true });

const FavoriteModel = mongoose.model("Favorite", favoriteSchema);
export default FavoriteModel;
