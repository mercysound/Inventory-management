import React, { useEffect, useState, useCallback } from "react";
import axiosInstance from "../../../utils/axiosInstance";
import CustomerProductsSkeleton from "./CustomerProductsSkeleton";
import OrderModal from "./OrderModal";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag,
  Search,
  SlidersHorizontal,
  ShoppingCart,
  CheckCircle2,
  AlertTriangle,
  Package,
} from "lucide-react";

// ─── Stock badge ────────────────────────────────────────────────────────────
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

// ─── Cart quantity badge (floating pill) ────────────────────────────────────
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

  if (product.stock < 1) {
    return (
      <button
        disabled
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg
          bg-gray-100 text-gray-400 text-xs font-semibold cursor-not-allowed border border-gray-200"
      >
        Unavailable
      </button>
    );
  }

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
          <>
            <CheckCircle2 size={13} />
            Update
          </>
        ) : (
          <>
            <ShoppingCart size={13} />
            Order
          </>
        )}
      </motion.button>
    </div>
  );
};

// ─── Main component ─────────────────────────────────────────────────────────
const CustomerProducts = () => {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [cartMap, setCartMap] = useState({}); // { productId: quantity }
  const [openModal, setOpenModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  const [orderData, setOrderData] = useState({
    orderId: "",
    productId: "",
    productName: "",
    productImage: "",
    productDescription: "",
    productCategory: "",
    quantity: 1,
    total: 0,
    stock: 0,
    price: 0,
  });

  // ── Fetch products + current cart in parallel ─────────────────────────
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

      // Build a map of productId → cartQuantity
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

    // Also refresh when CustomerOrderPortal changes the cart
    const onUpdate = () => fetchAll();
    window.addEventListener("ordersUpdated", onUpdate);
    return () => window.removeEventListener("ordersUpdated", onUpdate);
  }, [fetchAll]);

  // ── Filter helpers ────────────────────────────────────────────────────
  const applyFilters = useCallback(
    (query, catId) => {
      let result = products;
      if (catId) result = result.filter((p) => p.categoryId._id === catId);
      if (query)
        result = result.filter((p) =>
          p.name.toLowerCase().includes(query.toLowerCase())
        );
      setFilteredProducts(result);
    },
    [products]
  );

  const handleSearch = (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    applyFilters(q, selectedCategory);
  };

  const handleCategoryChange = (e) => {
    const cat = e.target.value;
    setSelectedCategory(cat);
    applyFilters(searchQuery, cat);
  };

  // ── Open modal: pre-load existing order if any ────────────────────────
  const handleOrderChange = async (product) => {
    try {
      setOrderData({
        orderId: "",
        productId: product._id,
        productName: product.name,
        productImage: product.image,
        productDescription: product.description,
        productCategory: product.categoryId?.name || "",
        quantity: 0,
        total: 0,
        stock: product.stock,
        price: product.price,
      });

      const res = await axiosInstance.get(`/orders/product/${product._id}`);
      const existing =
        res.data.order || res.data.data || res.data._doc || res.data;

      if (res.data.success && existing?._id) {
        setOrderData({
          orderId: existing._id,
          productId: product._id,
          productName: product.name,
          productImage: product.image,
          productDescription: product.description,
          productCategory: product.categoryId?.name || "",
          quantity: existing.quantity,
          total: existing.totalPrice ?? existing.quantity * product.price,
          stock: product.stock,
          price: existing.price ?? product.price,
        });
      }
    } catch (err) {
      console.error("Error fetching existing order:", err);
    } finally {
      setOpenModal(true);
    }
  };

  // ── Total cart items (for the header badge) ───────────────────────────
  const totalCartItems = Object.values(cartMap).reduce((a, b) => a + b, 0);

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">

      {/* ── Page header ──────────────────────────────────────────────── */}
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

        {/* Cart summary pill */}
        {totalCartItems > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 bg-green-50 border border-green-200
              px-4 py-2 rounded-xl self-start md:self-auto"
          >
            <ShoppingCart size={15} className="text-green-600" />
            <span className="text-sm font-semibold text-green-700">
              {totalCartItems} item{totalCartItems !== 1 ? "s" : ""} in cart
            </span>
          </motion.div>
        )}
      </div>

      {/* ── Filters bar ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        {/* Category select */}
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
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
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

        {/* Result count */}
        <div className="flex items-center text-sm text-gray-400 sm:ml-auto self-center">
          {filteredProducts.length} product{filteredProducts.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────────── */}
      {loading ? (
        <CustomerProductsSkeleton />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide w-10">
                    #
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide w-20">
                    Image
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Product
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Category
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Price
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Stock
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    In Cart
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Description
                  </th>
                  <th className="px-5 py-3.5 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Action
                  </th>
                </tr>
              </thead>

              <AnimatePresence>
                <tbody className="divide-y divide-gray-50">
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map((product, index) => {
                      const cartQty = cartMap[product._id] || 0;
                      const inCart = cartQty > 0;

                      return (
                        <motion.tr
                          key={product._id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className={`transition-colors hover:bg-gray-50/80
                            ${inCart ? "bg-green-50/30" : ""}`}
                        >
                          {/* S/N */}
                          <td className="px-5 py-4 text-sm text-gray-400 font-medium">
                            {index + 1}
                          </td>

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
                            <p className="font-semibold text-gray-800 text-sm leading-tight">
                              {product.name}
                            </p>
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

                          {/* Stock */}
                          <td className="px-5 py-4">
                            <StockBadge stock={product.stock} />
                          </td>

                          {/* In Cart — NEW COLUMN */}
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
                                  <span className="text-xs text-green-600 font-medium">
                                    added
                                  </span>
                                </motion.div>
                              ) : (
                                <motion.span
                                  key="not-in-cart"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  className="text-xs text-gray-300"
                                >
                                  —
                                </motion.span>
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
                      <td colSpan="9" className="py-20 text-center">
                        <div className="flex flex-col items-center gap-3 text-gray-400">
                          <Package size={36} className="text-gray-200" />
                          <p className="text-sm font-medium">No products found</p>
                          <p className="text-xs">
                            Try adjusting your search or filter
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </AnimatePresence>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            <AnimatePresence>
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product, index) => {
                  const cartQty = cartMap[product._id] || 0;
                  const inCart = cartQty > 0;

                  return (
                    <motion.div
                      key={product._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: index * 0.04 }}
                      className={`relative rounded-2xl border shadow-sm overflow-hidden
                        transition-shadow hover:shadow-md
                        ${inCart
                          ? "border-green-200 bg-gradient-to-br from-white to-green-50/40"
                          : "border-gray-100 bg-white"
                        }`}
                    >
                      {/* In-cart ribbon */}
                      {inCart && (
                        <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl flex items-center gap-1 z-10">
                          <ShoppingCart size={11} />
                          {cartQty} in cart
                        </div>
                      )}

                      <div className="p-4">
                        <div className="flex gap-4">
                          {/* Image */}
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

                          {/* Info */}
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

                        {/* Description */}
                        {product.description && (
                          <p className="text-xs text-gray-500 mt-3 line-clamp-2 leading-relaxed">
                            {product.description}
                          </p>
                        )}

                        {/* Footer */}
                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                          <StockBadge stock={product.stock} />
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

      {/* Order modal */}
      {openModal && (
        <OrderModal
          orderData={orderData}
          setOrderData={setOrderData}
          closeModal={() => setOpenModal(false)}
          refreshProducts={fetchAll}
        />
      )}
    </div>
  );
};

export default CustomerProducts;