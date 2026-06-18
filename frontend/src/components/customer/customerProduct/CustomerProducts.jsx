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

// ─── Cart route per role ────────────────────────────────────────────────────
const CART_PATH = {
  staff:     "/customer-dashboard/orders",
  customer:  "/user-dashboard/orders",
  wholesale: "/wholesale-dashboard/orders",
};

// ─── Stock badge (only shown to staff / admin) ──────────────────────────────
const StockBadge = ({ stock }) => {
  if (stock === 0)
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-500 border border-red-100">
        <AlertTriangle size={10} /> Out of stock
      </span>
    );
  if (stock < 5)
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-600 border border-amber-100">
        Only {stock} left
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">
      {stock} in stock
    </span>
  );
};

// ─── Floating cart qty badge on button ─────────────────────────────────────
const CartBadge = ({ qty }) => (
  <AnimatePresence>
    {qty > 0 && (
      <motion.span
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        className="absolute -top-2 -right-2 min-w-[20px] h-5 px-1.5
          bg-green-500 text-white text-xs font-bold rounded-full
          flex items-center justify-center shadow-md shadow-green-200 z-10"
      >
        {qty}
      </motion.span>
    )}
  </AnimatePresence>
);

// ─── Quick Add/Remove button (+ or +/-) ────────────────────────────────────
// Shows + when no order exists
// Shows +/- with quantity when product is in cart
const QuickAddButton = ({ product, cartItem, onAdd, onIncrease, onDecrease }) => {
  const inCart = !!cartItem;

  if (product.stock < 1)
    return (
      <button
        disabled
        className="w-auto px-3 py-2 rounded-lg bg-gray-100 text-gray-400 text-xs font-bold
          cursor-not-allowed border border-gray-200 flex items-center justify-center"
      >
        Out of stock
      </button>
    );

  if (!inCart) {
    // Show only + button when not in cart
    return (
      <motion.button
        onPointerEnter={() => { try { window.dispatchEvent(new CustomEvent('hideFloatingCart', { detail: { hide: true } })); } catch (_) {} }}
        onPointerLeave={() => { try { window.dispatchEvent(new CustomEvent('hideFloatingCart', { detail: { hide: false } })); } catch (_) {} }}
        onClick={(e) => {
          e.stopPropagation();
          onAdd();
        }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        className="w-10 h-10 rounded-lg bg-green-600 text-white text-lg font-bold
          hover:bg-green-700 transition-all shadow-sm border border-green-600 flex items-center justify-center"
      >
        +
      </motion.button>
    );
  }

  const hasOrderId = !!cartItem?.orderId;
  const canDecrease = cartItem?.quantity > 0;

  // Show +/- with quantity when in cart
  return (
    <div
      className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-2 py-1"
      onPointerEnter={() => { try { window.dispatchEvent(new CustomEvent('hideFloatingCart', { detail: { hide: true } })); } catch (_) {} }}
      onPointerLeave={() => { try { window.dispatchEvent(new CustomEvent('hideFloatingCart', { detail: { hide: false } })); } catch (_) {} }}
    >
      <motion.button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (canDecrease) onDecrease();
        }}
        whileHover={canDecrease ? { scale: 1.08 } : {}}
        whileTap={canDecrease ? { scale: 0.92 } : {}}
        disabled={!canDecrease}
        className={`w-7 h-7 rounded text-red-600 transition-all flex items-center justify-center font-bold text-sm
          ${canDecrease ? "hover:bg-red-100" : "bg-red-50 text-red-200 cursor-not-allowed"}`}
      >
        −
      </motion.button>
      <span className="font-bold text-green-700 text-sm min-w-[20px] text-center">
        {cartItem.quantity}
      </span>
      <motion.button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (hasOrderId) {
            onIncrease();
          } else {
            onAdd();
          }
        }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        className="w-7 h-7 rounded bg-green-600 text-white hover:bg-green-700 transition-all flex items-center justify-center font-bold text-sm"
      >
        +
      </motion.button>
    </div>
  );
};

// ─── Main component ─────────────────────────────────────────────────────────
const CustomerProducts = () => {
  const { user } = useAuth();

  // Customers must NOT see available stock counts — only staff/admin can
  const canSeeStock = user?.role === "staff" || user?.role === "admin";
  const cartPath   = CART_PATH[user?.role] ?? "/user-dashboard/orders";

  // ── State declarations ─────────────────────────────────────────────────────
  const [categories,        setCategories]        = useState([]);
  const [products,          setProducts]          = useState([]);
  const [filteredProducts,  setFilteredProducts]  = useState([]);
  const [cartMap,           setCartMap]           = useState({}); // { productId: { orderId, quantity } }
  const cartMapRef = useRef(cartMap);
  const [openModal,         setOpenModal]         = useState(false);
  const [loading,           setLoading]           = useState(true);
  const [searchQuery,       setSearchQuery]       = useState("");
  const [selectedCategory,  setSelectedCategory]  = useState("");
  const [showWholesaleCol,  setShowWholesaleCol]  = useState(false);
  const [orderData,         setOrderData]         = useState({
    orderId: "", productId: "", productName: "", productImage: "",
    productDescription: "", productCategory: "",
    quantity: 1, total: 0, stock: 0, price: 0,
  });

  // ── Initial load: products + cart ─────────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [prodRes, cartRes] = await Promise.all([
        axiosInstance.get("/products"),
        axiosInstance.get("/orders"),
      ]);

      if (prodRes.data.success) {
        setCategories(prodRes.data.categories);
        setProducts(prodRes.data.products);
        setFilteredProducts(prodRes.data.products);
      }

      const cartOrders = cartRes.data.data || cartRes.data.orders || [];
      const map = {};
      cartOrders.forEach((o) => {
        const pid = o.product?._id || o.productId;
        if (pid) {
          map[pid] = {
            orderId: o._id,
            quantity: o.quantity,
          };
        }
      });
      setCartMap(map);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Setup: Load staff wholesale preference ────────────────────────────────
  useEffect(() => {
    if (user?.role === "staff") {
      try {
        const stored = localStorage.getItem("melech_staff_show_wholesale");
        setShowWholesaleCol(stored !== null ? JSON.parse(stored) : true);
      } catch {
        setShowWholesaleCol(true);
      }
    }
  }, []); // Empty dependency array - runs once

  // ── Load products and orders ─────────────────────────────────────────────
  useEffect(() => {
    fetchAll();
  }, [fetchAll]); // Properly depends on fetchAll

  // ── SSE: refresh cart map when admin changes order status ─────────────────
  // Keeps the product page cart pill and +/- quantities in sync in real time.
  useEffect(() => {
    const token = localStorage.getItem("pos-token");
    if (!token) return;

    const base = import.meta.env.VITE_API_URL || "/api";
    const url  = `${base}/placed-orders/stream?token=${encodeURIComponent(token)}`;
    const es   = new EventSource(url);

    es.addEventListener("placedOrderUpdated", () => {
      fetchAll();
    });

    es.addEventListener("error", () => {
      es.close();
    });

    return () => es.close();
  }, [fetchAll]);

  // ── For wholesale users: lock server-side cart to wholesale pricing on load ──
  useEffect(() => {
    if (user?.role !== "wholesale") return;
    axiosInstance.post("/orders/set-price-mode/wholesale").catch(() => {});
  }, [user]);

  useEffect(() => {
    const handlePriceUpdate = (e) => {
      if (e?.detail?.priceChanged) {
        fetchAll();
      }
    };
    window.addEventListener("ordersUpdated", handlePriceUpdate);
    return () => window.removeEventListener("ordersUpdated", handlePriceUpdate);
  }, [fetchAll]);

  useEffect(() => {
    if (!openModal || !orderData.productId) return;
    const updatedProduct = products.find((p) => p._id === orderData.productId);
    if (!updatedProduct) return;

    const storedMode = (() => {
      try { return localStorage.getItem("melech_staff_price_mode"); } catch { return null; }
    })();
    // Wholesale-role users always get wholesale pricing regardless of the staff toggle
    const isWholesale = user?.role === "wholesale" || storedMode === "wholesale";
    const retailPrice = updatedProduct.price;
    const wholesalePrice = updatedProduct.wholesalePrice ?? null;
    const newPrice = isWholesale ? (wholesalePrice ?? retailPrice) : retailPrice;
    const newTotal = (Number(orderData.quantity) || 0) * newPrice;

    setOrderData((prev) => {
      if (
        prev.price === newPrice &&
        prev.retailPrice === retailPrice &&
        prev.wholesalePrice === wholesalePrice &&
        prev.total === newTotal &&
        prev.priceMode === (isWholesale ? "wholesale" : "retail")
      ) {
        return prev;
      }
      return {
        ...prev,
        price: wholesalePrice !== null ? newPrice : retailPrice,
        total: newTotal,
        retailPrice,
        wholesalePrice,
        priceMode: isWholesale ? "wholesale" : "retail",
      };
    });
  }, [products, openModal, orderData.productId, orderData.quantity]);

  useEffect(() => {
    cartMapRef.current = cartMap;
  }, [cartMap]);

  const dispatchOrdersUpdated = useCallback((nextCartMap) => {
    try {
      const total = Object.values(nextCartMap).reduce((sum, item) => sum + (item.quantity || 0), 0);
      window.dispatchEvent(new CustomEvent("ordersUpdated", { detail: { cartMap: nextCartMap, total } }));
    } catch (e) {
      // ignore old browser failures
    }
  }, []);

  // ── Quick add (add product to cart) ────────────────────────────────────────
  const handleQuickAdd = useCallback((product) => {
    const prevItem = cartMapRef.current[product._id];
    const currentQty = prevItem?.quantity || 0;
    if (currentQty >= product.stock) {
      toast.warning("Cannot add more than available stock");
      return;
    }

    const storedMode = (() => {
      try { return localStorage.getItem("melech_staff_price_mode"); } catch { return null; }
    })();
    // Wholesale-role users always get wholesale pricing regardless of the staff toggle
    const isWholesale = user?.role === "wholesale" || storedMode === "wholesale";
    const unitPrice = isWholesale ? (product.wholesalePrice ?? product.price) : product.price;

    const previousState = { ...cartMapRef.current };
    const nextCartMap = {
      ...previousState,
      [product._id]: {
        orderId: prevItem?.orderId || "",
        quantity: currentQty + 1,
      },
    };

    setCartMap(nextCartMap);
    dispatchOrdersUpdated(nextCartMap);

    axiosInstance
      .post("/orders/add", {
        productId: product._id,
        quantity: 1,
        price: unitPrice,
        priceMode: isWholesale ? "wholesale" : "retail",
        isWholesale,
      })
      .then((res) => {
        const newOrder = res.data;
        if (newOrder && newOrder._id) {
          setCartMap((prev) => {
            const updated = {
              ...prev,
              [product._id]: { orderId: newOrder._id, quantity: newOrder.quantity || 1 },
            };
            dispatchOrdersUpdated(updated);
            return updated;
          });
        }
      })
      .catch((err) => {
        console.error("Failed to add to cart:", err);
        setCartMap(previousState);
        dispatchOrdersUpdated(previousState);
      });
  }, [dispatchOrdersUpdated]);

  // ── Quick increase (increment quantity) ─────────────────────────────────────
  const handleQuickIncrease = useCallback((productId) => {
    const cartItem = cartMap[productId];
    if (!cartItem) return;

    const product = products.find((p) => p._id === productId);
    if (!product) return;
    if (cartItem.quantity >= product.stock) {
      toast.warning("Cannot increase beyond available stock");
      return;
    }

    if (!cartItem.orderId) {
      // No orderId yet: fallback to another add request
      handleQuickAdd(product);
      return;
    }

    const previousState = { ...cartMap };
    const nextCartMap = {
      ...cartMap,
      [productId]: {
        ...cartItem,
        quantity: cartItem.quantity + 1,
      },
    };

    setCartMap(nextCartMap);
    dispatchOrdersUpdated(nextCartMap);

    axiosInstance
      .post(`/orders/increase/${cartItem.orderId}`)
      .then((res) => {
        const updated = res.data;
        if (updated && updated._id && updated.quantity !== undefined) {
          setCartMap((prev) => {
            const next = {
              ...prev,
              [productId]: { orderId: updated._id, quantity: updated.quantity },
            };
            dispatchOrdersUpdated(next);
            return next;
          });
        }
      })
      .catch((err) => {
        console.error("Failed to increase quantity:", err);
        setCartMap(previousState);
        dispatchOrdersUpdated(previousState);
      });
  }, [cartMap, dispatchOrdersUpdated, handleQuickAdd, products]);

  // ── Quick decrease (decrement quantity) ─────────────────────────────────────
  const handleQuickDecrease = useCallback((productId) => {
    const cartItem = cartMap[productId];
    if (!cartItem) return;

    const previousState = { ...cartMap };
    const nextCartMap = cartItem.quantity <= 1
      ? (() => {
          const next = { ...cartMap };
          delete next[productId];
          return next;
        })()
      : ({
          ...cartMap,
          [productId]: {
            ...cartItem,
            quantity: cartItem.quantity - 1,
          },
        });

    setCartMap(nextCartMap);
    dispatchOrdersUpdated(nextCartMap);

    // If the item has not yet been persisted on the server, just update locally.
    if (!cartItem.orderId) {
      return;
    }

    axiosInstance
      .post(`/orders/reduce/${cartItem.orderId}`)
      .then((res) => {
        const updated = res.data;
        if (updated?.deleted) {
          setCartMap((prev) => {
            const next = { ...prev };
            delete next[productId];
            dispatchOrdersUpdated(next);
            return next;
          });
          return;
        }
        if (updated && updated._id && updated.quantity !== undefined) {
          setCartMap((prev) => {
            const next = {
              ...prev,
              [productId]: { orderId: updated._id, quantity: updated.quantity },
            };
            dispatchOrdersUpdated(next);
            return next;
          });
        }
      })
      .catch((err) => {
        console.error("Failed to decrease quantity:", err);
        const status = err?.response?.status;
        if (status === 404) {
          setCartMap((prev) => {
            const next = { ...prev };
            delete next[productId];
            dispatchOrdersUpdated(next);
            return next;
          });
          return;
        }

        setCartMap(previousState);
        dispatchOrdersUpdated(previousState);
      });
  }, [cartMap, dispatchOrdersUpdated]);

  // ── Patch cart (used by OrderModal) ────────────────────────────────────────
  // Called by OrderModal when user changes quantity in the modal.
  // qty === 0 means the item was removed.
  const patchCart = useCallback((productId, newQty) => {
    const next = { ...cartMapRef.current };
    if (newQty <= 0) {
      delete next[productId];
    } else {
      // Preserve orderId from previous state
      const prevItem = next[productId];
      next[productId] = {
        orderId: prevItem?.orderId || "",
        quantity: newQty,
      };
    }
    setCartMap(next);

    try {
      const total = Object.values(next).reduce((sum, item) => sum + (item.quantity || 0), 0);
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("ordersUpdated", { detail: { cartMap: next, total } }));
      }, 0);
    } catch (e) {
      // ignore dispatch errors in older browsers
    }
  }, []);

  // ── Filters ─────────────────────────────────────────────────────────
  const applyFilters = useCallback(
    (query, catId) => {
      let result = products;
      // catId === "" means "All Categories" — skip the category filter entirely
      if (catId) result = result.filter((p) =>
        (p.categoryId?._id ?? p.categoryId) === catId
      );
      if (query) result = result.filter((p) =>
        p.name.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredProducts(result);
    },
    [products]
  );

  const handleSearch         = (e) => { const q = e.target.value; setSearchQuery(q);  applyFilters(q, selectedCategory); };
  const handleCategoryChange = (e) => { const c = e.target.value; setSelectedCategory(c); applyFilters(searchQuery, c); };

  // ── Open order modal — NO await before setOpenModal so it opens instantly ──
  // We open the modal immediately with the product data we already have,
  // then silently update it with the existing order (if any) in the background.
  // This removes ALL perceived latency — the modal appears in <16 ms.
  const handleOrderChange = (product) => {
    // 1. Snapshot what we know right now → open modal immediately
    const storedMode = (() => {
      try { return localStorage.getItem("melech_staff_price_mode"); } catch { return null; }
    })();
    // Wholesale-role users always get wholesale pricing regardless of the staff toggle
    const useWholesale = user?.role === "wholesale" || storedMode === "wholesale";

    const basePrice = useWholesale ? (product.wholesalePrice ?? product.price) : product.price;
    const localCartItem = cartMap[product._id];
    const base = {
      orderId: localCartItem?.orderId || "",
      productId:          product._id,
      productName:        product.name,
      productImage:       product.image,
      productDescription: product.description,
      productCategory:    product.categoryId?.name || "",
      quantity:           localCartItem?.quantity || 0,
      total:              (localCartItem?.quantity || 0) * basePrice,
      stock:              product.stock,
      price:              basePrice,
      priceMode:          useWholesale ? "wholesale" : "retail",
      wholesalePrice:     product.wholesalePrice ?? null,  // ✅ store for instant recalc
      retailPrice:        product.price,                    // ✅ store for instant recalc
    };
    setOrderData(base);
    setOpenModal(true);          // ← opens BEFORE the network request
    try { window.dispatchEvent(new CustomEvent("modalVisibility", { detail: { open: true } })); } catch (e) { }

    // 2. Hydrate with existing order silently in the background
    axiosInstance
      .get(`/orders/product/${product._id}`)
      .then((res) => {
        const existing = res.data.order || res.data.data || res.data._doc || res.data;
        if (res.data.success && existing?._id) {
          const localCartItem = cartMapRef.current[product._id];
          const localQuantity = localCartItem?.quantity ?? base.quantity;
          const effectivePrice = useWholesale ? (product.wholesalePrice ?? product.price) : product.price;
          const effectiveMode = useWholesale ? "wholesale" : "retail";
          const effectiveTotal = localQuantity * effectivePrice;
          setOrderData({
            ...base,
            orderId:   existing._id || localCartItem?.orderId || "",
            quantity:  localQuantity,
            total:     effectiveTotal,
            price:     effectivePrice,
            priceMode: effectiveMode,
          });
        }
      })
      .catch(() => {
        // Existing order fetch failed — no problem, modal already has base data
      });
  };

  const totalCartItems = Object.values(cartMap).reduce((sum, item) => sum + (item.quantity || 0), 0);

  // ─── Render ───────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">

      {/* ── Page header ───────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center">
              <ShoppingBag size={18} className="text-green-600" />
            </div>
            <h1 className="font-bold text-2xl text-gray-900">Products</h1>
          </div>
          <p className="text-sm text-gray-500 mt-0.5 ml-11">
            Browse and add items to your cart
          </p>
        </div>

        {/*
          ── Cart summary pill ──────────────────────────────────────────
          Clickable Link → routes to the correct cart page for the user's role.
          Only appears when there's at least one item in the cart.
        */}
        <AnimatePresence>
          {totalCartItems > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.88 }}
              transition={{ type: "spring", stiffness: 380, damping: 22 }}
              className="self-start md:self-auto"
            >
              <Link
                to={cartPath}
                className="flex items-center gap-2 bg-green-50 border border-green-200
                  px-4 py-2 rounded-xl hover:bg-green-100 hover:border-green-300
                  active:scale-95 transition-all duration-150 group"
                aria-label={`View cart — ${totalCartItems} item${totalCartItems !== 1 ? "s" : ""}`}
              >
                <ShoppingCart
                  size={15}
                  className="text-green-600 group-hover:scale-110 transition-transform duration-150"
                />
                <span className="text-sm font-semibold text-green-700 whitespace-nowrap">
                  {totalCartItems} item{totalCartItems !== 1 ? "s" : ""} in cart
                </span>
                {/* Subtle arrow that appears on hover */}
                <span className="text-green-400 text-xs opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-150">
                  →
                </span>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Filters bar ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative">
          <SlidersHorizontal
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <select
            onChange={handleCategoryChange}
            value={selectedCategory}
            className="appearance-none border border-gray-200 rounded-xl pl-9 pr-10 py-2.5
              text-sm text-gray-700 bg-white focus:outline-none focus:ring-2
              focus:ring-green-400 focus:border-transparent transition cursor-pointer
              shadow-sm hover:border-gray-300"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="relative flex-1 max-w-sm">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search products…"
            value={searchQuery}
            onChange={handleSearch}
            className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5
              text-sm text-gray-700 bg-white focus:outline-none focus:ring-2
              focus:ring-green-400 focus:border-transparent transition shadow-sm
              hover:border-gray-300 placeholder:text-gray-400"
          />
        </div>

        {user?.role === "staff" && (
          <button
            type="button"
            onClick={() => {
              setShowWholesaleCol((prev) => {
                const next = !prev;
                try { localStorage.setItem("melech_staff_show_wholesale", JSON.stringify(next)); } catch {}
                return next;
              });
            }}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition ${
              showWholesaleCol
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${showWholesaleCol ? "bg-green-600" : "bg-gray-400"}`} />
            Wholesale column
          </button>
        )}

        <div className="flex items-center text-sm text-gray-400 sm:ml-auto self-center">
          {filteredProducts.length} product{filteredProducts.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────── */}
      {loading ? (
        <CustomerProductsSkeleton />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide w-10">#</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide w-20">Image</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Product</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Category</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Price</th>
                  {user?.role === "staff" && showWholesaleCol && (
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Wholesale</th>
                  )}
                  {/* Stock column — staff/admin only */}
                  {canSeeStock && (
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Stock</th>
                  )}
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Description</th>
                  <th className="px-5 py-3.5 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-50">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((product, index) => {
                    const cartItem = cartMap[product._id];
                    const inCart  = !!cartItem;

                    return (
                      <motion.tr
                        key={product._id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: Math.min(index * 0.02, 0.3) }}
                        onClick={() => handleOrderChange(product)}
                        className={`transition-colors hover:bg-gray-50/80 cursor-pointer ${inCart ? "bg-green-50/30" : ""}`}
                      >
                        <td className="px-5 py-4 text-sm text-gray-400 font-medium">{index + 1}</td>

                        {/* Image */}
                        <td className="px-5 py-4">
                          <div className="w-14 h-14 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 shadow-sm">
                            {product.image ? (
                              <img
                                src={product.image}
                                alt={product.name}
                                className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-300">
                                <Package size={20} />
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Name */}
                        <td className="px-5 py-4">
                          <p className="font-semibold text-gray-800 text-sm leading-tight">{product.name}</p>
                        </td>

                        {/* Category */}
                        <td className="px-5 py-4">
                          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">
                            {product.categoryId?.name}
                          </span>
                        </td>

                        {/* Price — wholesale users see their wholesale price */}
                        <td className="px-5 py-4">
                          {user?.role === "wholesale" ? (
                            <span className="font-bold text-gray-800 text-sm">
                              ₦{Number(product.wholesalePrice ?? product.price).toLocaleString()}
                            </span>
                          ) : (
                            <span className="font-bold text-gray-800 text-sm">
                              ₦{Number(product.price).toLocaleString()}
                            </span>
                          )}
                        </td>
                        {user?.role === "staff" && showWholesaleCol && (
                          <td className="px-5 py-4">
                            {product.wholesalePrice != null ? (
                              <span className="font-semibold text-amber-700">₦{Number(product.wholesalePrice).toLocaleString()}</span>
                            ) : (
                              <span className="text-gray-300 text-xs">—</span>
                            )}
                          </td>
                        )}

                        {/* Stock — staff/admin only */}
                        {canSeeStock && (
                          <td className="px-5 py-4">
                            <StockBadge stock={product.stock} />
                          </td>
                        )}

                        {/* Description */}
                        <td className="px-5 py-4 max-w-[200px]">
                          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                            {product.description || "—"}
                          </p>
                        </td>

                        {/* Action — Quick add/remove button */}
                        <td className="px-5 py-4 text-center">
                          <QuickAddButton
                            product={product}
                            cartItem={cartMap[product._id] || null}
                            onAdd={() => handleQuickAdd(product)}
                            onIncrease={() => handleQuickIncrease(product._id)}
                            onDecrease={() => handleQuickDecrease(product._id)}
                          />
                        </td>
                      </motion.tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={canSeeStock ? 9 : 8} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-3 text-gray-400">
                        <Package size={36} className="text-gray-200" />
                        <p className="text-sm font-medium">No products found</p>
                        <p className="text-xs">Try adjusting your search or filter</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            <AnimatePresence>
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product, index) => {
                  const cartItem = cartMap[product._id] || null;

                  return (
                    <motion.div
                      key={product._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: Math.min(index * 0.03, 0.25) }}
                      onClick={() => handleOrderChange(product)}
                      className={`relative rounded-2xl border shadow-sm overflow-hidden transition-shadow hover:shadow-md cursor-pointer
                        ${cartItem
                          ? "border-green-200 bg-gradient-to-br from-white to-green-50/40"
                          : "border-gray-100 bg-white"
                        }`}
                    >
                      {cartItem && (
                        <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl flex items-center gap-1 z-10">
                          <ShoppingCart size={11} />
                          {cartItem.quantity} in cart
                        </div>
                      )}

                      <div className="p-4">
                        <div className="flex gap-4">
                          <div className="w-20 h-20 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 flex-shrink-0 shadow-sm">
                            {product.image ? (
                              <img
                                src={product.image}
                                alt={product.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-300">
                                <Package size={24} />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0 pt-0.5">
                            <h3 className="font-bold text-gray-900 text-base leading-tight truncate pr-16">
                              {product.name}
                            </h3>
                            <span className="inline-block text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-lg mt-1 mb-2">
                              {product.categoryId?.name}
                            </span>
                            <p className="text-lg font-bold text-green-600 leading-none">
                              ₦{(user?.role === "wholesale"
                                ? (product.wholesalePrice ?? product.price)
                                : product.price
                              ).toLocaleString()}
                            </p>
                            {user?.role === "staff" && showWholesaleCol && (
                              <p className="text-xs text-amber-700 font-semibold mt-2">
                                Wholesale: {product.wholesalePrice != null ? `₦${Number(product.wholesalePrice).toLocaleString()}` : "—"}
                              </p>
                            )}
                          </div>
                        </div>

                        {product.description && (
                          <p className="text-xs text-gray-500 mt-3 line-clamp-2 leading-relaxed">
                            {product.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                          {/* Stock only shown to staff/admin on mobile too */}
                          {canSeeStock
                            ? <StockBadge stock={product.stock} />
                            : <span />
                          }
                          <QuickAddButton
                            product={product}
                            cartItem={cartItem}
                            onAdd={() => handleQuickAdd(product)}
                            onIncrease={() => handleQuickIncrease(product._id)}
                            onDecrease={() => handleQuickDecrease(product._id)}
                          />
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
                  <Package size={36} className="text-gray-200" />
                  <p className="text-sm font-medium">No products found</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </>
      )}

      {openModal && (
        <OrderModal
            orderData={orderData}
            setOrderData={setOrderData}
            closeModal={() => { setOpenModal(false); try { window.dispatchEvent(new CustomEvent("modalVisibility", { detail: { open: false } })); } catch (e) {} }}
            patchCart={patchCart}
            showStock={canSeeStock}
            showStockText={canSeeStock}
          />
      )}
    </div>
  );
};

export default CustomerProducts;