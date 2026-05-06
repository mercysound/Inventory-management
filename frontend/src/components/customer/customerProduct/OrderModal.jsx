import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import {
  X,
  Minus,
  Plus,
  ShoppingCart,
  RefreshCw,
  Tag,
  Package,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import axiosInstance from "../../../utils/axiosInstance";

// ─── Stock level badge ────────────────────────────────────────────────────
const StockBadge = ({ stock }) => {
  if (stock === 0)
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600">
        <AlertTriangle size={10} /> Out of stock
      </span>
    );
  if (stock < 5)
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
        Only {stock} left
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
      {stock} in stock
    </span>
  );
};

// ─── Qty stepper button ───────────────────────────────────────────────────
const StepBtn = ({ onClick, disabled, children }) => (
  <motion.button
    type="button"
    onClick={onClick}
    disabled={disabled}
    whileTap={!disabled ? { scale: 0.9 } : {}}
    className={`w-9 h-9 flex items-center justify-center rounded-lg border transition
      ${
        disabled
          ? "bg-gray-100 border-gray-100 text-gray-300 cursor-not-allowed"
          : "bg-white border-gray-300 text-gray-700 hover:border-green-400 hover:text-green-600 active:bg-green-50"
      }`}
  >
    {children}
  </motion.button>
);

// ─── Main modal ───────────────────────────────────────────────────────────
const OrderModal = ({ orderData, setOrderData, closeModal, refreshProducts }) => {
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  const isUpdate = !!orderData.orderId;
  const qty = Number(orderData.quantity) || 0;
  const total = qty * orderData.price;

  // Auto-focus qty input when modal opens
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(t);
  }, []);

  // ── Quantity helpers ────────────────────────────────────────────────
  const setQty = (next) => {
    const n = Math.max(0, Math.min(next, orderData.stock));
    setOrderData((prev) => ({ ...prev, quantity: n, total: n * prev.price }));
  };

  const handleInputChange = (e) => {
    const raw = e.target.value;
    if (raw === "") {
      setOrderData((prev) => ({ ...prev, quantity: "", total: 0 }));
      return;
    }
    const n = parseInt(raw, 10);
    if (isNaN(n) || n < 0) return;
    if (n > orderData.stock) return toast.warning("Not enough stock");
    setQty(n);
  };

  // ── Submit ──────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    const q = Number(orderData.quantity);

    // New orders must have at least 1
    if (!isUpdate && (!q || q < 1))
      return toast.warning("Please add at least 1 item");

    if (q > orderData.stock) return toast.warning("Quantity exceeds stock");

    setLoading(true);
    try {
      // ── isUpdate + qty 0 → delete the cart item ──────────────────
      if (isUpdate && q === 0) {
        const res = await axiosInstance.delete(
          `/orders/remove/${orderData.orderId}`
        );
        if (res.data.success) {
          toast.success("Item removed from cart");
          window.dispatchEvent(new Event("ordersUpdated"));
          refreshProducts();
          closeModal();
        } else {
          toast.error(res.data.message || "Failed to remove item");
        }
        return;
      }

      // ── isUpdate + qty > 0 → patch ────────────────────────────────
      if (isUpdate) {
        const res = await axiosInstance.patch(
          `/orders/update/${orderData.orderId}`,
          { quantity: q, total: orderData.total, price: orderData.price }
        );
        if (res.data.success) {
          toast.success("Cart updated");
          window.dispatchEvent(new Event("ordersUpdated"));
          refreshProducts();
          closeModal();
        } else {
          toast.error(res.data.message || "Update failed");
        }
        return;
      }

      // ── new order ─────────────────────────────────────────────────
      const res = await axiosInstance.post("/orders/add", {
        productId: orderData.productId,
        quantity: q,
        total: orderData.total,
        price: orderData.price,
      });
      if (res.data.success) {
        toast.success("Added to cart!");
        window.dispatchEvent(new Event("ordersUpdated"));
        refreshProducts();
        closeModal();
      } else {
        toast.error(res.data.message || "Failed to place order");
      }
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Something went wrong";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── UI ──────────────────────────────────────────────────────────────
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: "rgba(0,0,0,0.50)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={closeModal}
      >
        <motion.div
          className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
          initial={{ scale: 0.94, y: 24, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.94, y: 24, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 26 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Header ──────────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                <ShoppingCart size={16} className="text-green-600" />
              </div>
              <h2 className="font-bold text-gray-900 text-base">
                {isUpdate ? "Update Order" : "Place Order"}
              </h2>
            </div>
            <button
              onClick={closeModal}
              className="w-8 h-8 flex items-center justify-center rounded-full
                text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
            >
              <X size={18} />
            </button>
          </div>

          {/* ── Product card ─────────────────────────────────────────── */}
          <div className="px-5 pt-5">
            <div className="flex gap-4 bg-gray-50 rounded-xl p-4 border border-gray-100">
              {/* Image */}
              <div className="w-20 h-20 rounded-xl overflow-hidden border border-gray-200 bg-white flex-shrink-0 shadow-sm">
                {orderData.productImage ? (
                  <img
                    src={orderData.productImage}
                    alt={orderData.productName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <Package size={24} />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-base leading-tight truncate">
                  {orderData.productName}
                </h3>
                <div className="flex items-center gap-1.5 mt-0.5 mb-2">
                  <Tag size={11} className="text-gray-400" />
                  <span className="text-xs text-gray-500">
                    {orderData.productCategory}
                  </span>
                </div>
                <StockBadge stock={orderData.stock} />
              </div>
            </div>

            {/* Description */}
            {orderData.productDescription && (
              <p className="text-xs text-gray-500 mt-3 line-clamp-2 leading-relaxed">
                {orderData.productDescription}
              </p>
            )}
          </div>

          {/* ── Price row ────────────────────────────────────────────── */}
          <div className="px-5 mt-4">
            <div className="flex items-center justify-between py-3 border-t border-b border-gray-100">
              <span className="text-sm text-gray-500">Unit price</span>
              <span className="font-semibold text-gray-800">
                ₦{Number(orderData.price || 0).toLocaleString()}
              </span>
            </div>
          </div>

          {/* ── Form ─────────────────────────────────────────────────── */}
          <form onSubmit={handleSubmit} className="px-5 py-5 space-y-5">
            {/* Quantity stepper */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Quantity
              </label>
              <div className="flex items-center gap-3">
                <StepBtn
                  onClick={() => setQty(qty - 1)}
                  disabled={qty <= 0}
                >
                  <Minus size={14} />
                </StepBtn>

                <input
                  ref={inputRef}
                  type="number"
                  value={orderData.quantity}
                  onChange={handleInputChange}
                  min={0}
                  max={orderData.stock}
                  className={`flex-1 text-center border rounded-lg py-2 font-semibold text-lg
                    focus:outline-none focus:ring-2 focus:border-transparent transition
                    [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none
                    [&::-webkit-inner-spin-button]:appearance-none
                    ${isUpdate && qty === 0
                      ? "border-red-300 text-red-500 focus:ring-red-300"
                      : "border-gray-300 text-gray-800 focus:ring-green-400"
                    }`}
                />

                <StepBtn
                  onClick={() => setQty(qty + 1)}
                  disabled={qty >= orderData.stock}
                >
                  <Plus size={14} />
                </StepBtn>
              </div>

              {/* Stock progress bar */}
              {orderData.stock > 0 && (
                <div className="mt-2">
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${
                        qty / orderData.stock > 0.8
                          ? "bg-red-400"
                          : qty / orderData.stock > 0.5
                          ? "bg-amber-400"
                          : "bg-green-400"
                      }`}
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.min((qty / orderData.stock) * 100, 100)}%`,
                      }}
                      transition={{ type: "spring", stiffness: 200 }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1 text-right">
                    {qty} of {orderData.stock} available
                  </p>
                </div>
              )}
            </div>

            {/* Total */}
            <AnimatePresence mode="wait">
              {isUpdate && qty === 0 ? (
                <motion.div
                  key="remove-warning"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="flex items-center justify-between bg-red-50 rounded-xl px-4 py-3 border border-red-100"
                >
                  <span className="text-sm font-medium text-red-600 flex items-center gap-1.5">
                    <Trash2 size={14} />
                    Remove from cart
                  </span>
                  <span className="text-sm font-semibold text-red-400">
                    Item will be deleted
                  </span>
                </motion.div>
              ) : (
                <motion.div
                  key="total"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="flex items-center justify-between bg-green-50 rounded-xl px-4 py-3 border border-green-100"
                >
                  <span className="text-sm font-medium text-green-700">Total</span>
                  <motion.span
                    key={total}
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-xl font-bold text-green-700"
                  >
                    ₦{Number(total || 0).toLocaleString()}
                  </motion.span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Buttons */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={closeModal}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600
                  text-sm font-semibold hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <motion.button
                type="submit"
                disabled={loading || orderData.stock === 0 || (!isUpdate && qty < 1)}
                whileTap={!loading ? { scale: 0.97 } : {}}
                className={`flex-1 py-2.5 rounded-xl text-white text-sm font-semibold
                  flex items-center justify-center gap-2 transition shadow-sm
                  ${
                    loading || orderData.stock === 0 || (!isUpdate && qty < 1)
                      ? "bg-gray-300 cursor-not-allowed"
                      : isUpdate && qty === 0
                      ? "bg-red-500 hover:bg-red-600 shadow-red-200"
                      : "bg-green-600 hover:bg-green-700 shadow-green-200"
                  }`}
              >
                {loading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    {isUpdate && qty === 0 ? "Removing…" : "Saving…"}
                  </>
                ) : isUpdate && qty === 0 ? (
                  <>
                    <Trash2 size={14} />
                    Remove from Cart
                  </>
                ) : isUpdate ? (
                  <>
                    <RefreshCw size={14} />
                    Update Cart
                  </>
                ) : (
                  <>
                    <ShoppingCart size={14} />
                    Add to Cart
                  </>
                )}
              </motion.button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default OrderModal;