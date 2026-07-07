import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
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
  if (!showStock) return null;
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

// ─── Image carousel ──────────────────────────────────────────────────────────
const ImageCarousel = ({ images = [], productName = "" }) => {
  const [idx, setIdx] = useState(0);
  const imgs = images.filter(Boolean);

  if (imgs.length === 0) {
    return (
      <div className="w-full h-56 bg-gradient-to-br from-gray-100 to-gray-200
        flex items-center justify-center">
        <Package size={48} className="text-gray-300" />
      </div>
    );
  }

  const prev = () => setIdx((i) => (i - 1 + imgs.length) % imgs.length);
  const next = () => setIdx((i) => (i + 1) % imgs.length);

  return (
    <div className="relative w-full select-none">
      {/* Main image — taller, flush to top of modal */}
      <div className="w-full h-56 relative overflow-hidden bg-white">
        <AnimatePresence mode="wait" initial={false}>
          <motion.img
            key={idx}
            src={imgs[idx]}
            alt={`${productName} ${idx + 1}`}
            className="w-full h-full object-contain p-2"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.2 }}
          />
        </AnimatePresence>

        {/* Gradient fade at bottom for text legibility */}
        <div className="absolute bottom-0 left-0 right-0 h-16
          bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />

        {/* Prev / Next */}
        {imgs.length > 1 && (
          <>
            <button type="button" onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full
                bg-black/40 hover:bg-black/65 text-white flex items-center justify-center
                transition" aria-label="Previous">
              <ChevronLeft size={16} />
            </button>
            <button type="button" onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full
                bg-black/40 hover:bg-black/65 text-white flex items-center justify-center
                transition" aria-label="Next">
              <ChevronRight size={16} />
            </button>
          </>
        )}

        {/* Counter */}
        {imgs.length > 1 && (
          <span className="absolute bottom-2.5 right-3 text-[11px] font-bold
            bg-black/50 text-white px-2 py-0.5 rounded-full">
            {idx + 1}/{imgs.length}
          </span>
        )}
      </div>

      {/* Dot indicators */}
      {imgs.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
          {imgs.map((_, i) => (
            <button key={i} type="button" onClick={() => setIdx(i)}
              className={`rounded-full transition-all ${
                i === idx ? "w-4 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
const OrderModal = ({ orderData, setOrderData, closeModal, patchCart, showStock, showStockText = true }) => {
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  // Track whether user has touched the quantity input — prevents remove warning on initial open
  const userTouchedQty = useRef(false);

  const isUpdate = !!orderData.orderId;
  const qty      = Number(orderData.quantity) || 0;

  // Lock the main scroll container while modal is open.
  // The app scrolls inside <main id="main-scroll">, NOT document.body,
  // so we must freeze that element. Also freeze body as a fallback.
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const scroller = document.getElementById("main-scroll");
    if (scroller) scroller.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      const scroller = document.getElementById("main-scroll");
      if (scroller) scroller.style.overflow = "";
    };
  }, []);

  // ── Calculate current price based on mode ───────────────────────────────────
  const getCurrentPrice = () => {
    const storedMode = (() => {
      try { return localStorage.getItem("melech_staff_price_mode"); } catch { return null; }
    })();
    const isWholesale = storedMode === "wholesale";
    const wholesale = orderData.wholesalePrice;
    const retail = orderData.retailPrice;
    return isWholesale ? (wholesale ?? retail) : retail;
  };

  const currentPrice = getCurrentPrice();
  const total       = qty * currentPrice;

  // Debug helpers
  const _dbg_currentMode = (() => {
    try { return localStorage.getItem("melech_staff_price_mode"); } catch { return null; }
  })();
  const _dbg_retail = orderData.retailPrice ?? orderData.price ?? 0;
  const _dbg_wholesale = orderData.wholesalePrice ?? null;

  useEffect(() => {
    // Focus qty input after mount — tiny delay to let the modal paint first
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, []);

  // ── React to wholesale mode changes ────────────────────────────────────────
  // When mode changes, sync price and total instantly
  useEffect(() => {
    const updatePriceFromMode = () => {
      setOrderData((prev) => {
        const storedMode = (() => {
          try { return localStorage.getItem("melech_staff_price_mode"); } catch { return null; }
        })();
        const isWholesale = storedMode === "wholesale";
        const wholesale = prev.wholesalePrice;
        const retail = prev.retailPrice;
        const newPrice = isWholesale ? (wholesale ?? retail) : retail;
        const newMode = isWholesale ? "wholesale" : "retail";
        const qty = Number(prev.quantity) || 0;
        const newTotal = qty * newPrice;

        // Only return a new object if something actually changed to avoid extra renders
        if (prev.price === newPrice && prev.priceMode === newMode && prev.total === newTotal) {
          return prev;
        }

        return {
          ...prev,
          price:     newPrice,
          priceMode: newMode,
          total:     newTotal,
        };
      });
    };

    const syncOrderWithCart = (e) => {
      const cartMap = e?.detail?.cartMap;
      if (!cartMap) return;

      setOrderData((prev) => {
        if (!prev.productId) return prev;
        const cartItem = cartMap[prev.productId];
        const nextQty = cartItem?.quantity || 0;
        const currentQty = Number(prev.quantity) || 0;
        if (nextQty === currentQty && cartItem?.orderId === prev.orderId) return prev;

        const storedMode = (() => {
          try { return localStorage.getItem("melech_staff_price_mode"); } catch { return null; }
        })();
        const isWholesale = storedMode === "wholesale";
        const retail = prev.retailPrice;
        const wholesale = prev.wholesalePrice;
        const price = isWholesale ? (wholesale ?? retail) : retail;

        return {
          ...prev,
          orderId: cartItem?.orderId || prev.orderId,
          quantity: nextQty,
          price,
          total: nextQty * price,
        };
      });
    };

    // Listen for custom event from toggle button
    window.addEventListener("priceModeChanged", updatePriceFromMode);
    window.addEventListener("storage", updatePriceFromMode);
    window.addEventListener("ordersUpdated", syncOrderWithCart);

    // Immediately sync once on mount so modal reflects current mode right away
    try { updatePriceFromMode(); } catch (e) { /* ignore */ }

    return () => {
      window.removeEventListener("priceModeChanged", updatePriceFromMode);
      window.removeEventListener("storage", updatePriceFromMode);
      window.removeEventListener("ordersUpdated", syncOrderWithCart);
    };
  }, []);

  // ── Quantity helpers (recalculate based on current mode) ──────────────────
  const setQty = (next) => {
    userTouchedQty.current = true;
    const n = Math.max(0, Math.min(next, orderData.stock));
    const storedMode = (() => {
      try { return localStorage.getItem("melech_staff_price_mode"); } catch { return null; }
    })();
    const isWholesale = storedMode === "wholesale";
    
    // Validate prices — ensure wholesale <= retail
    let wholesale = orderData.wholesalePrice;
    let retail = orderData.retailPrice;
    
    if (wholesale && retail && wholesale > retail) {
      // Prices are inverted, swap them
      [wholesale, retail] = [retail, wholesale];
    }
    
    const price = isWholesale
      ? (wholesale ?? retail)
      : retail;
    setOrderData((prev) => ({ ...prev, quantity: n, price, total: n * price }));
  };

  const handleInputChange = (e) => {
    userTouchedQty.current = true;
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
      const storedMode = (() => {
        try { return localStorage.getItem("melech_staff_price_mode"); } catch { return null; }
      })();
      const bodyPriceMode = orderData.priceMode || (storedMode === "wholesale" ? "wholesale" : "retail");

      if (isUpdate && q === 0) {
        return axiosInstance.delete(`/orders/remove/${orderData.orderId}`);
      }
      if (isUpdate) {
        return axiosInstance.patch(`/orders/update/${orderData.orderId}`, {
          quantity: q,
          price: currentPrice,     // use current calculated price
          priceMode: bodyPriceMode,
        });
      }
      return axiosInstance.post("/orders/add", {
        productId,
        quantity: q,
        price: currentPrice,      // use current calculated price
        priceMode: bodyPriceMode,
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
      <motion.div
        className="fixed inset-0 flex items-end sm:items-center justify-center overflow-y-auto"
        style={{ backgroundColor: "rgba(0,0,0,0.55)", touchAction: "none", zIndex: 9999 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={closeModal}
      >
        <motion.div
          className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl
            flex flex-col overflow-hidden"
          style={{ maxHeight: "92vh" }}
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0,      opacity: 1 }}
          exit={{   y: "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 38, mass: 0.9 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Image carousel — flush to top, rounded top corners ── */}
          <div className="relative flex-shrink-0">
            {/* Close button floats over the image */}
            <button
              onClick={closeModal}
              className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center
                rounded-full bg-black/40 hover:bg-black/60 text-white transition backdrop-blur-sm"
              aria-label="Close"
            >
              <X size={16} />
            </button>

            {/* Cart badge — shows if item already in cart */}
            {isUpdate && (
              <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5
                bg-green-600/90 text-white text-xs font-semibold px-2.5 py-1.5
                rounded-full backdrop-blur-sm">
                <ShoppingCart size={12} />
                In cart
              </div>
            )}

            {/* Image / carousel */}
            {(() => {
              const imgs = (
                Array.isArray(orderData.images) && orderData.images.length > 0
                  ? orderData.images
                  : orderData.productImage ? [orderData.productImage] : []
              ).filter(Boolean);

              if (imgs.length === 0) {
                return (
                  <div className="w-full h-52 bg-gradient-to-br from-gray-100 to-gray-200
                    flex items-center justify-center">
                    <Package size={48} className="text-gray-300" />
                  </div>
                );
              }

              return (
                <ImageCarousel
                  images={imgs}
                  productName={orderData.productName}
                />
              );
            })()}
          </div>

          {/* ── Scrollable body ──────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto overscroll-contain">

            {/* Product name + category + stock */}
            <div className="px-5 pt-4 pb-3 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 text-lg leading-tight">
                {orderData.productName}
              </h2>
              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-1.5">
                  <Tag size={11} className="text-gray-400" />
                  <span className="text-xs text-gray-500">{orderData.productCategory}</span>
                </div>
                <StockBadge stock={orderData.stock} showStock={showStock} />
              </div>
              {orderData.productDescription && (
                <p className="text-xs text-gray-400 mt-2 line-clamp-2 leading-relaxed">
                  {orderData.productDescription}
                </p>
              )}

              {/* Admin/staff only: batch number + expiry date */}
              {showStock && (orderData.batchNumber || orderData.expiryDate) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {orderData.batchNumber && (
                    <span className="inline-flex items-center gap-1 text-xs bg-indigo-50
                      border border-indigo-100 text-indigo-700 px-2.5 py-1 rounded-lg font-medium">
                      📦 Batch: {orderData.batchNumber}
                    </span>
                  )}
                  {orderData.expiryDate && (() => {
                    const days = Math.ceil(
                      (new Date(orderData.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)
                    );
                    const dateStr = new Date(orderData.expiryDate).toLocaleDateString("en-NG", {
                      day: "numeric", month: "short", year: "numeric",
                    });
                    if (days <= 0) return (
                      <span className="inline-flex items-center gap-1 text-xs bg-red-50
                        border border-red-200 text-red-700 px-2.5 py-1 rounded-lg font-semibold">
                        ⚠️ EXPIRED · {dateStr}
                      </span>
                    );
                    if (days <= 21) return (
                      <span className="inline-flex items-center gap-1 text-xs bg-amber-50
                        border border-amber-200 text-amber-700 px-2.5 py-1 rounded-lg font-semibold">
                        ⏳ Expires in {days}d · {dateStr}
                      </span>
                    );
                    return (
                      <span className="inline-flex items-center gap-1 text-xs bg-green-50
                        border border-green-100 text-green-700 px-2.5 py-1 rounded-lg font-medium">
                        ✅ Exp: {dateStr}
                      </span>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Unit price */}
            <div className="px-5 py-3 flex items-center justify-between
              border-b border-gray-100 bg-gray-50/60">
              <span className="text-sm font-medium text-gray-500">Unit price</span>
              <span className="text-base font-bold text-gray-800">
                ₦{Number(currentPrice || 0).toLocaleString()}
              </span>
            </div>

            {/* ── Form ──────────────────────────────────────────────── */}
            <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">

              {/* Quantity stepper */}
              <div>
                <label className="block text-xs font-semibold text-gray-500
                  uppercase tracking-wide mb-2.5">
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
                    className={`flex-1 text-center border rounded-xl py-2.5 font-bold text-xl
                      focus:outline-none focus:ring-2 focus:border-transparent transition
                      [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none
                      [&::-webkit-inner-spin-button]:appearance-none
                      ${isUpdate && qty === 0
                        ? "border-red-300 text-red-500 focus:ring-red-300 bg-red-50"
                        : "border-gray-200 text-gray-800 focus:ring-green-400 bg-white"
                      }`}
                  />
                  <StepBtn onClick={() => setQty(qty + 1)} disabled={qty >= orderData.stock}>
                    <Plus size={14} />
                  </StepBtn>
                </div>

                {/* Stock progress bar */}
                {orderData.stock > 0 && (
                  <div className="mt-3">
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

              {/* Total / remove warning */}
              <AnimatePresence mode="wait">
                {isUpdate && qty === 0 && userTouchedQty.current ? (
                  <motion.div key="remove-warning"
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.1 }}
                    className="flex items-center justify-between bg-red-50
                      rounded-2xl px-4 py-3.5 border border-red-100">
                    <span className="text-sm font-semibold text-red-600 flex items-center gap-2">
                      <Trash2 size={14} /> Remove from cart
                    </span>
                    <span className="text-xs font-medium text-red-400">Will be deleted</span>
                  </motion.div>
                ) : (
                  <motion.div key="total"
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.1 }}
                    className="flex items-center justify-between bg-gradient-to-r
                      from-green-50 to-emerald-50 rounded-2xl px-4 py-3.5
                      border border-green-100">
                    <span className="text-sm font-semibold text-green-700">Total</span>
                    <motion.span key={total}
                      initial={{ scale: 0.88, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.12 }}
                      className="text-2xl font-extrabold text-green-700">
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
                  className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-600
                    text-sm font-semibold hover:bg-gray-50 active:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <motion.button
                  type="submit"
                  disabled={orderData.stock === 0 || (!isUpdate && qty < 1)}
                  whileTap={!(orderData.stock === 0) ? { scale: 0.96 } : {}}
                  transition={{ duration: 0.07 }}
                  className={`flex-1 py-3 rounded-2xl text-white text-sm font-bold
                    flex items-center justify-center gap-2 transition shadow-md
                    ${
                      orderData.stock === 0 || (!isUpdate && qty < 1)
                        ? "bg-gray-300 cursor-not-allowed shadow-none"
                        : isUpdate && qty === 0 && userTouchedQty.current
                        ? "bg-red-500 hover:bg-red-600 shadow-red-200"
                        : "bg-green-600 hover:bg-green-700 shadow-green-200"
                    }`}
                >
                  {isUpdate && qty === 0 && userTouchedQty.current ? (
                    <><Trash2 size={14} /> Remove</>
                  ) : isUpdate ? (
                    <><RefreshCw size={14} /> Update Cart</>
                  ) : (
                    <><ShoppingCart size={14} /> Add to Cart</>
                  )}
                </motion.button>
              </div>
            </form>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default OrderModal;