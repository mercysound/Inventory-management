// CartProductSearch.jsx
// Floating search panel on the cart page that lets any user search products
// and add them directly to their cart without leaving the cart page.
//
// Behaviour:
//  - Collapsed by default; expands when user taps the "+ Add Products" button
//  - Searches in real-time (300 ms debounce)
//  - Shows in-stock products with + button; out-of-stock shown greyed with badge
//  - Respects the current price mode (retail/wholesale) passed from parent
//  - Works for customer, wholesale, and staff roles

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Plus, ShoppingCart, Package, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "react-toastify";
import axiosInstance from "../../../utils/axiosInstance";

// ── Debounce ─────────────────────────────────────────────────────────────────
const useDebounce = (val, delay) => {
  const [d, setD] = useState(val);
  useEffect(() => { const t = setTimeout(() => setD(val), delay); return () => clearTimeout(t); }, [val, delay]);
  return d;
};

// ── Single product result card ────────────────────────────────────────────────
const ProductResult = ({ product, priceMode, onAdd, adding }) => {
  const oos    = product.stock === 0;
  const price  = priceMode === "wholesale"
    ? (product.wholesalePrice ?? product.price)
    : product.price;

  return (
    <div className={`flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0
      hover:bg-gray-50 transition ${oos ? "opacity-60" : ""}`}>
      {/* Thumbnail */}
      <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center shrink-0 border border-gray-100">
        {product.image || product.images?.[0] ? (
          <img src={product.image || product.images[0]} alt={product.name}
            className="w-full h-full object-contain p-0.5" loading="lazy" />
        ) : (
          <Package size={18} className="text-gray-300" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">{product.name}</p>
        <p className="text-[11px] text-indigo-600 font-medium truncate">
          {product.categoryId?.name || "—"}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-sm font-bold text-gray-900">₦{Number(price).toLocaleString()}</span>
          {oos ? (
            <span className="text-[10px] font-bold text-red-500 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
              Out of stock
            </span>
          ) : (
            <span className="text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
              {product.stock} left
            </span>
          )}
        </div>
      </div>

      {/* Add button */}
      <button
        onClick={() => !oos && onAdd(product)}
        disabled={oos || adding}
        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition
          ${oos
            ? "bg-gray-100 text-gray-300 cursor-not-allowed"
            : "bg-green-600 hover:bg-green-700 text-white shadow-sm shadow-green-200 active:scale-95"
          }`}
      >
        {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={16} />}
      </button>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const CartProductSearch = ({ priceMode = "retail", onCartUpdated }) => {
  const [open,      setOpen]      = useState(false);
  const [query,     setQuery]     = useState("");
  const [results,   setResults]   = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [addingId,  setAddingId]  = useState(null);
  const [allProducts, setAllProducts] = useState([]);  // cached on first open
  const inputRef  = useRef(null);
  const debouncedQuery = useDebounce(query, 300);

  // Fetch all products once when panel opens for the first time
  const fetchProducts = useCallback(async () => {
    if (allProducts.length > 0) return; // already cached
    try {
      setLoading(true);
      const res = await axiosInstance.get("/products");
      if (res.data.success) {
        setAllProducts(res.data.products || []);
      }
    } catch { /* silently fail */ }
    finally { setLoading(false); }
  }, [allProducts.length]);

  // Open/close panel
  const handleToggle = () => {
    setOpen(p => !p);
    if (!open) fetchProducts();
  };

  // Filter locally — instant, no extra API calls
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      return;
    }
    const q = debouncedQuery.toLowerCase();
    const filtered = allProducts.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.categoryId?.name || "").toLowerCase().includes(q) ||
      (p.description || "").toLowerCase().includes(q)
    ).slice(0, 12); // cap at 12 results
    setResults(filtered);
  }, [debouncedQuery, allProducts]);

  // Focus search input when panel opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 120);
  }, [open]);

  // Add product to cart
  const handleAdd = async (product) => {
    setAddingId(product._id);
    try {
      const isWS   = priceMode === "wholesale";
      const price  = isWS ? (product.wholesalePrice ?? product.price) : product.price;

      const res = await axiosInstance.put(`/orders/qty/${product._id}`, {
        quantity:  1,
        price,
        priceMode,
      });

      if (res.data?.success || res.data?._id || res.data?.quantity) {
        toast.success(`${product.name} added to cart!`);
        onCartUpdated?.(); // tell parent to re-fetch cart
      } else {
        toast.error(res.data?.message || "Could not add to cart");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to add product");
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="mb-5">
      {/* Toggle button */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-4 py-3 rounded-2xl
          bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200
          hover:from-indigo-100 hover:to-blue-100 transition group"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-indigo-700">
          <ShoppingCart size={15} className="text-indigo-500" />
          + Add more products to cart
        </span>
        {open
          ? <ChevronUp size={16} className="text-indigo-400" />
          : <ChevronDown size={16} className="text-indigo-400" />
        }
      </button>

      {/* Expandable panel */}
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
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search products by name or category…"
                  className="flex-1 text-sm outline-none bg-transparent placeholder:text-gray-400"
                />
                {query && (
                  <button onClick={() => setQuery("")}
                    className="text-gray-400 hover:text-gray-600 transition">
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
                <div className="max-h-72 overflow-y-auto overscroll-contain">
                  {results.map(p => (
                    <ProductResult
                      key={p._id}
                      product={p}
                      priceMode={priceMode}
                      onAdd={handleAdd}
                      adding={addingId === p._id}
                    />
                  ))}
                </div>
              )}

              {results.length > 0 && (
                <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-center">
                  <p className="text-[10px] text-gray-400">
                    Showing {results.length} result{results.length !== 1 ? "s" : ""} · tap + to add to cart
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
