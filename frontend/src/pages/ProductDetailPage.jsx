// src/pages/ProductDetailPage.jsx
// Full-page product detail at /product/:id.
// Accessible without login (public). Logged-in users see their role's price.
// Features: gallery, variants, qty stepper, add to cart, share, reviews/ratings.

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ChevronLeft, ChevronRight, Heart, Loader2,
  Minus, Package, Plus, Share2, ShoppingCart, Star,
  Tag, Check, LogIn, AlertTriangle, Send,
} from "lucide-react";
import { toast } from "react-toastify";
import axiosInstance from "../utils/axiosInstance";
import { useAuth } from "../context/AuthContext";
import { useFavorites } from "../hooks/useFavorites";

// ── Star rating display ───────────────────────────────────────────────────────
const StarRating = ({ value = 0, max = 5, interactive = false, onChange }) => (
  <div className="flex items-center gap-0.5">
    {Array.from({ length: max }, (_, i) => i + 1).map(n => (
      <button key={n} type={interactive ? "button" : undefined}
        onClick={() => interactive && onChange?.(n)}
        className={interactive ? "cursor-pointer" : "cursor-default"}
        aria-label={interactive ? `Rate ${n} star${n > 1 ? "s" : ""}` : undefined}>
        <Star size={interactive ? 22 : 14}
          className={n <= Math.round(value)
            ? "text-amber-400 fill-amber-400"
            : "text-gray-200 fill-gray-200"}
        />
      </button>
    ))}
  </div>
);

// ── Image gallery ─────────────────────────────────────────────────────────────
const Gallery = ({ images = [], name = "" }) => {
  const [idx, setIdx] = useState(0);
  const imgs = images.filter(Boolean);

  if (imgs.length === 0) return (
    <div className="w-full aspect-square bg-gradient-to-br from-gray-100 to-gray-200
      rounded-2xl flex items-center justify-center">
      <Package size={64} className="text-gray-300" />
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Main image */}
      <div className="relative w-full aspect-square bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
        <AnimatePresence mode="wait" initial={false}>
          <motion.img key={idx} src={imgs[idx]} alt={`${name} ${idx + 1}`}
            className="w-full h-full object-contain p-4"
            initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }} />
        </AnimatePresence>
        {imgs.length > 1 && (
          <>
            <button onClick={() => setIdx(i => (i - 1 + imgs.length) % imgs.length)}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full
                bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition">
              <ChevronLeft size={18} />
            </button>
            <button onClick={() => setIdx(i => (i + 1) % imgs.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full
                bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition">
              <ChevronRight size={18} />
            </button>
            <span className="absolute bottom-3 right-3 text-[11px] font-bold bg-black/40
              text-white px-2 py-0.5 rounded-full">
              {idx + 1}/{imgs.length}
            </span>
          </>
        )}
      </div>
      {/* Thumbnails */}
      {imgs.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {imgs.map((src, i) => (
            <button key={i} onClick={() => setIdx(i)}
              className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition
                ${i === idx ? "border-indigo-500 shadow-sm" : "border-gray-100 hover:border-gray-300"}`}>
              <img src={src} alt="" className="w-full h-full object-contain p-1" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Review card ───────────────────────────────────────────────────────────────
const ReviewCard = ({ review }) => (
  <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
    <div className="flex items-start justify-between gap-2 mb-1.5">
      <div>
        <p className="text-sm font-semibold text-gray-800">
          {review.userId?.name || review.userName || "Anonymous"}
        </p>
        <p className="text-[11px] text-gray-400">
          {new Date(review.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
        </p>
      </div>
      <StarRating value={review.rating} />
    </div>
    {review.title && <p className="text-sm font-semibold text-gray-700 mb-0.5">{review.title}</p>}
    {review.body  && <p className="text-sm text-gray-500 leading-relaxed">{review.body}</p>}
    {review.verified && (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-green-600 mt-2">
        <Check size={10} /> Verified purchase
      </span>
    )}
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────
const ProductDetailPage = () => {
  const { id }        = useParams();
  const navigate      = useNavigate();
  const { user }      = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites(user);

  const [product,  setProduct]  = useState(null);
  const [reviews,  setReviews]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Variant + cart state
  const [selectedVariant, setSelectedVariant] = useState(null); // null = no variant selected / no variants
  const [qty,             setQty]             = useState(1);
  const [addingToCart,    setAddingToCart]     = useState(false);
  const [cartSuccess,     setCartSuccess]      = useState(false);

  // Review form
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating,   setReviewRating]   = useState(0);
  const [reviewTitle,    setReviewTitle]    = useState("");
  const [reviewBody,     setReviewBody]     = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  // ── Fetch product ──────────────────────────────────────────────────────────
  const fetchProduct = useCallback(async () => {
    try {
      setLoading(true);
      // Try authenticated endpoint first (gives full data for logged-in users),
      // fall back to public endpoint for guests.
      let res;
      if (user) {
        res = await axiosInstance.get(`/products/${id}/detail`);
      } else {
        res = await axiosInstance.get(`/products/public/${id}`);
      }
      if (res.data.success) {
        setProduct(res.data.product);
        setReviews(res.data.reviews || []);
        // Auto-select first available variant
        const avail = (res.data.product.variants || []).filter(v => v.stock > 0);
        if (avail.length > 0) setSelectedVariant(avail[0]);
      } else {
        setNotFound(true);
      }
    } catch (err) {
      if (err?.response?.status === 404) setNotFound(true);
      else toast.error("Failed to load product");
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => { fetchProduct(); }, [fetchProduct]);

  // ── Derived values ─────────────────────────────────────────────────────────
  const effectivePrice = () => {
    if (selectedVariant?.price != null) return selectedVariant.price;
    if (!product) return 0;
    const isWholesale = user?.role === "wholesale";
    return isWholesale ? (product.wholesalePrice ?? product.price) : product.price;
  };

  const maxQty = () => {
    if (selectedVariant) return selectedVariant.stock;
    return product?.stock ?? 0;
  };

  const availableVariants = (product?.variants || []).filter(v => v.stock > 0);
  const outOfStock = product ? (availableVariants.length > 0 ? false : product.stock === 0) : false;

  // ── Share ──────────────────────────────────────────────────────────────────
  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: product?.name, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url).catch(() => {});
      toast.success("Link copied to clipboard!");
    }
  };

  // ── Add to cart ────────────────────────────────────────────────────────────
  const handleAddToCart = async () => {
    if (!user) {
      toast.info("Sign in to place an order");
      navigate("/login");
      return;
    }
    if (availableVariants.length > 0 && !selectedVariant) {
      toast.warning("Please select a variant first");
      return;
    }
    if (qty < 1 || qty > maxQty()) {
      toast.warning("Invalid quantity");
      return;
    }
    setAddingToCart(true);
    try {
      const price = effectivePrice();
      const isWholesale = user?.role === "wholesale";
      await axiosInstance.put(`/orders/qty/${product._id}`, {
        quantity:  qty,
        price,
        priceMode: isWholesale ? "wholesale" : "retail",
        variantId: selectedVariant?._id || null,
      });
      setCartSuccess(true);
      toast.success("Added to cart!");
      setTimeout(() => setCartSuccess(false), 2500);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to add to cart");
    } finally {
      setAddingToCart(false);
    }
  };

  // ── Submit review ──────────────────────────────────────────────────────────
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!user) { navigate("/login"); return; }
    if (reviewRating < 1) { toast.warning("Please select a rating"); return; }
    setSubmittingReview(true);
    try {
      await axiosInstance.post(`/favorites/reviews/${id}`, {
        rating: reviewRating, title: reviewTitle, body: reviewBody,
      });
      toast.success("Review submitted!");
      setShowReviewForm(false);
      setReviewRating(0); setReviewTitle(""); setReviewBody("");
      fetchProduct(); // refresh reviews + rating
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to submit review");
    } finally {
      setSubmittingReview(false);
    }
  };

  // ── Loading / not found ────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 size={32} className="animate-spin text-indigo-500" />
    </div>
  );

  if (notFound || !product) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
      <Package size={48} className="text-gray-300" />
      <p className="text-lg font-semibold text-gray-500">Product not found</p>
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-indigo-600 hover:underline text-sm">
        <ArrowLeft size={14} /> Go back
      </button>
    </div>
  );

  const price = effectivePrice();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav bar */}
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-gray-600 hover:text-indigo-600 text-sm font-medium transition">
          <ArrowLeft size={16} /> Back
        </button>
          <div className="flex items-center gap-2">
            <button onClick={handleShare}
              className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center
                text-gray-500 hover:text-indigo-600 hover:border-indigo-300 transition"
              aria-label="Share product">
              <Share2 size={15} />
            </button>
            <button onClick={() => {
                toggleFavorite(product._id);
                if (!user) toast.info("Sign in to save favorites permanently", { toastId: "fav-hint", autoClose: 3000 });
              }}
              className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center transition
                hover:border-red-300"
              aria-label={isFavorite(product._id) ? "Remove from favorites" : "Add to favorites"}>
              <Heart size={15} className={isFavorite(product._id) ? "text-red-500 fill-red-500" : "text-gray-400"} />
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

          {/* ── Gallery ─────────────────────────────────────────────────── */}
          <div className="lg:sticky lg:top-20">
            <Gallery images={product.images || []} name={product.name} />
          </div>

          {/* ── Product info ─────────────────────────────────────────────── */}
          <div className="space-y-5">

            {/* Category + badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100
                px-3 py-1 rounded-full uppercase tracking-wide">
                <Tag size={10} className="inline mr-1" />{product.categoryId?.name || "—"}
              </span>
              {product.isNewArrival && (
                <span className="text-xs font-bold bg-indigo-600 text-white px-2.5 py-1 rounded-full">✨ New Arrival</span>
              )}
              {product.isBonanza && (
                <span className="text-xs font-bold bg-orange-500 text-white px-2.5 py-1 rounded-full">🎉 Special Deal</span>
              )}
            </div>

            {/* Name */}
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight">
              {product.name}
            </h1>

            {/* Rating summary */}
            {product.ratingCount > 0 && (
              <div className="flex items-center gap-2">
                <StarRating value={product.ratingAvg} />
                <span className="text-sm text-gray-500">
                  {product.ratingAvg?.toFixed(1)} ({product.ratingCount} review{product.ratingCount !== 1 ? "s" : ""})
                </span>
              </div>
            )}

            {/* Description */}
            {product.description && (
              <p className="text-gray-600 text-sm leading-relaxed">{product.description}</p>
            )}

            {/* Variants */}
            {availableVariants.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Select variant
                </p>
                <div className="flex flex-wrap gap-2">
                  {availableVariants.map(v => (
                    <button key={v._id}
                      onClick={() => setSelectedVariant(v)}
                      className={`px-3.5 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${
                        selectedVariant?._id === v._id
                          ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                          : "border-gray-200 text-gray-700 hover:border-gray-300"
                      }`}>
                      {v.label || v.value}
                      {v.price != null && (
                        <span className="ml-1.5 text-xs text-gray-400">₦{Number(v.price).toLocaleString()}</span>
                      )}
                    </button>
                  ))}
                </div>
                {(product.variants || []).filter(v => v.stock === 0).length > 0 && (
                  <p className="text-xs text-gray-400 mt-1.5">
                    {(product.variants || []).filter(v => v.stock === 0).map(v => v.label || v.value).join(", ")} — out of stock
                  </p>
                )}
              </div>
            )}

            {/* Price */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100 rounded-2xl px-5 py-4">
              <p className="text-3xl font-extrabold text-gray-900">
                ₦{Number(price).toLocaleString()}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {user?.role === "wholesale" ? "Wholesale price" : "Retail price"} · per unit
              </p>
            </div>

            {/* Stock */}
            {!outOfStock ? (
              <p className="text-sm text-green-600 font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                {selectedVariant
                  ? `${selectedVariant.stock} available (${selectedVariant.label || selectedVariant.value})`
                  : `${product.stock} in stock`}
              </p>
            ) : (
              <p className="text-sm text-red-500 font-semibold flex items-center gap-1.5">
                <AlertTriangle size={14} /> Out of stock
              </p>
            )}

            {/* Qty stepper + Add to cart */}
            {!outOfStock && (
              <div className="flex items-center gap-3">
                {/* Stepper */}
                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-2 py-1.5 shadow-sm">
                  <button onClick={() => setQty(q => Math.max(1, q - 1))} disabled={qty <= 1}
                    className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center
                      text-gray-600 hover:bg-gray-50 disabled:opacity-30 transition">
                    <Minus size={14} />
                  </button>
                  <span className="w-8 text-center font-bold text-gray-800 text-base select-none">{qty}</span>
                  <button onClick={() => setQty(q => Math.min(maxQty(), q + 1))} disabled={qty >= maxQty()}
                    className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center
                      text-gray-600 hover:bg-gray-50 disabled:opacity-30 transition">
                    <Plus size={14} />
                  </button>
                </div>

                {/* Add to cart button */}
                <motion.button onClick={handleAddToCart} disabled={addingToCart}
                  whileTap={{ scale: 0.97 }}
                  className={`flex-1 py-3.5 rounded-2xl font-bold text-sm text-white flex items-center
                    justify-center gap-2 transition shadow-md ${
                    cartSuccess
                      ? "bg-green-500 shadow-green-200"
                      : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 disabled:opacity-60"
                  }`}>
                  {addingToCart ? (
                    <><Loader2 size={16} className="animate-spin" /> Adding…</>
                  ) : cartSuccess ? (
                    <><Check size={16} /> Added to cart!</>
                  ) : user ? (
                    <><ShoppingCart size={16} /> Add to Cart · ₦{Number(price * qty).toLocaleString()}</>
                  ) : (
                    <><LogIn size={16} /> Sign in to order</>
                  )}
                </motion.button>
              </div>
            )}

            {/* Go to cart link (if logged in) */}
            {user && (
              <div className="text-center">
                <Link
                  to={user.role === "wholesale" ? "/wholesale-dashboard/orders"
                    : user.role === "staff" ? "/customer-dashboard/orders"
                    : "/user-dashboard/orders"}
                  className="text-sm text-indigo-600 hover:text-indigo-800 font-medium hover:underline transition">
                  View cart →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* ── Reviews section ──────────────────────────────────────────────── */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-gray-900">
              Reviews {product.ratingCount > 0 && <span className="text-gray-400 font-normal text-base">({product.ratingCount})</span>}
            </h2>
            {user && (
              <button onClick={() => setShowReviewForm(p => !p)}
                className="px-4 py-2 rounded-xl border border-indigo-200 text-indigo-600 text-sm
                  font-semibold hover:bg-indigo-50 transition">
                {showReviewForm ? "Cancel" : "Write a review"}
              </button>
            )}
            {!user && (
              <Link to="/login" className="flex items-center gap-1.5 text-sm text-indigo-600 hover:underline">
                <LogIn size={13} /> Sign in to review
              </Link>
            )}
          </div>

          {/* Review form */}
          <AnimatePresence>
            {showReviewForm && (
              <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
                onSubmit={handleSubmitReview}
                className="bg-white border border-indigo-100 rounded-2xl p-5 mb-6 shadow-sm overflow-hidden">
                <p className="text-sm font-semibold text-gray-800 mb-3">Your rating</p>
                <StarRating value={reviewRating} interactive onChange={setReviewRating} />
                <input type="text" placeholder="Review title (optional)" value={reviewTitle}
                  onChange={e => setReviewTitle(e.target.value)} maxLength={120}
                  className="mt-3 w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm
                    focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                <textarea placeholder="Write your review…" value={reviewBody}
                  onChange={e => setReviewBody(e.target.value)} rows={3} maxLength={1000}
                  className="mt-2 w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm
                    resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                <div className="flex gap-2 mt-3">
                  <button type="submit" disabled={submittingReview || reviewRating < 1}
                    className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700
                      disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition">
                    {submittingReview ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    Submit
                  </button>
                  <button type="button" onClick={() => setShowReviewForm(false)}
                    className="px-4 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50 transition">
                    Cancel
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Reviews list */}
          {reviews.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <Star size={32} className="mx-auto mb-2 text-gray-200" />
              <p className="text-sm">No reviews yet. Be the first!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map(r => <ReviewCard key={r._id} review={r} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;
