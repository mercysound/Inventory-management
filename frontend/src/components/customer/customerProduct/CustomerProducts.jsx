import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Package,
  Search,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import { useAuth } from "../../../context/AuthContext";
import axiosInstance from "../../../utils/axiosInstance";
import CustomerProductsSkeleton from "./CustomerProductsSkeleton";
import OrderModal from "./OrderModal";

const CART_PATH = {
  staff:     "/customer-dashboard/orders",
  customer:  "/user-dashboard/orders",
  wholesale: "/wholesale-dashboard/orders",
};

// ─── Stock badge (staff/admin only) ─────────────────────────────────────────
const StockBadge = ({ stock }) => {
  if (stock === 0)
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-500 border border-red-100">
        <AlertTriangle size={9} /> Out of stock
      </span>
    );
  if (stock < 5)
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-600 border border-amber-100">
        Only {stock} left
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">
      {stock} in stock
    </span>
  );
};

// ─── Quick Add / +- button ────────────────────────────────────────────────────
const QuickAddButton = ({ product, cartItem, onAdd, onIncrease, onDecrease }) => {
  const inCart = !!cartItem;

  if (product.stock < 1)
    return (
      <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-2.5 py-1.5 rounded-lg">
        Out of stock
      </span>
    );

  if (!inCart)
    return (
      <motion.button
        onClick={(e) => { e.stopPropagation(); onAdd(); }}
        whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.92 }}
        onPointerEnter={() => { try { window.dispatchEvent(new CustomEvent("hideFloatingCart",{detail:{hide:true}})); } catch{} }}
        onPointerLeave={() => { try { window.dispatchEvent(new CustomEvent("hideFloatingCart",{detail:{hide:false}})); } catch{} }}
        className="w-9 h-9 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xl
          font-bold flex items-center justify-center shadow-sm shadow-green-200 transition"
      >+</motion.button>
    );

  return (
    <div
      className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-xl px-1.5 py-1"
      onPointerEnter={() => { try { window.dispatchEvent(new CustomEvent("hideFloatingCart",{detail:{hide:true}})); } catch{} }}
      onPointerLeave={() => { try { window.dispatchEvent(new CustomEvent("hideFloatingCart",{detail:{hide:false}})); } catch{} }}
    >
      <motion.button type="button"
        onClick={(e) => { e.stopPropagation(); onDecrease(); }}
        whileTap={{ scale: 0.88 }}
        className="w-7 h-7 rounded-lg bg-white border border-red-200 text-red-500
          hover:bg-red-50 flex items-center justify-center font-bold text-sm transition">
        −
      </motion.button>
      <span className="font-bold text-green-800 text-sm w-5 text-center select-none">
        {cartItem.quantity}
      </span>
      <motion.button type="button"
        onClick={(e) => { e.stopPropagation(); onIncrease(); }}
        whileTap={{ scale: 0.88 }}
        className="w-7 h-7 rounded-lg bg-green-600 hover:bg-green-700 text-white
          flex items-center justify-center font-bold text-sm transition">
        +
      </motion.button>
    </div>
  );
};

// ─── ProductCard — shared card used by all three tabs ────────────────────────
const ProductCard = ({ product, index, cartMap, user, canSeeStock, showWholesaleCol, onCardClick, onAdd, onIncrease, onDecrease }) => {
  const cartItem = cartMap[product._id] || null;
  const inCart   = !!cartItem;
  const thumb    = product.images?.[0] || product.image || null;
  const price    = user?.role === "wholesale"
    ? (product.wholesalePrice ?? product.price)
    : product.price;
  const oos = product.stock === 0;
  return (
    <motion.div
      key={product._id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.25) }}
      onClick={() => onCardClick(product)}
      className={`relative group flex flex-col bg-white rounded-2xl border overflow-hidden
        cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5
        ${inCart ? "border-green-200 shadow-sm shadow-green-100/60" : "border-gray-100 shadow-sm"}
        ${oos ? "opacity-60" : ""}`}
    >
      <div className="relative w-full h-32 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden shrink-0">
        {thumb ? (
          <img src={thumb} alt={product.name} loading="lazy"
            className="w-full h-full object-contain p-1 group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package size={28} className="text-gray-200" />
          </div>
        )}
        {/* Badges — only one badge shown at a time (priority: bonanza > new > photos) */}
        {product.isBonanza && (
          <span className="absolute top-2 left-2 text-[9px] font-bold bg-orange-500 text-white px-2 py-0.5 rounded-full shadow-sm">
            🎉 DEAL
          </span>
        )}
        {!product.isBonanza && product.isNewArrival && (
          <span className="absolute top-2 left-2 text-[9px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-full shadow-sm">
            ✨ NEW
          </span>
        )}
        {!product.isBonanza && !product.isNewArrival && Array.isArray(product.images) && product.images.length > 1 && (
          <span className="absolute top-2 left-2 text-[9px] font-bold bg-black/50 text-white px-1.5 py-0.5 rounded-full">
            {product.images.length} photos
          </span>
        )}
        {inCart && (
          <div className="absolute top-2 right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow flex items-center gap-1">
            <ShoppingCart size={8} />{cartItem.quantity}
          </div>
        )}
        {oos && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <span className="bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow">Out of stock</span>
          </div>
        )}
      </div>
      <div className="p-2.5 flex flex-col gap-1.5">
        <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full w-fit max-w-full truncate tracking-wide uppercase">
          {product.categoryId?.name || "—"}
        </span>
        <p className="font-bold text-gray-900 text-sm leading-snug line-clamp-2 min-h-[1.75rem]">{product.name}</p>
        {product.description && (
          <p className="text-[11px] text-gray-400 line-clamp-1 leading-relaxed">{product.description}</p>
        )}
        {user?.role === "staff" && showWholesaleCol && (
          <p className="text-[11px] text-amber-600 font-semibold">
            WS: {product.wholesalePrice != null ? `₦${Number(product.wholesalePrice).toLocaleString()}` : "—"}
          </p>
        )}
        {canSeeStock && <div><StockBadge stock={product.stock} /></div>}
        {/* ── Price + action on one row ── */}
        <div className="mt-auto pt-1.5 border-t border-gray-50 flex items-center justify-between gap-2"
          onClick={(e) => e.stopPropagation()}>
          {/* Price — shrinks to give room to the button on long prices */}
          <div className="flex-1 min-w-0 overflow-hidden">
            <p className="font-extrabold text-gray-900 leading-none tabular-nums truncate
              text-sm xs:text-sm"
              style={{ fontSize: "clamp(0.7rem, 2.5vw, 0.875rem)" }}>
              ₦{Number(price).toLocaleString()}
            </p>
            {(user?.role === "wholesale" || user?.role === "customer") && (
              <span className={`text-[9px] font-bold tracking-wide ${user?.role === "wholesale" ? "text-amber-600" : "text-indigo-500"}`}>
                {user?.role === "wholesale" ? "WSP" : "RTP"}
              </span>
            )}
          </div>
          {/* Button — never shrinks */}
          <div className="flex-shrink-0">
            <QuickAddButton product={product} cartItem={cartItem}
              onAdd={() => onAdd(product)}
              onIncrease={() => onIncrease(product._id)}
              onDecrease={() => onDecrease(product._id)} />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ─── TabPagination — reusable pagination bar for each tab ────────────────────
const COLORS = {
  green:  { active: "bg-green-600 border-green-600 shadow-green-200", hover: "hover:bg-gray-50", btn: "bg-green-600 hover:bg-green-700", ring: "focus:ring-green-400" },
  indigo: { active: "bg-indigo-600 border-indigo-600 shadow-indigo-200", hover: "hover:bg-gray-50", btn: "bg-indigo-600 hover:bg-indigo-700", ring: "focus:ring-indigo-400" },
  orange: { active: "bg-orange-500 border-orange-500 shadow-orange-200", hover: "hover:bg-gray-50", btn: "bg-orange-500 hover:bg-orange-600", ring: "focus:ring-orange-400" },
};
const TabPagination = ({ current, total, count, pageSize, jump, setJump, goTo, color = "green" }) => {
  if (total <= 1) return null;
  const c = COLORS[color] || COLORS.green;
  const pages = Array.from({ length: total }, (_, i) => i + 1)
    .filter(p => p === 1 || p === total || Math.abs(p - current) <= 1)
    .reduce((acc, p, i, arr) => { if (i > 0 && p - arr[i-1] > 1) acc.push("…"); acc.push(p); return acc; }, []);
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 flex-wrap">
      <p className="text-[11px] text-gray-400 order-3 sm:order-1">
        Showing <span className="font-semibold text-gray-600">{(current-1)*pageSize+1}</span>–<span className="font-semibold text-gray-600">{Math.min(current*pageSize,count)}</span> of <span className="font-semibold text-gray-600">{count}</span>
      </p>
      <div className="flex items-center justify-center gap-1.5 flex-wrap order-1 sm:order-2">
        <button onClick={() => goTo(current-1)} disabled={current===1}
          className="px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-white disabled:opacity-40 transition shadow-sm">
          &#8592; Prev
        </button>
        {pages.map((p, i) => p === "…"
          ? <span key={`e${i}`} className="text-gray-400 text-sm px-1">…</span>
          : <button key={p} onClick={() => goTo(p)}
              className={`w-9 h-9 rounded-xl text-sm font-semibold border transition shadow-sm
                ${p === current ? `${c.active} text-white` : `bg-white border-gray-200 text-gray-600 ${c.hover}`}`}>
              {p}
            </button>
        )}
        <button onClick={() => goTo(current+1)} disabled={current===total}
          className="px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-white disabled:opacity-40 transition shadow-sm">
          Next &#8594;
        </button>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); const n = parseInt(jump,10); if (!isNaN(n)) goTo(n); }}
        className="flex items-center gap-1.5 order-2 sm:order-3">
        <span className="text-[11px] text-gray-400">Go to</span>
        <input type="number" min={1} max={total} value={jump} onChange={e => setJump(e.target.value)}
          onWheel={e => e.currentTarget.blur()} placeholder="pg"
          className={`w-14 h-9 text-center text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 ${c.ring} shadow-sm`} />
        <button type="submit" className={`h-9 px-3 rounded-xl text-xs font-semibold text-white transition shadow-sm ${c.btn}`}>Go</button>
      </form>
    </div>
  );
};

// ─── Main component ──────────────────────────────────────────────────────────
const CustomerProducts = () => {
  const { user } = useAuth();
  const canSeeStock = user?.role === "staff" || user?.role === "admin";
  const cartPath    = CART_PATH[user?.role] ?? "/user-dashboard/orders";

  const [categories,       setCategories]       = useState([]);
  const [products,         setProducts]         = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [cartMap,          setCartMap]          = useState({});
  const cartMapRef = useRef({});
  const [openModal,        setOpenModal]        = useState(false);
  const [loading,          setLoading]          = useState(true);

  // ── Main tab / filter state ───────────────────────────────────────────────
  // activeTab: "all" | "new" | "bonanza"
  const [activeTab,        setActiveTab]        = useState("all");
  const [searchQuery,      setSearchQuery]      = useState("");       // "all" tab search
  const [selectedCategory, setSelectedCategory] = useState("");
  const [catSearch,        setCatSearch]        = useState("");       // category dropdown search
  const [showCatDropdown,  setShowCatDropdown]  = useState(false);   // custom dropdown open
  const catDropdownRef = useRef(null);

  // Per-tab independent search + page state
  const [newSearch,     setNewSearch]     = useState("");
  const [bonanzaSearch, setBonanzaSearch] = useState("");
  const [currentPage,      setCurrentPage]      = useState(1);
  const [newPage,          setNewPage]          = useState(1);
  const [bonanzaPage,      setBonanzaPage]      = useState(1);
  const [jumpInput,        setJumpInput]        = useState("");
  const [newJump,          setNewJump]          = useState("");
  const [bonanzaJump,      setBonanzaJump]      = useState("");

  const pageTopRef = useRef(null);
  const PRODUCTS_PAGE_SIZE = 20;

  const [showWholesaleCol, setShowWholesaleCol] = useState(false);

  const [orderData, setOrderData] = useState({
    orderId:"", productId:"", productName:"", productImage:"",
    productDescription:"", productCategory:"",
    quantity:1, total:0, stock:0, price:0,
  });

  // ── Fetch products + cart ──────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [prodRes, cartRes] = await Promise.all([
        axiosInstance.get("/products"),
        axiosInstance.get("/orders"),
      ]);
      if (prodRes.data.success) {
        setCategories(prodRes.data.categories);
        const allProducts = prodRes.data.products;
        setProducts(allProducts);
        // Sort: new arrivals bubble to top on initial load
        const sorted = [...allProducts].sort((a, b) => {
          if (a.isNewArrival && !b.isNewArrival) return -1;
          if (!a.isNewArrival && b.isNewArrival) return 1;
          if (a.isNewArrival && b.isNewArrival) return new Date(b.newArrivalAt || 0) - new Date(a.newArrivalAt || 0);
          return 0;
        });
        setFilteredProducts(sorted);
      }
      const cartOrders = cartRes.data.data || cartRes.data.orders || [];
      const map = {};
      cartOrders.forEach((o) => {
        const pid = o.product?._id || o.productId;
        if (pid) map[pid] = { orderId: o._id, quantity: o.quantity };
      });
      cartMapRef.current = map;
      setCartMap(map);
      // Always sync CartContext with ground-truth total from server —
      // fixes stale floating-cart badge after reload or clear-cart
      const freshTotal = cartOrders.reduce((s, o) => s + (o.quantity || 0), 0);
      try {
        window.dispatchEvent(new CustomEvent("ordersUpdated", {
          detail: { total: freshTotal, _source: "fetchAll" },
        }));
      } catch {}
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === "staff") {
      try {
        const s = localStorage.getItem("melech_staff_show_wholesale");
        setShowWholesaleCol(s !== null ? JSON.parse(s) : true);
      } catch { setShowWholesaleCol(true); }
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Close category dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (catDropdownRef.current && !catDropdownRef.current.contains(e.target)) {
        setShowCatDropdown(false);
        setCatSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("pos-token");
    if (!token) return;
    const base = import.meta.env.VITE_API_URL || "/api";
    // Placed-order updates
    const es1 = new EventSource(`${base}/placed-orders/stream?token=${encodeURIComponent(token)}`);
    es1.addEventListener("placedOrderUpdated", () => fetchAll());
    es1.addEventListener("error", () => es1.close());
    // Product flag updates — patch in-place, no full reload
    const es2 = new EventSource(`${base}/products/stream?token=${encodeURIComponent(token)}`);
    es2.addEventListener("productFlagChanged", (e) => {
      try {
        const { productId, ...flags } = JSON.parse(e.data);
        setProducts((prev) => prev.map((p) =>
          p._id === productId ? { ...p, ...flags } : p
        ));
        setFilteredProducts((prev) => prev.map((p) =>
          p._id === productId ? { ...p, ...flags } : p
        ));
      } catch {}
    });
    es2.addEventListener("error", () => es2.close());
    return () => { es1.close(); es2.close(); };
  }, [fetchAll]);

  useEffect(() => {
    if (user?.role !== "wholesale") return;
    axiosInstance.post("/orders/set-price-mode/wholesale").catch(() => {});
  }, [user]);

  useEffect(() => {
    // Only re-fetch when server signals a price change that affects cart values.
    // Skip our own fetchAll-sourced dispatches to prevent an infinite loop.
    const h = (e) => {
      if (e?.detail?._source === "fetchAll") return;
      if (e?.detail?.priceChanged) fetchAll();
    };
    window.addEventListener("ordersUpdated", h);
    return () => window.removeEventListener("ordersUpdated", h);
  }, [fetchAll]);

  useEffect(() => {
    if (!openModal || !orderData.productId) return;
    const p = products.find((x) => x._id === orderData.productId);
    if (!p) return;
    const storedMode = (() => { try { return localStorage.getItem("melech_staff_price_mode"); } catch { return null; } })();
    const isWS = user?.role === "wholesale" || storedMode === "wholesale";
    const rp = p.price; const wp = p.wholesalePrice ?? null;
    const newPrice = isWS ? (wp ?? rp) : rp;
    const newTotal = (Number(orderData.quantity) || 0) * newPrice;
    setOrderData((prev) => {
      if (prev.price === newPrice && prev.total === newTotal) return prev;
      return { ...prev, price: wp !== null ? newPrice : rp, total: newTotal, retailPrice: rp, wholesalePrice: wp, priceMode: isWS ? "wholesale" : "retail" };
    });
  }, [products, openModal, orderData.productId, orderData.quantity]);

  useEffect(() => { cartMapRef.current = cartMap; }, [cartMap]);

  const dispatchOrdersUpdated = useCallback((m) => {
    try {
      const total = Object.values(m).reduce((s, i) => s + (i.quantity || 0), 0);
      window.dispatchEvent(new CustomEvent("ordersUpdated", { detail: { cartMap: m, total } }));
    } catch {}
  }, []);

  // ── Core cart updater — replaces add/reduce/increase/decrease ────────────
  // Uses PUT /orders/qty/:productId which is idempotent:
  //   qty > 0 → server upserts with that exact quantity
  //   qty = 0 → server deletes the document
  // No race conditions possible — the server always writes the exact qty we send.
  const setCartQty = useCallback(async (product, newQty) => {
    const productId = product._id || product;
    const prevItem  = cartMapRef.current[productId];
    const prevQty   = prevItem?.quantity || 0;

    if (newQty === prevQty) return; // nothing to do

    const snapshot = { ...cartMapRef.current };

    // Optimistic update immediately
    if (newQty <= 0) {
      const n = { ...cartMapRef.current }; delete n[productId];
      cartMapRef.current = n; setCartMap(n); dispatchOrdersUpdated(n);
    } else {
      const n = { ...cartMapRef.current, [productId]: { orderId: prevItem?.orderId || "", quantity: newQty } };
      cartMapRef.current = n; setCartMap(n); dispatchOrdersUpdated(n);
    }

    // Get price for the product
    const storedMode = (() => { try { return localStorage.getItem("melech_staff_price_mode"); } catch { return null; } })();
    const isWS   = user?.role === "wholesale" || storedMode === "wholesale";
    const prod   = typeof product === "object" ? product : products.find((p) => p._id === productId);
    const price  = prod ? (isWS ? (prod.wholesalePrice ?? prod.price) : prod.price) : 0;

    try {
      const res = await axiosInstance.put(`/orders/qty/${productId}`, {
        quantity:  newQty,
        price,
        priceMode: isWS ? "wholesale" : "retail",
      });

      if (res.data?.deleted || newQty <= 0) {
        // Server confirmed deletion
        const n = { ...cartMapRef.current }; delete n[productId];
        cartMapRef.current = n; setCartMap(n); dispatchOrdersUpdated(n);
      } else if (res.data?._id) {
        // Server confirmed upsert — store real orderId
        const n = { ...cartMapRef.current, [productId]: { orderId: res.data._id, quantity: res.data.quantity ?? newQty } };
        cartMapRef.current = n; setCartMap(n); dispatchOrdersUpdated(n);
      }
    } catch {
      // Rollback on error
      cartMapRef.current = snapshot; setCartMap(snapshot); dispatchOrdersUpdated(snapshot);
      toast.error("Cart update failed. Please try again.");
    }
  }, [dispatchOrdersUpdated, products, user]);

  // ── Quick add ──────────────────────────────────────────────────────────────
  const handleQuickAdd = useCallback((product) => {
    const prev = cartMapRef.current[product._id];
    const qty  = prev?.quantity || 0;
    if (qty >= product.stock) { toast.warning("Cannot add more than available stock"); return; }
    setCartQty(product, qty + 1);
  }, [setCartQty]);

  // ── Quick increase ─────────────────────────────────────────────────────────
  const handleQuickIncrease = useCallback((productId) => {
    const item    = cartMapRef.current[productId];
    if (!item) return;
    const product = products.find((p) => p._id === productId);
    if (!product || item.quantity >= product.stock) { toast.warning("Cannot increase beyond available stock"); return; }
    setCartQty(product, item.quantity + 1);
  }, [setCartQty, products]);

  // ── Quick decrease ─────────────────────────────────────────────────────────
  const handleQuickDecrease = useCallback((productId) => {
    const item = cartMapRef.current[productId];
    if (!item) return;
    const product = products.find((p) => p._id === productId);
    setCartQty(product || { _id: productId }, Math.max(0, item.quantity - 1));
  }, [setCartQty, products]);

  // ── Patch cart (OrderModal) ────────────────────────────────────────────────
  const patchCart = useCallback((productId, newQty) => {
    const prod = products.find((p) => p._id === productId);
    setCartQty(prod || { _id: productId }, newQty);
  }, [setCartQty, products]);

  // ── Filters ────────────────────────────────────────────────────────────────
  const applyFilters = useCallback((query, catId, newArrivalsOnly = false) => {
    let r = products;
    if (catId) r = r.filter((p) => (p.categoryId?._id ?? p.categoryId) === catId);
    if (query) r = r.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));
    if (newArrivalsOnly) r = r.filter((p) => p.isNewArrival === true);
    r = [...r].sort((a, b) => {
      if (a.isNewArrival && !b.isNewArrival) return -1;
      if (!a.isNewArrival && b.isNewArrival) return 1;
      if (a.isNewArrival && b.isNewArrival)
        return new Date(b.newArrivalAt || 0) - new Date(a.newArrivalAt || 0);
      return 0;
    });
    setFilteredProducts(r);
  }, [products]);

  const goToPage = (p) => {
    const total = Math.ceil(filteredProducts.length / PRODUCTS_PAGE_SIZE);
    const clamped = Math.max(1, Math.min(p, total));
    setCurrentPage(clamped); setJumpInput("");
    setTimeout(() => pageTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };
  const goToNewPage = (p) => {
    const total = Math.ceil(products.filter(x => x.isNewArrival).length / PRODUCTS_PAGE_SIZE);
    setNewPage(Math.max(1, Math.min(p, total))); setNewJump("");
    setTimeout(() => pageTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };
  const goToBonanzaPage = (p) => {
    const total = Math.ceil(products.filter(x => x.isBonanza).length / PRODUCTS_PAGE_SIZE);
    setBonanzaPage(Math.max(1, Math.min(p, total))); setBonanzaJump("");
    setTimeout(() => pageTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const handleSearch = (e) => { const q = e.target.value; setSearchQuery(q); setCurrentPage(1); applyFilters(q, selectedCategory); };
  const handleCategorySelect = (id) => {
    setSelectedCategory(id); setCurrentPage(1); setShowCatDropdown(false); setCatSearch("");
    applyFilters(searchQuery, id);
  };
  const handleNewArrivalsToggle = () => {
    setActiveTab((t) => t === "new" ? "all" : "new");
    setNewPage(1); setNewSearch("");
  };
  const handleBonanzaToggle = () => {
    setActiveTab((t) => t === "bonanza" ? "all" : "bonanza");
    setBonanzaPage(1); setBonanzaSearch("");
  };

  // ── Open order modal ───────────────────────────────────────────────────────
  const handleOrderChange = (product) => {
    const storedMode = (() => { try { return localStorage.getItem("melech_staff_price_mode"); } catch { return null; } })();
    const isWS = user?.role === "wholesale" || storedMode === "wholesale";
    const basePrice = isWS ? (product.wholesalePrice ?? product.price) : product.price;
    const local = cartMap[product._id];
    const base = {
      orderId: local?.orderId || "",
      productId: product._id, productName: product.name, productImage: product.image,
      images: Array.isArray(product.images) && product.images.length > 0 ? product.images : product.image ? [product.image] : [],
      productDescription: product.description, productCategory: product.categoryId?.name || "",
      quantity: local?.quantity || 0, total: (local?.quantity || 0) * basePrice,
      stock: product.stock, price: basePrice,
      priceMode: isWS ? "wholesale" : "retail",
      wholesalePrice: product.wholesalePrice ?? null, retailPrice: product.price,
      expiryDate: product.expiryDate || null, batchNumber: product.batchNumber || null,
    };
    setOrderData(base); setOpenModal(true);
    try { window.dispatchEvent(new CustomEvent("modalVisibility", { detail: { open: true } })); } catch {}
    axiosInstance.get(`/orders/product/${product._id}`)
      .then((res) => {
        const ex = res.data.order || res.data.data || res.data._doc || res.data;
        if (res.data.success && ex?._id) {
          const loc = cartMapRef.current[product._id];
          const qty = loc?.quantity ?? base.quantity;
          const ep = isWS ? (product.wholesalePrice ?? product.price) : product.price;
          setOrderData({ ...base, orderId: ex._id || loc?.orderId || "", quantity: qty, total: qty * ep, price: ep, priceMode: isWS ? "wholesale" : "retail" });
        }
      }).catch(() => {});
  };

  const totalCartItems = Object.values(cartMap).reduce((s, i) => s + (i.quantity || 0), 0);

  // ── Tab-specific filtered + paginated lists ───────────────────────────────
  const newArrivalProducts = products.filter(p => p.isNewArrival);
  const bonanzaProducts    = products.filter(p => p.isBonanza);
  const newFiltered        = newSearch ? newArrivalProducts.filter(p => p.name.toLowerCase().includes(newSearch.toLowerCase())) : newArrivalProducts;
  const bonanzaFiltered    = bonanzaSearch ? bonanzaProducts.filter(p => p.name.toLowerCase().includes(bonanzaSearch.toLowerCase())) : bonanzaProducts;
  const cpPaginated        = filteredProducts.slice((currentPage - 1) * PRODUCTS_PAGE_SIZE, currentPage * PRODUCTS_PAGE_SIZE);
  const totalPages         = Math.ceil(filteredProducts.length / PRODUCTS_PAGE_SIZE);
  const newPaginated       = newFiltered.slice((newPage - 1) * PRODUCTS_PAGE_SIZE, newPage * PRODUCTS_PAGE_SIZE);
  const newTotalPages      = Math.ceil(newFiltered.length / PRODUCTS_PAGE_SIZE);
  const bonanzaPaginated   = bonanzaFiltered.slice((bonanzaPage - 1) * PRODUCTS_PAGE_SIZE, bonanzaPage * PRODUCTS_PAGE_SIZE);
  const bonanzaTotalPages  = Math.ceil(bonanzaFiltered.length / PRODUCTS_PAGE_SIZE);

  // Filtered categories for the searchable dropdown
  const filteredCats = catSearch
    ? categories.filter(c => c.name.toLowerCase().includes(catSearch.toLowerCase()))
    : categories;
  const selectedCatName = categories.find(c => c._id === selectedCategory)?.name || "All Categories";

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-slate-100/60">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-5 space-y-5">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600
                flex items-center justify-center shadow-md shadow-green-200 shrink-0">
                <ShoppingBag size={17} className="text-white" />
              </span>
              Products
            </h1>
            <p className="text-xs text-gray-400 mt-0.5 ml-11">
              {filteredProducts.length} item{filteredProducts.length !== 1 ? "s" : ""}
              {user?.role === "wholesale" && (
                <span className="ml-2 bg-amber-100 text-amber-700 border border-amber-200
                  text-[10px] font-bold px-2 py-0.5 rounded-full">🏪 Wholesale pricing</span>
              )}
            </p>
          </div>

          <AnimatePresence>
            {totalCartItems > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.85, y: -6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ type: "spring", stiffness: 380, damping: 22 }}
              >
                <Link to={cartPath}
                  className="inline-flex items-center gap-2.5 bg-green-600 hover:bg-green-700
                    text-white px-5 py-2.5 rounded-2xl shadow-md shadow-green-200
                    active:scale-95 transition-all group font-semibold text-sm">
                  <ShoppingCart size={15} />
                  {totalCartItems} item{totalCartItems !== 1 ? "s" : ""} in cart
                  <span className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-xs">→</span>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Filter bar ──────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2.5 items-center bg-white rounded-2xl
          border border-gray-100 shadow-sm px-4 py-3">

          {/* Searchable category dropdown */}
          <div className="relative" ref={catDropdownRef}>
            <button
              type="button"
              onClick={() => { setShowCatDropdown(v => !v); setCatSearch(""); }}
              className="inline-flex items-center gap-1.5 border border-gray-200 rounded-xl pl-3 pr-3 py-2
                text-xs text-gray-700 bg-gray-50 hover:bg-white transition min-w-[130px] justify-between"
            >
              <SlidersHorizontal size={13} className="text-gray-400 shrink-0" />
              <span className="truncate max-w-[90px]">{selectedCatName}</span>
              <span className="text-gray-400 text-[10px]">▾</span>
            </button>
            {showCatDropdown && (
              <div className="absolute top-full mt-1 left-0 z-50 w-56 bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden">
                <div className="p-2 border-b border-gray-100">
                  <div className="relative">
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                      autoFocus
                      type="text"
                      value={catSearch}
                      onChange={e => setCatSearch(e.target.value)}
                      placeholder="Search categories…"
                      className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-300"
                    />
                  </div>
                </div>
                <div className="max-h-52 overflow-y-auto">
                  <button
                    onClick={() => handleCategorySelect("")}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-green-50 transition
                      ${!selectedCategory ? "font-semibold text-green-700 bg-green-50" : "text-gray-700"}`}
                  >All Categories</button>
                  {filteredCats.map(c => (
                    <button
                      key={c._id}
                      onClick={() => handleCategorySelect(c._id)}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-green-50 transition
                        ${selectedCategory === c._id ? "font-semibold text-green-700 bg-green-50" : "text-gray-700"}`}
                    >{c.name}</button>
                  ))}
                  {filteredCats.length === 0 && (
                    <p className="px-3 py-3 text-xs text-gray-400 text-center">No categories found</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Product name search — only on All tab */}
          {activeTab === "all" && (
            <div className="relative flex-1 min-w-[160px] max-w-xs">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input type="text" placeholder="Search products…" value={searchQuery} onChange={handleSearch}
                className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-2 text-xs
                  text-gray-700 bg-gray-50 focus:outline-none focus:ring-2
                  focus:ring-green-400 focus:border-transparent transition placeholder:text-gray-400" />
            </div>
          )}

          {user?.role === "staff" && (
            <button type="button"
              onClick={() => setShowWholesaleCol((p) => {
                const n = !p;
                try { localStorage.setItem("melech_staff_show_wholesale", JSON.stringify(n)); } catch {}
                return n;
              })}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition
                ${showWholesaleCol ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
              <span className={`w-2 h-2 rounded-full ${showWholesaleCol ? "bg-amber-500" : "bg-gray-400"}`} />
              WS price
            </button>
          )}

          {/* ✨ New Arrivals tab pill */}
          {newArrivalProducts.length > 0 && (
            <button type="button" onClick={handleNewArrivalsToggle}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition
                ${activeTab === "new"
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                  : "bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50"}`}>
              ✨ New Arrivals
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold
                ${activeTab === "new" ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-700"}`}>
                {newArrivalProducts.length}
              </span>
            </button>
          )}

          {/* 🎉 Bonanza tab pill */}
          {bonanzaProducts.length > 0 && (
            <button type="button" onClick={handleBonanzaToggle}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition
                ${activeTab === "bonanza"
                  ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                  : "bg-white text-orange-600 border-orange-200 hover:bg-orange-50"}`}>
              🎉 Bonanza
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold
                ${activeTab === "bonanza" ? "bg-white/20 text-white" : "bg-orange-100 text-orange-700"}`}>
                {bonanzaProducts.length}
              </span>
            </button>
          )}
        </div>

        {/* ── Content ─────────────────────────────────────────────────── */}
        {loading ? (
          <CustomerProductsSkeleton />
        ) : activeTab === "new" ? (
          /* ── New Arrivals tab ── */
          <div className="space-y-4">
            {/* Tab header + search */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-indigo-700">✨ New Arrivals</span>
                <span className="text-xs text-indigo-500 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full font-semibold">{newArrivalProducts.length}</span>
              </div>
              <div className="relative flex-1 max-w-xs">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input type="text" placeholder="Search new arrivals…" value={newSearch}
                  onChange={e => { setNewSearch(e.target.value); setNewPage(1); }}
                  className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-2 text-xs bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition" />
              </div>
            </div>
            {newFiltered.length === 0 ? (
              <div className="flex flex-col items-center py-16 gap-3">
                <Package size={32} className="text-gray-300" />
                <p className="text-gray-400 text-sm">{newSearch ? `No new arrivals match "${newSearch}"` : "No new arrivals yet"}</p>
              </div>
            ) : (
              <>
                <div ref={pageTopRef} className="grid grid-cols-2 min-[480px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 md:gap-3">
                  {newPaginated.map((product, index) => <ProductCard key={product._id} product={product} index={index} cartMap={cartMap} user={user} canSeeStock={canSeeStock} showWholesaleCol={showWholesaleCol} onCardClick={handleOrderChange} onAdd={handleQuickAdd} onIncrease={handleQuickIncrease} onDecrease={handleQuickDecrease} />)}
                </div>
                <TabPagination current={newPage} total={newTotalPages} count={newFiltered.length} pageSize={PRODUCTS_PAGE_SIZE} jump={newJump} setJump={setNewJump} goTo={goToNewPage} color="indigo" />
              </>
            )}
          </div>
        ) : activeTab === "bonanza" ? (
          /* ── Bonanza tab ── */
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-orange-700">🎉 Bonanza Deals</span>
                <span className="text-xs text-orange-600 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-full font-semibold">{bonanzaProducts.length}</span>
              </div>
              <div className="relative flex-1 max-w-xs">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input type="text" placeholder="Search bonanza deals…" value={bonanzaSearch}
                  onChange={e => { setBonanzaSearch(e.target.value); setBonanzaPage(1); }}
                  className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-2 text-xs bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-300 transition" />
              </div>
            </div>
            {bonanzaFiltered.length === 0 ? (
              <div className="flex flex-col items-center py-16 gap-3">
                <Package size={32} className="text-gray-300" />
                <p className="text-gray-400 text-sm">{bonanzaSearch ? `No deals match "${bonanzaSearch}"` : "No bonanza deals yet"}</p>
              </div>
            ) : (
              <>
                <div ref={pageTopRef} className="grid grid-cols-2 min-[480px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 md:gap-3">
                  {bonanzaPaginated.map((product, index) => <ProductCard key={product._id} product={product} index={index} cartMap={cartMap} user={user} canSeeStock={canSeeStock} showWholesaleCol={showWholesaleCol} onCardClick={handleOrderChange} onAdd={handleQuickAdd} onIncrease={handleQuickIncrease} onDecrease={handleQuickDecrease} />)}
                </div>
                <TabPagination current={bonanzaPage} total={bonanzaTotalPages} count={bonanzaFiltered.length} pageSize={PRODUCTS_PAGE_SIZE} jump={bonanzaJump} setJump={setBonanzaJump} goTo={goToBonanzaPage} color="orange" />
              </>
            )}
          </div>
        ) : cpPaginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-20 h-20 rounded-3xl bg-gray-100 flex items-center justify-center">
              <Package size={32} className="text-gray-300" />
            </div>
            <p className="text-gray-500 font-semibold">No products found</p>
            <p className="text-sm text-gray-400">Try adjusting your search or category</p>
          </div>
        ) : (
          <>
            {/* ── All products grid ── */}
            <div ref={pageTopRef} className="grid grid-cols-2 min-[480px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 md:gap-3">
              {cpPaginated.map((product, index) => <ProductCard key={product._id} product={product} index={index} cartMap={cartMap} user={user} canSeeStock={canSeeStock} showWholesaleCol={showWholesaleCol} onCardClick={handleOrderChange} onAdd={handleQuickAdd} onIncrease={handleQuickIncrease} onDecrease={handleQuickDecrease} />)}
            </div>
            <TabPagination current={currentPage} total={totalPages} count={filteredProducts.length} pageSize={PRODUCTS_PAGE_SIZE} jump={jumpInput} setJump={setJumpInput} goTo={goToPage} color="green" />
          </>
        )}
      </div>

      {/* ── Order modal ─────────────────────────────────────────────── */}
      {openModal && (
        <OrderModal
          orderData={orderData}
          setOrderData={setOrderData}
          closeModal={() => {
            setOpenModal(false);
            try { window.dispatchEvent(new CustomEvent("modalVisibility", { detail: { open: false } })); } catch {}
          }}
          patchCart={patchCart}
          showStock={canSeeStock}
          showStockText={canSeeStock}
        />
      )}
    </div>
  );
};

export default CustomerProducts;
