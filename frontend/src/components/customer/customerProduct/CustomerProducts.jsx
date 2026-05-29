import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Package,
  Search,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import axiosInstance from "../../../utils/axiosInstance";
import CustomerProductsSkeleton from "./CustomerProductsSkeleton";
import OrderModal from "./OrderModal";

// ─── Cart route per role ────────────────────────────────────────────────────
const CART_PATH = {
  staff:    "/customer-dashboard/orders",
  customer: "/user-dashboard/orders",
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

// ─── Order / Update button ──────────────────────────────────────────────────
const OrderButton = ({ product, cartQty, onClick }) => {
  const inCart = cartQty > 0;

  if (product.stock < 1)
    return (
      <button
        disabled
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg
          bg-gray-100 text-gray-400 text-xs font-semibold cursor-not-allowed border border-gray-200"
      >
        Unavailable
      </button>
    );

  return (
    <div className="relative inline-block">
      <CartBadge qty={cartQty} />
      <motion.button
        onClick={onClick}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold
          transition-all shadow-sm border
          ${
            inCart
              ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
              : "bg-green-600 text-white border-green-600 hover:bg-green-700 shadow-green-200"
          }`}
      >
        {inCart ? (
          <><CheckCircle2 size={13} /> Update</>
        ) : (
          <><ShoppingCart size={13} /> Order</>
        )}
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

  const [categories,        setCategories]        = useState([]);
  const [products,          setProducts]          = useState([]);
  const [filteredProducts,  setFilteredProducts]  = useState([]);
  const [cartMap,           setCartMap]           = useState({});
  const [openModal,         setOpenModal]         = useState(false);
  const [loading,           setLoading]           = useState(true);
  const [searchQuery,       setSearchQuery]       = useState("");
  const [selectedCategory,  setSelectedCategory]  = useState("");
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
        if (pid) map[pid] = o.quantity;
      });
      setCartMap(map);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    // Re-fetch only when another page (e.g. cart page) signals an external change.
    // Normal add/update is handled locally via patchCart — no reload needed.
    const onExternalUpdate = () => fetchAll();
    window.addEventListener("ordersUpdated", onExternalUpdate);
    return () => window.removeEventListener("ordersUpdated", onExternalUpdate);
  }, [fetchAll]);

  // ── Optimistic local cart patch ────────────────────────────────────
  // Called by OrderModal immediately on tap — mutates only the one changed
  // row in cartMap. No re-fetch, no spinner, no flicker.
  // qty === 0 means the item was removed.
  const patchCart = useCallback((productId, newQty) => {
    setCartMap((prev) => {
      const next = { ...prev };
      if (newQty <= 0) {
        delete next[productId];
      } else {
        next[productId] = newQty;
      }
      return next;
    });
  }, []);

  // ── Filters ─────────────────────────────────────────────────────────
  const applyFilters = useCallback(
    (query, catId) => {
      let result = products;
      if (catId)  result = result.filter((p) => p.categoryId._id === catId);
      if (query)  result = result.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));
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
    const base = {
      orderId: "",
      productId:          product._id,
      productName:        product.name,
      productImage:       product.image,
      productDescription: product.description,
      productCategory:    product.categoryId?.name || "",
      quantity:           0,
      total:              0,
      stock:              product.stock,
      price:              product.price,
    };
    setOrderData(base);
    setOpenModal(true);          // ← opens BEFORE the network request

    // 2. Hydrate with existing order silently in the background
    axiosInstance
      .get(`/orders/product/${product._id}`)
      .then((res) => {
        const existing = res.data.order || res.data.data || res.data._doc || res.data;
        if (res.data.success && existing?._id) {
          setOrderData({
            ...base,
            orderId:  existing._id,
            quantity: existing.quantity,
            total:    existing.totalPrice ?? existing.quantity * product.price,
            price:    existing.price ?? product.price,
          });
        }
      })
      .catch(() => {
        // Existing order fetch failed — no problem, modal already has base data
      });
  };

  const totalCartItems = Object.values(cartMap).reduce((a, b) => a + b, 0);

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
                  {/* Stock column — staff/admin only */}
                  {canSeeStock && (
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Stock</th>
                  )}
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">In Cart</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Description</th>
                  <th className="px-5 py-3.5 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-50">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((product, index) => {
                    const cartQty = cartMap[product._id] || 0;
                    const inCart  = cartQty > 0;

                    return (
                      <motion.tr
                        key={product._id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: Math.min(index * 0.02, 0.3) }} // cap delay at 300ms
                        className={`transition-colors hover:bg-gray-50/80 ${inCart ? "bg-green-50/30" : ""}`}
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

                        {/* Price */}
                        <td className="px-5 py-4">
                          <span className="font-bold text-gray-800 text-sm">
                            ₦{product.price.toLocaleString()}
                          </span>
                        </td>

                        {/* Stock — staff/admin only */}
                        {canSeeStock && (
                          <td className="px-5 py-4">
                            <StockBadge stock={product.stock} />
                          </td>
                        )}

                        {/* In Cart */}
                        <td className="px-5 py-4">
                          <AnimatePresence mode="wait">
                            {inCart ? (
                              <motion.div
                                key="in-cart"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="flex items-center gap-1.5"
                              >
                                <div className="flex items-center gap-1 bg-green-100 text-green-700 px-2.5 py-1 rounded-lg border border-green-200">
                                  <ShoppingCart size={11} />
                                  <span className="text-xs font-bold">{cartQty}</span>
                                </div>
                                <span className="text-xs text-green-600 font-medium">added</span>
                              </motion.div>
                            ) : (
                              <motion.span
                                key="not-in-cart"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-xs text-gray-300"
                              >—</motion.span>
                            )}
                          </AnimatePresence>
                        </td>

                        {/* Description */}
                        <td className="px-5 py-4 max-w-[200px]">
                          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                            {product.description || "—"}
                          </p>
                        </td>

                        {/* Action */}
                        <td className="px-5 py-4 text-center">
                          <OrderButton
                            product={product}
                            cartQty={cartQty}
                            onClick={() => handleOrderChange(product)}
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
                  const cartQty = cartMap[product._id] || 0;
                  const inCart  = cartQty > 0;

                  return (
                    <motion.div
                      key={product._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: Math.min(index * 0.03, 0.25) }}
                      className={`relative rounded-2xl border shadow-sm overflow-hidden transition-shadow hover:shadow-md
                        ${inCart
                          ? "border-green-200 bg-gradient-to-br from-white to-green-50/40"
                          : "border-gray-100 bg-white"
                        }`}
                    >
                      {inCart && (
                        <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl flex items-center gap-1 z-10">
                          <ShoppingCart size={11} />
                          {cartQty} in cart
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
                              ₦{product.price.toLocaleString()}
                            </p>
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
                          <OrderButton
                            product={product}
                            cartQty={cartQty}
                            onClick={() => handleOrderChange(product)}
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
          closeModal={() => setOpenModal(false)}
          patchCart={patchCart}
          showStock={canSeeStock}
          showStockText={canSeeStock}
        />
      )}
    </div>
  );
};

export default CustomerProducts;