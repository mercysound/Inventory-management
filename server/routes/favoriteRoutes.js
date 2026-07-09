// server/routes/favoriteRoutes.js
import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  getFavorites,
  getFavoriteIds,
  toggleFavorite,
  syncGuestFavorites,
  submitReview,
} from "../controllers/favoriteController.js";

const router = express.Router();

// All routes require a logged-in user
router.use(authMiddleware);

// ── Favorites ─────────────────────────────────────────────────────────────────
router.get("/",              getFavorites);
router.get("/ids",           getFavoriteIds);
router.post("/sync",         syncGuestFavorites);
router.post("/:productId",   toggleFavorite);

// ── Reviews (lives here since reviews are tied to favorites/product interest) ──
router.post("/reviews/:productId", submitReview);

export default router;
