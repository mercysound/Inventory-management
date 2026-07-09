// server/controllers/favoriteController.js
import FavoriteModel  from "../models/FavoriteModel.js";
import ProductModel   from "../models/ProductModel.js";
import { sendResponse, sendError } from "../utils/apiResponse.js";

// ─────────────────────────────────────────────────────────────────────────────
// GET /favorites
// Returns all favorited products for the logged-in user.
// Products that have been deleted are excluded from the response.
// ─────────────────────────────────────────────────────────────────────────────
export const getFavorites = async (req, res) => {
  try {
    const favs = await FavoriteModel.find({ userId: req.user._id })
      .populate({
        path:   "productId",
        match:  { isDeleted: false },
        select: "name price wholesalePrice images image isBonanza isNewArrival isStaffOnly stock categoryId ratingAvg ratingCount variants",
        populate: { path: "categoryId", select: "name" },
      })
      .sort({ createdAt: -1 });

    // Filter out entries where the product was deleted (populate returns null)
    const products = favs
      .filter(f => f.productId !== null)
      .map(f => {
        const p   = f.productId.toObject();
        const arr = Array.isArray(p.images) && p.images.length > 0 ? p.images : p.image ? [p.image] : [];
        p.images  = arr;
        p.favoriteId = String(f._id);
        return p;
      });

    return sendResponse(res, 200, { favorites: products }, "Favorites retrieved");
  } catch (err) {
    console.error("getFavorites error:", err.message);
    return sendError(res, 500, "Failed to fetch favorites");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /favorites/ids
// Lightweight endpoint — returns just the array of favorited productId strings.
// Used by the frontend to quickly mark heart icons on product cards.
// ─────────────────────────────────────────────────────────────────────────────
export const getFavoriteIds = async (req, res) => {
  try {
    const favs = await FavoriteModel.find({ userId: req.user._id }).select("productId");
    const ids  = favs.map(f => String(f.productId));
    return sendResponse(res, 200, { ids }, "Favorite IDs retrieved");
  } catch (err) {
    console.error("getFavoriteIds error:", err.message);
    return sendError(res, 500, "Failed to fetch favorite IDs");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /favorites/:productId
// Toggle a product in / out of favorites.
// Returns { favorited: boolean } so the client can update the heart icon.
// ─────────────────────────────────────────────────────────────────────────────
export const toggleFavorite = async (req, res) => {
  try {
    const { productId } = req.params;

    // Verify product exists
    const product = await ProductModel.findOne({ _id: productId, isDeleted: false });
    if (!product) return sendError(res, 404, "Product not found");

    const existing = await FavoriteModel.findOne({ userId: req.user._id, productId });

    if (existing) {
      await FavoriteModel.deleteOne({ _id: existing._id });
      return sendResponse(res, 200, { favorited: false }, "Removed from favorites");
    }

    await FavoriteModel.create({ userId: req.user._id, productId });
    return sendResponse(res, 201, { favorited: true }, "Added to favorites");
  } catch (err) {
    if (err.code === 11000) {
      // Race condition duplicate — treat as "already favorited"
      return sendResponse(res, 200, { favorited: true }, "Already in favorites");
    }
    console.error("toggleFavorite error:", err.message);
    return sendError(res, 500, "Failed to update favorites");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /favorites/sync
// Called after a guest logs in — merges an array of localStorage productIds
// into the user's DB favorites (skip duplicates, skip deleted products).
// Body: { productIds: string[] }
// ─────────────────────────────────────────────────────────────────────────────
export const syncGuestFavorites = async (req, res) => {
  try {
    const { productIds } = req.body;
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return sendResponse(res, 200, { synced: 0 }, "Nothing to sync");
    }

    // Only sync products that actually exist and aren't deleted
    const validProducts = await ProductModel.find({
      _id:       { $in: productIds },
      isDeleted: false,
    }).select("_id");

    const validIds = validProducts.map(p => String(p._id));

    // Get already-favorited IDs to avoid duplicate errors
    const existing = await FavoriteModel.find({
      userId:    req.user._id,
      productId: { $in: validIds },
    }).select("productId");
    const existingSet = new Set(existing.map(f => String(f.productId)));

    const toInsert = validIds
      .filter(id => !existingSet.has(id))
      .map(productId => ({ userId: req.user._id, productId }));

    if (toInsert.length > 0) {
      await FavoriteModel.insertMany(toInsert, { ordered: false });
    }

    return sendResponse(res, 200, { synced: toInsert.length }, "Guest favorites synced");
  } catch (err) {
    // insertMany with ordered:false can throw on duplicate key — still partial success
    if (err.code === 11000) {
      return sendResponse(res, 200, { synced: 0 }, "Favorites already up to date");
    }
    console.error("syncGuestFavorites error:", err.message);
    return sendError(res, 500, "Failed to sync favorites");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /favorites/reviews/:productId
// Logged-in user submits or updates a review for a product.
// Body: { rating: 1-5, title?: string, body?: string }
// ─────────────────────────────────────────────────────────────────────────────
export const submitReview = async (req, res) => {
  try {
    const { productId } = req.params;
    const { rating, title = "", body = "" } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return sendError(res, 400, "Rating must be between 1 and 5");
    }

    const product = await ProductModel.findOne({ _id: productId, isDeleted: false });
    if (!product) return sendError(res, 404, "Product not found");

    const ReviewModel = (await import("../models/ReviewModel.js")).default;

    // Upsert — one review per user per product
    const review = await ReviewModel.findOneAndUpdate(
      { productId, userId: req.user._id },
      {
        rating:   Number(rating),
        title:    String(title).trim().slice(0, 120),
        body:     String(body).trim().slice(0, 1000),
        userName: req.user.name || "",
        approved: true,
        // Mark as verified if user has a completed order for this product
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    // Recompute aggregated rating on the product
    const agg = await ReviewModel.aggregate([
      { $match: { productId: product._id, approved: true } },
      { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]);
    if (agg.length > 0) {
      await ProductModel.findByIdAndUpdate(productId, {
        ratingAvg:   Math.round(agg[0].avg * 10) / 10,
        ratingCount: agg[0].count,
      });
    }

    return sendResponse(res, 200, { review }, "Review submitted");
  } catch (err) {
    console.error("submitReview error:", err.message);
    return sendError(res, 500, "Failed to submit review");
  }
};
