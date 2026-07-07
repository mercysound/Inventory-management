// CartProductSearch.jsx
// Collapsible "Add more products to cart" panel.
// - Fires window.dispatchEvent("ordersUpdated") to silently refresh the parent cart
//   WITHOUT causing a re-render of this component — panel stays open always.
// - Scrolls itself into view just below the sticky header when opened.
// - Shows − qty + controls when product already in cart.
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Plus, Minus, ShoppingCart, Package, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "react-toastify";
import axiosInstance from "../../../utils/axiosInstance";

const useDebounce = (val, delay) => {
  const [d, setD] = useState(val);
  useEffect(() => {
    const t = setTimeout(() => setD(val), delay);
    return () => clearTimeout(t);
  }, [val, delay]);
  return d;
};

// ── Single product result row ─────────────────────────────────────────────────
const ProductResult = ({ product, priceMode, cartQty, onAdd, onDecrease, busy }) => {
  const oos   = product.stock === 0;
  const price = priceMode === "wholesale"
    ? (product.wholesalePrice ?? product.price)
    : product.price;
  const inCart = cartQty > 0;

  return (
    <div className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 last:border-0
      hover:bg-gray-50 transition ${oos ? "opacity-60" : ""}`}>

      {/* Thumbnail */}
      <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center shrink-0 border border-gray-100 mt-0.5">
        {product.image || product.images?.[0] ? (
          <img src={product.image || product.images[0]} alt={product.name}
            className="w-full h-full object-contain p-0.5" loading="lazy" />
        ) : (
          <Package size={18} className="text-gray-300" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 leading-snug">{product.name}</p>
        <p className="text-[11px] text-indigo-600 font-medium">{product.categoryId?.name || "—"}</p>
        {product.description && (
          <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">{product.description}</p>
        )}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-sm font-bold text-gray-900">₦{Number(price).toLocaleString()}</span>
          {oos ? (
            <span className="text-[10px] font-bold text-red-500 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">Out of stock</span>
          ) : (
            <span className="text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
              {product.stock} in stock
            </span>
          )}
          {inCart && (
            <span className="text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
              ✓ {cartQty} in cart
            </span>
          )}
        </div>
      </div>

      {/* Qty controls */}
      <div className="shrink-0 flex items-center gap-1 mt-1">
        {busy ? (
          <Loader2 size={16} className="animate-spin text-gray-400" />
        ) : inCart ? (
          <div className="flex items-center gap-1 bg-green-50 border border-green-200 rounded-xl px-1.5 py-1">
            <button onClick={() => onDecrease(product)}
              className="w-7 h-7 rounded-lg bg-white border border-red-200 text-red-500 hover:bg-red-50 flex items-center justify-center transition active:scale-90">
              <Minus size={12} />
            </button>
            <span className="font-bold text-green-800 text-sm w-5 text-center select-none">{cartQty}</span>
            <button onClick={() => onAdd(product)} disabled={oos || cartQty >= product.stock}
              className="w-7 h-7 rounded-lg bg-green-600 hover:bg-green-700 text-white flex items-center justify-center transition active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed">
              <Plus size={12} />
            </button>
          </div>
        ) : (
          <button onClick={() => !oos && onAdd(product)} disabled={oos}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition
              ${oos ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700 text-white shadow-sm shadow-green-200 active:scale-95"}`}>
            <Plus size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const CartProductSearch = ({ priceMode = "retail", cartMap = {} }) => {
  // NOTE: no onCartUpdated prop — the component fires ordersUpdated event directly
  // so the parent never re-renders this component, keeping open state stable.
  const [open,         setOpen]         = useState(false);
  const [query,        setQuery]        = useState("");
  const [results,      setResults]      = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [busyId,       setBusyId]       = useState(null);
  const [allProducts,  setAllProducts]  = useState([]);
  const [localCartMap, setLocalCartMap] = useState({});

  const panelRef   = useRef(null); // used to scroll into view on open
  const inputRef   = useRef(null);
  const debouncedQ = useDebounce(query, 300);

  // Sync localCartMap when parent cartMap prop changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setLocalCartMap(cartMap); }, [JSON.stringify(cartMap)]);

  // Fetch all products once on first open
  const fetchProducts = async () => {
    if (allProducts.length > 0) return;
    try {
      setLoading(true);
      const res = await axiosInstance.get("/products");
      if (res.data.success) setAllProducts(res.data.products || []);
    } catch { /* silently fail */ }
    finally { setLoading(false); }
  };

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      fetchProducts();
      // Scroll the panel into view below the sticky header after animation
      setTimeout(() => {
        if (!panelRef.current) return;
        const el       = document.getElementById("main-scroll");
        const sticky   = document.querySelector("[data-cart-sticky]");
        const stickyH  = sticky?.offsetHeight || 0;
        const rect     = panelRef.current.getBoundingClientRect();
        const container = el || window;
        const scrollTop = el ? el.scrollTop : window.scrollY;
        const target    = scrollTop + rect.top - stickyH - 8;
        if (el) el.scrollTo({ top: target, behavior: "smooth" });
        else window.scrollTo({ top: target, behavior: "smooth" });
      }, 260); // wait for animation to finish
    }
  };

  // Focus input when panel opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 140);
  }, [open]);

  // Filter results
  useEffect(() => {
    if (!debouncedQ.trim()) { setResults([]); return; }
    const q = debouncedQ.toLowerCase();
    setResults(
      allProducts.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.categoryId?.name || "").toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q)
      ).slice(0, 12)
    );
  }, [debouncedQ, allProducts]);

  // ── Cart mutation — fires global event, never re-renders parent ───────────
  const setQty = async (product, newQty) => {
    const pid   = product._id;
    const isWS  = priceMode === "wholesale";
    const price = isWS ? (product.wholesalePrice ?? product.price) : product.price;

    // Optimistic local update — panel stays open, no parent re-render
    setLocalCartMap(prev => {
      if (newQty <= 0) { const n = { ...prev }; delete n[pid]; return n; }
      return { ...prev, [pid]: { ...(prev[pid] || {}), quantity: newQty } };
    });

    setBusyId(pid);
    try {
      await axiosInstance.put(`/orders/qty/${pid}`, { quantity: newQty, price, priceMode });
      // Silent parent cart refresh — does NOT remount this component
      try {
        window.dispatchEvent(new CustomEvent("ordersUpdated", { detail: { _source: "cartSearch" } }));
      } catch (_) {}
    } catch (err) {
      setLocalCartMap(cartMap); // rollback
      toast.error(err?.response?.data?.message || "Cart update failed");
    } finally {
      setBusyId(null);
    }
  };

  const handleAdd = async (product) => {
    const current = localCartMap[product._id]?.quantity || 0;
    if (current >= product.stock) { toast.warning("Cannot exceed available stock"); return; }
    if (current === 0) toast.success(`${product.name} added!`, { autoClose: 1400 });
    await setQty(product, current + 1);
    // Panel STAYS OPEN — never close
  };

  const handleDecrease = async (product) => {
    const current = localCartMap[product._id]?.quantity || 0;
    if (current <= 0) return;
    await setQty(product, current - 1);
  };

  return (
    <div ref={panelRef} className="mb-4">
      {/* Toggle button — sticky so always reachable to collapse the panel */}
      <div className="sticky z-10 bg-white pb-1" style={{ top: "var(--cart-sticky-h, 0px)" }}>
        <button onClick={handleToggle}
          className="w-full flex items-center justify-between px-4 py-3 rounded-2xl
            bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200
            hover:from-indigo-100 hover:to-blue-100 transition">
          <span className="flex items-center gap-2 text-sm font-semibold text-indigo-700">
            <ShoppingCart size={15} className="text-indigo-500" />
            + Add more products to cart
          </span>
          {open ? <ChevronUp size={16} className="text-indigo-400" /> : <ChevronDown size={16} className="text-indigo-400" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2 bg-white border border-gray-200 rounded-2xl shadow-md overflow-hidden">
              {/* Search input */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
                <Search size={15} className="text-gray-400 shrink-0" />
                <input ref={inputRef} type="text" value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search products by name or category…"
                  className="flex-1 text-sm outline-none bg-transparent placeholder:text-gray-400" />
                {query && (
                  <button onClick={() => setQuery("")} className="text-gray-400 hover:text-gray-600 transition">
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Results */}
              {loading ? (
                <div className="flex items-center justify-center py-10 gap-2 text-gray-400 text-sm">
                  <Loader2 size={16} className="animate-spin" /> Loading products…
                </div>
              ) : !query.trim() ? (
                <div className="py-8 text-center text-gray-400 text-sm">
                  <Search size={24} className="mx-auto mb-2 opacity-30" />
                  Type a product name or category to search
                </div>
              ) : results.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-sm">
                  <Package size={24} className="mx-auto mb-2 opacity-30" />
                  No products match "<span className="text-gray-600 font-medium">{query}</span>"
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto overscroll-contain">
                  {results.map(p => (
                    <ProductResult key={p._id} product={p} priceMode={priceMode}
                      cartQty={localCartMap[p._id]?.quantity || 0}
                      onAdd={handleAdd} onDecrease={handleDecrease}
                      busy={busyId === p._id} />
                  ))}
                </div>
              )}

              {results.length > 0 && (
                <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-center">
                  <p className="text-[10px] text-gray-400">
                    {results.length} result{results.length !== 1 ? "s" : ""} · tap + to add · − to remove
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CartProductSearch;
