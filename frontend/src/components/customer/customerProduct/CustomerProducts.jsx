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
  const [searchQuery,      setSearchQuery]      = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showNewArrivals,  setShowNewArrivals]  = useState(false); // New Arrivals filter
  const [showWholesaleCol, setShowWholesaleCol] = useState(false);
  const [currentPage,      setCurrentPage]      = useState(1);
  const PRODUCTS_PAGE_SIZE = 20;

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

  useEffect(() => {
    const token = localStorage.getItem("pos-token");
    if (!token) return;
    const base = import.meta.env.VITE_API_URL || "/api";
    const es = new EventSource(`${base}/placed-orders/stream?token=${encodeURIComponent(token)}`);
    es.addEventListener("placedOrderUpdated", () => fetchAll());
    es.addEventListener("error", () => es.close());
    return () => es.close();
  }, [fetchAll]);

  useEffect(() => {
    if (user?.role !== "wholesale") return;
    axiosInstance.post("/orders/set-price-mode/wholesale").catch(() => {});
  }, [user]);

  useEffect(() => {
    const h = (e) => { if (e?.detail?.priceChanged) fetchAll(); };
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

  // ── Quick add ──────────────────────────────────────────────────────────────
  const handleQuickAdd = useCallback((product) => {
    const prev = cartMapRef.current[product._id];
    const qty  = prev?.quantity || 0;
    if (qty >= product.stock) { toast.warning("Cannot add more than available stock"); return; }
    const storedMode = (() => { try { return localStorage.getItem("melech_staff_price_mode"); } catch { return null; } })();
    const isWS = user?.role === "wholesale" || storedMode === "wholesale";
    const price = isWS ? (product.wholesalePrice ?? product.price) : product.price;
    const snapshot = { ...cartMapRef.current };
    const next = { ...snapshot, [product._id]: { orderId: prev?.orderId || "", quantity: qty + 1 } };
    cartMapRef.current = next; setCartMap(next); dispatchOrdersUpdated(next);
    axiosInstance.post("/orders/add", { productId: product._id, quantity: 1, price, priceMode: isWS ? "wholesale" : "retail", isWholesale: isWS })
      .then((res) => {
        if (res.data?._id) {
          const c = { ...cartMapRef.current, [product._id]: { orderId: res.data._id, quantity: res.data.quantity || 1 } };
          cartMapRef.current = c; setCartMap(c); dispatchOrdersUpdated(c);
        }
      })
      .catch(() => { cartMapRef.current = snapshot; setCartMap(snapshot); dispatchOrdersUpdated(snapshot); });
  }, [dispatchOrdersUpdated]);

  // ── Quick increase ─────────────────────────────────────────────────────────
  const handleQuickIncrease = useCallback((productId) => {
    const item = cartMapRef.current[productId];
    if (!item) return;
    const product = products.find((p) => p._id === productId);
    if (!product || item.quantity >= product.stock) { toast.warning("Cannot increase beyond available stock"); return; }
    const snapshot = { ...cartMapRef.current };
    const next = { ...snapshot, [productId]: { ...item, quantity: item.quantity + 1 } };
    cartMapRef.current = next; setCartMap(next); dispatchOrdersUpdated(next);
    const storedMode = (() => { try { return localStorage.getItem("melech_staff_price_mode"); } catch { return null; } })();
    const isWS = user?.role === "wholesale" || storedMode === "wholesale";
    if (!item.orderId) {
      const price = isWS ? (product.wholesalePrice ?? product.price) : product.price;
      axiosInstance.post("/orders/add", { productId, quantity: 1, price, priceMode: isWS ? "wholesale" : "retail", isWholesale: isWS })
        .then((res) => {
          if (res.data?._id) {
            const c = { ...cartMapRef.current, [productId]: { orderId: res.data._id, quantity: res.data.quantity } };
            cartMapRef.current = c; setCartMap(c); dispatchOrdersUpdated(c);
          }
        })
        .catch(() => { cartMapRef.current = snapshot; setCartMap(snapshot); dispatchOrdersUpdated(snapshot); });
      return;
    }
    axiosInstance.post(`/orders/increase/${item.orderId}`)
      .then((res) => {
        if (res.data?._id && res.data.quantity !== undefined) {
          const c = { ...cartMapRef.current, [productId]: { orderId: res.data._id, quantity: res.data.quantity } };
          cartMapRef.current = c; setCartMap(c); dispatchOrdersUpdated(c);
        }
      })
      .catch(() => { cartMapRef.current = snapshot; setCartMap(snapshot); dispatchOrdersUpdated(snapshot); });
  }, [dispatchOrdersUpdated, products, user]);

  // ── Quick decrease ─────────────────────────────────────────────────────────
  const handleQuickDecrease = useCallback((productId) => {
    const item = cartMapRef.current[productId];
    if (!item) return;
    const snapshot = { ...cartMapRef.current };
    const next = item.quantity <= 1
      ? (() => { const n = { ...cartMapRef.current }; delete n[productId]; return n; })()
      : { ...cartMapRef.current, [productId]: { ...item, quantity: item.quantity - 1 } };
    cartMapRef.current = next; setCartMap(next); dispatchOrdersUpdated(next);
    if (!item.orderId) return;
    axiosInstance.post(`/orders/reduce/${item.orderId}`)
      .then((res) => {
        if (res.data?.deleted) {
          const n = { ...cartMapRef.current }; delete n[productId];
          cartMapRef.current = n; setCartMap(n); dispatchOrdersUpdated(n);
        } else if (res.data?._id && res.data.quantity !== undefined) {
          const c = { ...cartMapRef.current, [productId]: { orderId: res.data._id, quantity: res.data.quantity } };
          cartMapRef.current = c; setCartMap(c); dispatchOrdersUpdated(c);
        }
      })
      .catch((err) => {
        if (err?.response?.status === 404) {
          const n = { ...cartMapRef.current }; delete n[productId];
          cartMapRef.current = n; setCartMap(n); dispatchOrdersUpdated(n);
        } else {
          cartMapRef.current = snapshot; setCartMap(snapshot); dispatchOrdersUpdated(snapshot);
        }
      });
  }, [dispatchOrdersUpdated]);

  // ── Patch cart (OrderModal) ────────────────────────────────────────────────
  const patchCart = useCallback((productId, newQty) => {
    const next = { ...cartMapRef.current };
    if (newQty <= 0) { delete next[productId]; }
    else { const prev = next[productId]; next[productId] = { orderId: prev?.orderId || "", quantity: newQty }; }
    cartMapRef.current = next; setCartMap(next);
    try { const total = Object.values(next).reduce((s, i) => s + (i.quantity || 0), 0); setTimeout(() => window.dispatchEvent(new CustomEvent("ordersUpdated", { detail: { cartMap: next, total } })), 0); } catch {}
  }, []);

  // ── Filters ────────────────────────────────────────────────────────────────
  const applyFilters = useCallback((query, catId, newArrivalsOnly = showNewArrivals) => {
    let r = products;
    if (catId)            r = r.filter((p) => (p.categoryId?._id ?? p.categoryId) === catId);
    if (query)            r = r.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));
    if (newArrivalsOnly)  r = r.filter((p) => p.isNewArrival === true);
    // Sort: new arrivals bubble to the top (by newArrivalAt desc, then createdAt desc)
    r = [...r].sort((a, b) => {
      if (a.isNewArrival && !b.isNewArrival) return -1;
      if (!a.isNewArrival && b.isNewArrival) return 1;
      if (a.isNewArrival && b.isNewArrival) {
        return new Date(b.newArrivalAt || 0) - new Date(a.newArrivalAt || 0);
      }
      return 0;
    });
    setFilteredProducts(r);
  }, [products, showNewArrivals]);

  const handleSearch         = (e) => { const q = e.target.value; setSearchQuery(q); setCurrentPage(1); applyFilters(q, selectedCategory); };
  const handleCategoryChange = (e) => { const c = e.target.value; setSelectedCategory(c); setCurrentPage(1); applyFilters(searchQuery, c); };
  const handleNewArrivalsToggle = () => {
    const next = !showNewArrivals;
    setShowNewArrivals(next); setCurrentPage(1); applyFilters(searchQuery, selectedCategory, next);
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
  const cpPaginated    = filteredProducts.slice((currentPage - 1) * PRODUCTS_PAGE_SIZE, currentPage * PRODUCTS_PAGE_SIZE);
  const totalPages     = Math.ceil(filteredProducts.length / PRODUCTS_PAGE_SIZE);

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
          <div className="relative">
            <SlidersHorizontal size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <select onChange={handleCategoryChange} value={selectedCategory}
              className="appearance-none border border-gray-200 rounded-xl pl-8 pr-7 py-2
                text-xs text-gray-700 bg-gray-50 focus:outline-none focus:ring-2
                focus:ring-green-400 focus:border-transparent transition cursor-pointer">
              <option value="">All Categories</option>
              {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>

          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input type="text" placeholder="Search products…" value={searchQuery} onChange={handleSearch}
              className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-2 text-xs
                text-gray-700 bg-gray-50 focus:outline-none focus:ring-2
                focus:ring-green-400 focus:border-transparent transition placeholder:text-gray-400" />
          </div>

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

          {/* New Arrivals filter pill */}
          {(() => {
            const newCount = products.filter((p) => p.isNewArrival).length;
            if (newCount === 0) return null;
            return (
              <button
                type="button"
                onClick={handleNewArrivalsToggle}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition
                  ${showNewArrivals
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                    : "bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                  }`}
              >
                ✨ New Arrivals
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold
                  ${showNewArrivals ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-700"}`}>
                  {newCount}
                </span>
              </button>
            );
          })()}
        </div>

        {/* ── Content ─────────────────────────────────────────────────── */}
        {loading ? (
          <CustomerProductsSkeleton />
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
            {/* ── Product card grid ── */}
            <div className="grid grid-cols-2 min-[480px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 md:gap-3">
              {cpPaginated.map((product, index) => {
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
                    onClick={() => handleOrderChange(product)}
                    className={`relative group flex flex-col bg-white rounded-2xl border overflow-hidden
                      cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5
                      ${inCart ? "border-green-200 shadow-sm shadow-green-100/60" : "border-gray-100 shadow-sm"}
                      ${oos ? "opacity-60" : ""}`}
                  >
                    {/* ── Image area ── */}
                    <div className="relative w-full h-32 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden shrink-0">
                      {thumb ? (
                        <img src={thumb} alt={product.name} loading="lazy"
                          className="w-full h-full object-contain p-1
                            group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package size={28} className="text-gray-200" />
                        </div>
                      )}

                      {/* New Arrival badge */}
                      {product.isNewArrival && (
                        <span className="absolute top-2 left-2 text-[9px] font-bold bg-indigo-600
                          text-white px-2 py-0.5 rounded-full shadow-sm flex items-center gap-0.5">
                          ✨ NEW
                        </span>
                      )}

                      {/* Multiple images badge */}
                      {Array.isArray(product.images) && product.images.length > 1 && (
                        <span className="absolute top-2 left-2 text-[9px] font-bold bg-black/50
                          text-white px-1.5 py-0.5 rounded-full">
                          {product.images.length} photos
                        </span>
                      )}

                      {/* In-cart badge */}
                      {inCart && (
                        <div className="absolute top-2 right-2 bg-green-500 text-white
                          text-[10px] font-bold px-2 py-0.5 rounded-full shadow flex items-center gap-1">
                          <ShoppingCart size={8} />{cartItem.quantity}
                        </div>
                      )}

                      {/* Out of stock overlay */}
                      {oos && (
                        <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                          <span className="bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow">
                            Out of stock
                          </span>
                        </div>
                      )}
                    </div>

                    {/* ── Card body ────────────────────────────────── */}
                    <div className="p-2.5 flex flex-col gap-1.5">
                      {/* Category chip */}
                      <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50
                        border border-indigo-100 px-2 py-0.5 rounded-full w-fit max-w-full truncate tracking-wide uppercase">
                        {product.categoryId?.name || "—"}
                      </span>

                      {/* Product name — 2 lines max */}
                      <p className="font-bold text-gray-900 text-sm leading-snug line-clamp-2 min-h-[1.75rem]">
                        {product.name}
                      </p>

                      {/* Description — 1 line only to keep card compact */}
                      {product.description && (
                        <p className="text-[11px] text-gray-400 line-clamp-1 leading-relaxed">
                          {product.description}
                        </p>
                      )}

                      {/* Wholesale price for staff */}
                      {user?.role === "staff" && showWholesaleCol && (
                        <p className="text-[11px] text-amber-600 font-semibold">
                          WS: {product.wholesalePrice != null ? `₦${Number(product.wholesalePrice).toLocaleString()}` : "—"}
                        </p>
                      )}

                      {/* Stock badge */}
                      {canSeeStock && <div><StockBadge stock={product.stock} /></div>}

                      {/* ── Price + action row — stacked so long prices never fight the button ── */}
                      <div className="mt-auto pt-1.5 border-t border-gray-50 flex flex-col gap-1.5"
                        onClick={(e) => e.stopPropagation()}>
                        {/* Price — full width, no constraint */}
                        <div>
                          <p className="text-base font-extrabold text-gray-900 leading-none break-all">
                            ₦{Number(price).toLocaleString()}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {user?.role === "wholesale" && (
                              <span className="text-[9px] text-amber-600 font-bold tracking-wide">WSP</span>
                            )}
                            {user?.role === "customer" && (
                              <span className="text-[9px] text-indigo-500 font-bold tracking-wide">RTP</span>
                            )}
                          </div>
                        </div>
                        {/* Action button — full row, easy to tap */}
                        <div className="flex justify-end">
                          <QuickAddButton
                            product={product}
                            cartItem={cartItem}
                            onAdd={() => handleQuickAdd(product)}
                            onIncrease={() => handleQuickIncrease(product._id)}
                            onDecrease={() => handleQuickDecrease(product._id)}
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* ── Pagination ────────────────────────────────────────── */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
                <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium
                    text-gray-600 hover:bg-white disabled:opacity-40 transition shadow-sm">
                  ← Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .reduce((acc, p, i, arr) => { if (i > 0 && p - arr[i - 1] > 1) acc.push("…"); acc.push(p); return acc; }, [])
                  .map((p, i) => p === "…"
                    ? <span key={`e${i}`} className="text-gray-400 text-sm px-1">…</span>
                    : <button key={p} onClick={() => setCurrentPage(p)}
                        className={`w-9 h-9 rounded-xl text-sm font-semibold border transition shadow-sm
                          ${p === currentPage
                            ? "bg-green-600 text-white border-green-600 shadow-green-200"
                            : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                        {p}
                      </button>
                  )}
                <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium
                    text-gray-600 hover:bg-white disabled:opacity-40 transition shadow-sm">
                  Next →
                </button>
              </div>
            )}
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
