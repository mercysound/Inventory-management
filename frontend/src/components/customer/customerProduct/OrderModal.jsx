import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import {
  AlertTriangle,
  Minus,
  Package,
  Plus,
  RefreshCw,
  ShoppingCart,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import axiosInstance from "../../../utils/axiosInstance";

// ─── Stock level badge ───────────────────────────────────────────────────────
const StockBadge = ({ stock, showStock }) => {
  if (stock === 0)
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600">
        <AlertTriangle size={10} /> Out of stock
      </span>
    );
  if (!showStock)
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
        Available
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

// ─── Qty stepper button ──────────────────────────────────────────────────────
const StepBtn = ({ onClick, disabled, children }) => (
  <motion.button
    type="button"
    onClick={onClick}
    disabled={disabled}
    whileTap={!disabled ? { scale: 0.88 } : {}}
    transition={{ duration: 0.08 }}
    className={`w-9 h-9 flex items-center justify-center rounded-lg border transition
      ${disabled
        ? "bg-gray-100 border-gray-100 text-gray-300 cursor-not-allowed"
        : "bg-white border-gray-300 text-gray-700 hover:border-green-400 hover:text-green-600 active:bg-green-50"
      }`}
  >
    {children}
  </motion.button>
);

// ─── Main modal ──────────────────────────────────────────────────────────────
const OrderModal = ({ orderData, setOrderData, closeModal, patchCart, showStock, showStockText = true }) => {
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  const isUpdate = !!orderData.orderId;
  const qty      = Number(orderData.quantity) || 0;
  const total    = qty * orderData.price;

  useEffect(() => {
    // Focus qty input after mount — tiny delay to let the modal paint first
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, []);

  // ── Quantity helpers ─────────────────────────────────────────────────
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
    if (n > orderData.stock) {
      toast.warning("Quantity exceeds available stock");
      return;
    }
    setQty(n);
  };

  // ── Submit — fully optimistic ────────────────────────────────────
  //
  // Pattern:
  //   1. Validate locally (instant).
  //   2. Close modal + update cartMap in parent immediately → user sees
  //      the change with zero wait.
  //   3. Fire API in background.
  //   4. On failure: rollback cartMap to previous state, re-open modal
  //      with original data, show error.
  //
  // Security notes:
  //   • `total` is never sent — backend computes price × qty from its own DB.
  //   • `price` is sent as a tamper-detection hint; server must validate it.
  //   • Double-submit blocked by `submittedRef` (survives async closure).
  //   • Per-user rate-limiting is enforced server-side.
  //
  const submittedRef = useRef(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (submittedRef.current) return;  // block double-tap

    const q = Number(orderData.quantity);

    if (!isUpdate && q < 1)   { toast.warning("Please add at least 1 item"); return; }
    if (q > orderData.stock)  { toast.warning("Quantity exceeds available stock"); return; }

    submittedRef.current = true;  // lock immediately

    // ── Snapshot rollback state before any mutation ──────────────
    const prevQty = isUpdate ? (orderData.quantity || 0) : 0;
    const productId = orderData.productId;

    // ── 1. Optimistic UI: update parent cartMap & close modal now ──
    if (isUpdate && q === 0) {
      patchCart(productId, 0);          // remove
      toast.success("Item removed from cart");
    } else if (isUpdate) {
      patchCart(productId, q);          // update qty
      toast.success("Cart updated ✓");
    } else {
      patchCart(productId, q);          // new add
      toast.success("Added to cart! 🛒");
    }
    closeModal();                        // closes before API even starts

    // ── 2. Fire API in background ─────────────────────────────────
    const doRequest = () => {
      if (isUpdate && q === 0) {
        return axiosInstance.delete(`/orders/remove/${orderData.orderId}`);
      }
      if (isUpdate) {
        return axiosInstance.patch(`/orders/update/${orderData.orderId}`, {
          quantity: q,
          price: orderData.price,  // server validates this
        });
      }
      return axiosInstance.post("/orders/add", {
        productId,
        quantity: q,
        price: orderData.price,   // server re-validates against DB price
      });
    };

    doRequest()
      .then((res) => {
        if (!res.data.success) {
          // Server rejected — rollback
          patchCart(productId, prevQty);
          toast.error(res.data.message || "Action failed — cart restored");
        }
        // On success: nothing to do, UI is already correct
      })
      .catch((err) => {
        // Network/server error — rollback
        patchCart(productId, prevQty);
        const msg =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Connection error — cart restored. Please try again.";
        toast.error(msg);
      });
  };

  return (
    <AnimatePresence>
      {/*
        Backdrop — no initial animation delay.
        duration: 0.12 is fast enough to feel snappy without being jarring.
      */}
      <motion.div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        style={{ backgroundColor: "rgba(0,0,0,0.48)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.12 }}
        onClick={closeModal}
      >
        {/*
          Modal panel.
          Mobile: slides up from bottom (sheet pattern — familiar on phones).
          Desktop: pops in from center with a very short spring.
          No delay — duration values are kept ≤ 150ms so it feels instant.
        */}
        <motion.div
          className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0,      opacity: 1 }}
          exit={{   y: "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 480, damping: 36, mass: 0.8 }}
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
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* ── Product card ─────────────────────────────────────────── */}
          <div className="px-5 pt-5">
            <div className="flex gap-4 bg-gray-50 rounded-xl p-4 border border-gray-100">
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
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-base leading-tight truncate">
                  {orderData.productName}
                </h3>
                <div className="flex items-center gap-1.5 mt-0.5 mb-2">
                  <Tag size={11} className="text-gray-400" />
                  <span className="text-xs text-gray-500">{orderData.productCategory}</span>
                </div>
                <StockBadge stock={orderData.stock} showStock={showStock} />
              </div>
            </div>

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
                <StepBtn onClick={() => setQty(qty - 1)} disabled={qty <= 0}>
                  <Minus size={14} />
                </StepBtn>

                <input
                  ref={inputRef}
                  type="number"
                  inputMode="numeric"
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

                <StepBtn onClick={() => setQty(qty + 1)} disabled={qty >= orderData.stock}>
                  <Plus size={14} />
                </StepBtn>
              </div>

              {/* Stock progress bar */}
              {orderData.stock > 0 && (
                <div className="mt-2">
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${
                        qty / orderData.stock > 0.8 ? "bg-red-400"
                        : qty / orderData.stock > 0.5 ? "bg-amber-400"
                        : "bg-green-400"
                      }`}
                      animate={{ width: `${Math.min((qty / orderData.stock) * 100, 100)}%` }}
                      transition={{ duration: 0.15 }}
                    />
                  </div>
                  {showStockText && (
                    <p className="text-xs text-gray-400 mt-1 text-right">
                      {qty} of {orderData.stock} available
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Total / Remove warning */}
            <AnimatePresence mode="wait">
              {isUpdate && qty === 0 ? (
                <motion.div
                  key="remove-warning"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.1 }}
                  className="flex items-center justify-between bg-red-50 rounded-xl px-4 py-3 border border-red-100"
                >
                  <span className="text-sm font-medium text-red-600 flex items-center gap-1.5">
                    <Trash2 size={14} /> Remove from cart
                  </span>
                  <span className="text-sm font-semibold text-red-400">Item will be deleted</span>
                </motion.div>
              ) : (
                <motion.div
                  key="total"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.1 }}
                  className="flex items-center justify-between bg-green-50 rounded-xl px-4 py-3 border border-green-100"
                >
                  <span className="text-sm font-medium text-green-700">Total</span>
                  <motion.span
                    key={total}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1,   opacity: 1 }}
                    transition={{ duration: 0.1 }}
                    className="text-xl font-bold text-green-700"
                  >
                    ₦{Number(total || 0).toLocaleString()}
                  </motion.span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action buttons */}
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
                disabled={orderData.stock === 0 || (!isUpdate && qty < 1)}
                whileTap={!loading ? { scale: 0.96 } : {}}
                transition={{ duration: 0.07 }}
                className={`flex-1 py-2.5 rounded-xl text-white text-sm font-semibold
                  flex items-center justify-center gap-2 transition shadow-sm
                  ${
                    orderData.stock === 0 || (!isUpdate && qty < 1)
                      ? "bg-gray-300 cursor-not-allowed"
                      : isUpdate && qty === 0
                      ? "bg-red-500 hover:bg-red-600 shadow-red-200"
                      : "bg-green-600 hover:bg-green-700 shadow-green-200"
                  }`}
              >
                {isUpdate && qty === 0 ? (
                  <><Trash2 size={14} /> Remove from Cart</>
                ) : isUpdate ? (
                  <><RefreshCw size={14} /> Update Cart</>
                ) : (
                  <><ShoppingCart size={14} /> Add to Cart</>
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