// src/pages/PublicShop.jsx
import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import {
  ShoppingCart, Search, Package, X, Heart, Star,
  ShoppingBag, LogIn, UserPlus, Loader2, Wrench,
  Minus, Plus, Trash2, ArrowRight,
} from "lucide-react";
import { toast } from "react-toastify";
import axiosInstance from "../utils/axiosInstance";
import { useAuth } from "../context/AuthContext";
import { useFavorites } from "../hooks/useFavorites";
import { useMaintenance } from "../hooks/useMaintenance";

const PRODUCTS_PER_PAGE = 20;
const GUEST_CART_KEY    = "melech_guest_cart";

// ── Guest cart helpers ────────────────────────────────────────────────────────
// Each item: { productId, quantity, name, price, image, stock, categoryName }
const readGuestCart = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(GUEST_CART_KEY) || "[]");
    // Filter out old-format entries that have no product details (name/price missing)
    // so stale localStorage entries don't cause NaN display
    return raw.filter(i => i.productId && i.name && typeof i.price === "number");
  } catch { return []; }
};
const writeGuestCart = (items) => { try { localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items)); } catch {} };

export const getGuestCartCount = () => readGuestCart().reduce((s, i) => s + i.quantity, 0);

// ── Star rating ───────────────────────────────────────────────────────────────
const Stars = ({ avg = 0, count = 0 }) => {
  if (!count) return null;
  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[1,2,3,4,5].map(n => (
          <Star key={n} size={10}
            className={n <= Math.round(avg) ? "text-amber-400 fill-amber-400" : "text-gray-200 fill-gray-200"} />
        ))}
      </div>
      <span className="text-[10px] text-gray-400">({count})</span>
    </div>
  );
};

// ── Product card ──────────────────────────────────────────────────────────────
const ProductCard = ({ product, isFav, onToggleFav, onViewDetail, onAddToCart, onIncrease, onDecrease, cartQty }) => {
  const thumb  = product.images?.[0] || product.image || null;
  const inCart = cartQty > 0;
  const oos    = product.stock === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="relative group bg-white rounded-2xl border border-gray-100 shadow-sm
        hover:shadow-md hover:-translate-y-0.5 transition-all duration-200
        overflow-hidden cursor-pointer flex flex-col"
      onClick={() => onViewDetail(product)}
    >
      {/* Image */}
      <div className="relative w-full h-36 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden shrink-0">
        {thumb
          ? <img src={thumb} alt={product.name} loading="lazy"
              className="w-full h-full object-contain p-1 group-hover:scale-105 transition-transform duration-300" />
          : <div className="w-full h-full flex items-center justify-center">
              <Package size={32} className="text-gray-200" />
            </div>
        }
        {product.isBonanza && (
          <span className="absolute top-2 left-2 text-[9px] font-bold bg-orange-500 text-white px-2 py-0.5 rounded-full">🎉 DEAL</span>
        )}
        {!product.isBonanza && product.isNewArrival && (
          <span className="absolute top-2 left-2 text-[9px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-full">✨ NEW</span>
        )}
        {inCart && (
          <div className="absolute top-2 right-8 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            ×{cartQty}
          </div>
        )}
        <button
          onClick={e => { e.stopPropagation(); onToggleFav(product._id); }}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/80 backdrop-blur-sm
            flex items-center justify-center shadow-sm hover:scale-110 transition"
        >
          <Heart size={13} className={isFav ? "text-red-500 fill-red-500" : "text-gray-400"} />
        </button>
        {oos && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
            <span className="bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-full">Out of stock</span>
          </div>
        )}
      </div>
      {/* Body */}
      <div className="p-2.5 flex flex-col gap-1.5 flex-1">
        <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100
          px-2 py-0.5 rounded-full w-fit truncate uppercase tracking-wide">
          {product.categoryId?.name || "—"}
        </span>
        <p className="font-bold text-gray-900 text-sm leading-snug line-clamp-2">{product.name}</p>
        {product.description && (
          <p className="text-[11px] text-gray-400 line-clamp-1">{product.description}</p>
        )}
        <Stars avg={product.ratingAvg} count={product.ratingCount} />
        <div className="mt-auto pt-1.5 border-t border-gray-50 flex items-center justify-between gap-2"
          onClick={e => e.stopPropagation()}>
          <div>
            <p className="font-extrabold text-gray-900 text-sm">₦{Number(product.price).toLocaleString()}</p>
            <span className="text-[9px] font-bold text-indigo-500 tracking-wide">RTP</span>
          </div>
          {inCart ? (
            <div className="flex items-center gap-1">
              <button onClick={e => { e.stopPropagation(); onDecrease(product._id); }}
                className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition">
                <Minus size={11} />
              </button>
              <span className="text-sm font-bold text-gray-800 w-5 text-center">{cartQty}</span>
              <button onClick={e => { e.stopPropagation(); onIncrease(product); }}
                disabled={cartQty >= product.stock}
                className="w-7 h-7 rounded-lg bg-green-600 hover:bg-green-700 disabled:bg-gray-200
                  text-white flex items-center justify-center transition">
                <Plus size={11} />
              </button>
            </div>
          ) : (
            <motion.button
              onClick={e => { e.stopPropagation(); onAddToCart(product); }}
              disabled={oos}
              whileTap={{ scale: 0.9 }}
              className="w-9 h-9 rounded-xl bg-green-600 hover:bg-green-700 disabled:bg-gray-200
                text-white text-xl font-bold flex items-center justify-center shadow-sm transition"
            >+</motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ── Cart Drawer ───────────────────────────────────────────────────────────────
const CartDrawer = ({ items, onClose, onIncrease, onDecrease, onRemove, onCheckout }) => {
  const total = items.reduce((s, i) => s + (Number(i.price) || 0) * i.quantity, 0);
  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-[9999] flex justify-end"
        onClick={onClose}
      >
        <motion.div
          initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
          transition={{ type: "spring", stiffness: 380, damping: 38 }}
          onClick={e => e.stopPropagation()}
          className="bg-white w-full max-w-sm flex flex-col shadow-2xl"
          style={{ maxHeight: "100dvh" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
            <div className="flex items-center gap-2">
              <ShoppingCart size={18} className="text-indigo-600" />
              <h2 className="font-bold text-gray-900 text-base">My Cart</h2>
              <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {items.length}
              </span>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition">
              <X size={15} />
            </button>
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3">
                <ShoppingBag size={36} className="text-gray-200" />
                <p className="text-gray-400 text-sm">Your cart is empty</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {items.map(item => (
                  <div key={item.productId} className="flex items-start gap-3 px-5 py-4">
                    {item.image
                      ? <img src={item.image} alt={item.name}
                          className="w-14 h-14 rounded-xl object-contain bg-gray-50 border border-gray-100 shrink-0" />
                      : <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                          <Package size={20} className="text-gray-300" />
                        </div>
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 leading-snug line-clamp-2">{item.name || "Product"}</p>
                      {item.categoryName && (
                        <p className="text-[10px] text-indigo-500 font-semibold mt-0.5 uppercase">{item.categoryName}</p>
                      )}
                      <p className="text-sm font-bold text-green-700 mt-1">
                        ₦{Number(item.price || 0).toLocaleString()} × {item.quantity}
                      </p>
                      <p className="text-xs text-gray-400 font-medium">
                        = ₦{Number((item.price || 0) * item.quantity).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <button onClick={() => onRemove(item.productId)}
                        className="w-6 h-6 rounded-lg text-red-400 hover:bg-red-50 flex items-center justify-center transition">
                        <Trash2 size={12} />
                      </button>
                      <div className="flex items-center gap-1">
                        <button onClick={() => onDecrease(item.productId)}
                          className="w-6 h-6 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition">
                          <Minus size={10} />
                        </button>
                        <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                        <button onClick={() => onIncrease({ _id: item.productId, stock: item.stock, name: item.name, price: item.price, images: item.image ? [item.image] : [], categoryId: { name: item.categoryName } })}
                          disabled={item.quantity >= item.stock}
                          className="w-6 h-6 rounded-md bg-green-600 disabled:bg-gray-200 text-white hover:bg-green-700 flex items-center justify-center transition">
                          <Plus size={10} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="px-5 py-4 border-t border-gray-100 bg-white flex-shrink-0 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-600">Subtotal</span>
                <span className="text-lg font-extrabold text-gray-900">₦{total.toLocaleString()}</span>
              </div>
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                🔐 Sign in to place this order and track your delivery
              </p>
              <button onClick={onCheckout}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold
                  text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg transition active:scale-[.98]">
                <LogIn size={15} /> Sign in to Checkout <ArrowRight size={14} />
              </button>
              <Link to="/login?mode=register"
                className="block w-full py-2.5 border border-gray-200 text-gray-700 font-semibold
                  text-sm rounded-xl text-center hover:bg-gray-50 transition">
                New here? Create account
              </Link>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

// ── Main PublicShop component ─────────────────────────────────────────────────
const PublicShop = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites(user);

  const [products,     setProducts]     = useState([]);
  const [categories,   setCategories]   = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [guestBlocked, setGuestBlocked] = useState(false);
  const [maintenance,  setMaintenance]  = useState(null);
  const [search,       setSearch]       = useState("");
  const [catFilter,    setCatFilter]    = useState("");
  const [tab,          setTab]          = useState("all");
  const [page,         setPage]         = useState(1);
  const [cartOpen,     setCartOpen]     = useState(false);

  // Full guest cart with product details
  const [guestCart, setGuestCart] = useState(readGuestCart);

  // Redirect logged-in users
  useEffect(() => {
    if (!user) return;
    const map = { admin: "/admin-dashboard", staff: "/customer-dashboard", wholesale: "/wholesale-dashboard", customer: "/user-dashboard" };
    navigate(map[user.role] || "/user-dashboard", { replace: true });
  }, [user, navigate]);

  useMaintenance({ onMaintenance: msg => setMaintenance(msg), onMaintenanceEnded: () => setMaintenance(null) });

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/products/public");
      if (res.data.success) { setProducts(res.data.products || []); setCategories(res.data.categories || []); }
    } catch (err) {
      if (err?.response?.status === 403) setGuestBlocked(true);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // Persist cart
  useEffect(() => { writeGuestCart(guestCart); }, [guestCart]);

  // Cart helpers
  const getQty = (productId) => guestCart.find(i => i.productId === productId)?.quantity || 0;

  const handleAddToCart = (product) => {
    const existing = guestCart.find(i => i.productId === product._id);
    if (existing) {
      if (existing.quantity >= product.stock) { toast.warning("Maximum stock reached"); return; }
      setGuestCart(prev => prev.map(i => i.productId === product._id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      const item = {
        productId:    product._id,
        quantity:     1,
        name:         product.name,
        price:        product.price,
        image:        product.images?.[0] || product.image || null,
        stock:        product.stock,
        categoryName: product.categoryId?.name || "",
      };
      setGuestCart(prev => [...prev, item]);
    }
    toast.success(`${product.name} added to cart`, { autoClose: 1500 });
  };

  const handleIncrease = (product) => {
    const current = getQty(product._id);
    if (current >= product.stock) { toast.warning("Maximum stock reached"); return; }
    setGuestCart(prev => prev.map(i => i.productId === product._id ? { ...i, quantity: i.quantity + 1 } : i));
  };

  const handleDecrease = (productId) => {
    setGuestCart(prev => {
      const item = prev.find(i => i.productId === productId);
      if (!item) return prev;
      if (item.quantity <= 1) return prev.filter(i => i.productId !== productId);
      return prev.map(i => i.productId === productId ? { ...i, quantity: i.quantity - 1 } : i);
    });
  };

  const handleRemove = (productId) => {
    setGuestCart(prev => prev.filter(i => i.productId !== productId));
  };

  const handleViewDetail = (product) => navigate(`/product/${product._id}`);

  const handleToggleFav = (productId) => {
    toggleFavorite(productId);
    if (!user) toast.info("Sign in to save favorites", { toastId: "fav-hint", autoClose: 2500 });
  };

  const handleCheckout = () => {
    setCartOpen(false);
    navigate("/login?ref=cart");
  };

  // Filters
  const filtered = products
    .filter(p => tab === "new" ? p.isNewArrival : tab === "bonanza" ? p.isBonanza : true)
    .filter(p => catFilter ? (p.categoryId?._id || p.categoryId) === catFilter : true)
    .filter(p => search ? p.name.toLowerCase().includes(search.toLowerCase()) : true);

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PRODUCTS_PER_PAGE));
  const paginated   = filtered.slice((page - 1) * PRODUCTS_PER_PAGE, page * PRODUCTS_PER_PAGE);
  const cartCount   = guestCart.reduce((s, i) => s + i.quantity, 0);
  const newCount    = products.filter(p => p.isNewArrival).length;
  const bonanzaCount = products.filter(p => p.isBonanza).length;

  if (maintenance) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
          <Wrench size={28} className="text-amber-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Under Maintenance</h1>
        <p className="text-gray-500 text-sm leading-relaxed">{maintenance}</p>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f9fafb]">
      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-lg border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow">
              <ShoppingCart size={15} className="text-white" />
            </div>
            <span className="font-bold text-gray-900 text-base tracking-tight hidden sm:block">
              Melech<span className="text-indigo-500"> Hub</span>
            </span>
          </Link>

          <div className="flex-1 max-w-sm relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search products…"
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl
                focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50" />
            {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2"><X size={13} className="text-gray-400" /></button>}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Cart button — always shown, even when empty */}
            <button onClick={() => setCartOpen(true)}
              className="relative flex items-center gap-1.5 px-3 py-2 rounded-xl
                bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition">
              <ShoppingCart size={14} />
              <span className="hidden sm:inline">Cart</span>
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500
                  text-white text-[9px] font-bold flex items-center justify-center">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </button>
            <Link to="/login"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200
                text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">
              <LogIn size={13} /> <span className="hidden sm:inline">Sign In</span>
            </Link>
            <Link to="/login?mode=register"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl
                bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition shadow-sm">
              <UserPlus size={13} /> <span className="hidden sm:inline">Sign Up</span>
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {guestBlocked ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center mb-4">
              <LogIn size={28} className="text-indigo-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Sign in to browse products</h2>
            <p className="text-gray-500 text-sm mb-6">The store owner requires an account to view products.</p>
            <div className="flex gap-3">
              <Link to="/login" className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition">Sign In</Link>
              <Link to="/login?mode=register" className="px-6 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition">Create Account</Link>
            </div>
          </div>
        ) : (
          <>
            {/* Tabs + category */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <div className="flex gap-1.5 bg-white border border-gray-100 rounded-xl p-1 shadow-sm">
                {[
                  { id: "all",     label: `All (${products.length})` },
                  { id: "new",     label: `✨ New (${newCount})`,        show: newCount > 0 },
                  { id: "bonanza", label: `🎉 Deals (${bonanzaCount})`,  show: bonanzaCount > 0 },
                ].filter(t => t.show !== false).map(t => (
                  <button key={t.id} onClick={() => { setTab(t.id); setPage(1); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      tab === t.id ? "bg-indigo-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-50"
                    }`}>{t.label}</button>
                ))}
              </div>
              <select value={catFilter} onChange={e => { setCatFilter(e.target.value); setPage(1); }}
                className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 text-gray-700 shadow-sm">
                <option value="">All Categories</option>
                {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>

            {!loading && (
              <p className="text-xs text-gray-400 mb-4">
                {filtered.length} product{filtered.length !== 1 ? "s" : ""}
                {search && <span> for "<strong>{search}</strong>"</span>}
              </p>
            )}

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 animate-pulse">
                    <div className="h-36 bg-gray-100 rounded-t-2xl" />
                    <div className="p-2.5 space-y-2">
                      <div className="h-2.5 bg-gray-100 rounded w-16" />
                      <div className="h-3 bg-gray-100 rounded w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : paginated.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Package size={40} className="text-gray-200 mb-3" />
                <p className="text-gray-400 font-medium">No products found</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {paginated.map(p => (
                  <ProductCard key={p._id} product={p}
                    isFav={isFavorite(p._id)}
                    onToggleFav={handleToggleFav}
                    onViewDetail={handleViewDetail}
                    onAddToCart={handleAddToCart}
                    onIncrease={handleIncrease}
                    onDecrease={handleDecrease}
                    cartQty={getQty(p._id)}
                  />
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-white disabled:opacity-30 transition">← Prev</button>
                <span className="text-sm text-gray-500 font-medium px-2">{page} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-white disabled:opacity-30 transition">Next →</button>
              </div>
            )}

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="mt-10 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-6 text-center text-white shadow-lg">
              <ShoppingBag size={28} className="mx-auto mb-2 opacity-80" />
              <h3 className="text-lg font-bold mb-1">Ready to order?</h3>
              <p className="text-indigo-200 text-sm mb-4">Sign in or create an account to place orders and track your purchases.</p>
              <div className="flex gap-3 justify-center">
                <Link to="/login?mode=register"
                  className="px-5 py-2.5 bg-white text-indigo-700 rounded-xl font-semibold text-sm hover:bg-indigo-50 transition shadow">
                  Create Account
                </Link>
                <Link to="/login"
                  className="px-5 py-2.5 border border-white/30 text-white rounded-xl font-semibold text-sm hover:bg-white/10 transition">
                  Sign In
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </div>

      {/* Cart drawer */}
      {cartOpen && (
        <CartDrawer
          items={guestCart}
          onClose={() => setCartOpen(false)}
          onIncrease={handleIncrease}
          onDecrease={handleDecrease}
          onRemove={handleRemove}
          onCheckout={handleCheckout}
        />
      )}
    </div>
  );
};

export default PublicShop;
