import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart, Receipt, Trash2, RotateCcw,
  CheckCircle2, PackageOpen, Store, ShoppingBag,
} from "lucide-react";
import axiosInstance from "../../../utils/axiosInstance";
import StaffTable from "./StaffTable";
import ReceiptModal from "../../share-component/receipt/ReceiptModal";
import { useAuth } from "../../../context/AuthContext";

// Payment options — Paystack removed (online only, not applicable for walk-in)
const PAYMENT_OPTIONS = [
  { value: "cash",          label: "Cash" },
  { value: "card",          label: "Card (POS)" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cash_on_delivery", label: "Cash on Delivery" },
];

const parseOrderError = (err) => {
  const raw = err?.response?.data?.message || err?.message || "";
  if (raw.startsWith("STOCK_ERROR:")) {
    const parts       = raw.replace("STOCK_ERROR:", "").split(":");
    const productName = parts[0] || "This item";
    const requested   = Number(parts[1]) || 0;
    const remaining   = Number(parts[2]) ?? 0;
    const stockLine   = remaining === 0
      ? "It is now completely out of stock — remove it from the cart."
      : `Only ${remaining} unit${remaining !== 1 ? "s" : ""} available, but the cart has ${requested}. Reduce to ${remaining} or less.`;
    return { title: "Stock Conflict", message: `"${productName}" — ${stockLine}`, type: "stock" };
  }
  if (raw.toLowerCase().includes("no active orders")) {
    return { title: "Cart is Empty", message: "Add products before completing the order.", type: "empty" };
  }
  return { title: "Order Failed", message: raw || "Something went wrong.", type: "generic" };
};

// ── Stat card ─────────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, color, iconColor }) => (
  <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 bg-white shadow-sm ${color}`}>
    <div className={`p-2 rounded-xl ${iconColor}`}>
      <Icon size={18} className="text-white" />
    </div>
    <div>
      <p className="text-xs text-gray-500 font-medium leading-none mb-0.5">{label}</p>
      <p className="text-lg font-bold text-gray-800 leading-none">{value}</p>
    </div>
  </div>
);

const StaffOrders = () => {
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const [orders,        setOrders]        = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [customerName,  setCustomerName]  = useState("");
  const [processing,    setProcessing]    = useState(false);
  const [completedOrderId, setCompletedOrderId] = useState(null);

  const [isWholesale, setIsWholesale] = useState(() => {
    try { return localStorage.getItem("melech_staff_price_mode") === "wholesale"; }
    catch { return false; }
  });

  const [showReceiptModal,  setShowReceiptModal]  = useState(false);
  const [invoiceParams,     setInvoiceParams]     = useState(null);
  const [receiptMode,       setReceiptMode]       = useState("preview");

  // ── Fetch orders ──────────────────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const res  = await axiosInstance.get("/orders");
      const data = Array.isArray(res.data) ? res.data : res.data.data || res.data.orders || [];
      setOrders(data);
      // Sync wholesale state from server only on initial load — not on every fetch
      if (data.length > 0) {
        const serverWholesale = data.some((o) => o.priceMode === "wholesale");
        setIsWholesale((prev) => {
          if (prev !== serverWholesale) {
            try { localStorage.setItem("melech_staff_price_mode", serverWholesale ? "wholesale" : "retail"); } catch {}
            return serverWholesale;
          }
          return prev;
        });
      }
    } catch {
      toast.error("Failed to fetch orders.");
    } finally {
      setLoading(false);
    }
  }, []); // no deps — reads nothing from closure except stable setters

  useEffect(() => {
    fetchOrders();
    const handler = () => fetchOrders();
    window.addEventListener("ordersUpdated", handler);
    return () => window.removeEventListener("ordersUpdated", handler);
  }, [fetchOrders]);

  // ── Wholesale toggle — optimistic UI, API in background ─────────────────
  const handleToggleWholesale = async () => {
    const nextMode    = isWholesale ? "retail" : "wholesale";
    const prevMode    = isWholesale ? "wholesale" : "retail";
    const prevOrders  = orders;

    // 1. Update UI instantly — no waiting for the server
    setIsWholesale(nextMode === "wholesale");
    try { localStorage.setItem("melech_staff_price_mode", nextMode); } catch {}
    window.dispatchEvent(new CustomEvent("priceModeChanged", { detail: { mode: nextMode } }));

    // 2. Fire API in background
    try {
      const res = await axiosInstance.post(`/orders/set-price-mode/${nextMode}`);
      if (res.data?.success) {
        // Silently refresh orders to get server-confirmed prices (no loading spinner)
        const fresh = await axiosInstance.get("/orders");
        const data  = Array.isArray(fresh.data) ? fresh.data : fresh.data.data || fresh.data.orders || [];
        setOrders(data);
        toast.success(`Switched to ${nextMode} pricing`);
      } else {
        // Server rejected — roll back
        setIsWholesale(prevMode === "wholesale");
        try { localStorage.setItem("melech_staff_price_mode", prevMode); } catch {}
        toast.error(res.data?.message || "Failed to update prices");
      }
    } catch (err) {
      // Network error — roll back
      setIsWholesale(prevMode === "wholesale");
      setOrders(prevOrders);
      try { localStorage.setItem("melech_staff_price_mode", prevMode); } catch {}
      toast.error(err?.response?.data?.message || "Failed to update prices");
    }
  };

  // ── Computed display orders ───────────────────────────────────────────────
  const displayOrders = orders.map((o) => {
    if (!isWholesale) return o;
    const wp = o.product?.wholesalePrice ?? o.wholesalePrice ?? null;
    if (!wp) return o;
    return { ...o, price: wp, totalPrice: wp * o.quantity };
  });

  const grandTotal  = displayOrders.reduce((s, o) => s + (o.totalPrice || o.quantity * o.price || 0), 0);
  const totalItems  = displayOrders.reduce((s, o) => s + o.quantity, 0);

  // ── Cart actions ──────────────────────────────────────────────────────────
  const handleIncreaseQty = async (orderId) => {
    const prev = orders;
    setOrders((os) => os.map((o) =>
      o._id === orderId ? { ...o, quantity: o.quantity + 1, totalPrice: (o.quantity + 1) * o.price } : o
    ));
    try { await axiosInstance.post(`/orders/increase/${orderId}`); }
    catch (err) { setOrders(prev); toast.error(err?.response?.data?.message || "Failed to increase quantity"); }
  };

  const handleReduceQty = async (orderId) => {
    const order = orders.find((o) => o._id === orderId);
    if (!order) return;
    const prev = orders;
    if (order.quantity <= 1) {
      setOrders((os) => os.filter((o) => o._id !== orderId));
      try { await axiosInstance.post(`/orders/reduce/${orderId}`); }
      catch { setOrders(prev); toast.error("Failed to reduce"); }
      return;
    }
    setOrders((os) => os.map((o) =>
      o._id === orderId ? { ...o, quantity: o.quantity - 1, totalPrice: (o.quantity - 1) * o.price } : o
    ));
    try { await axiosInstance.post(`/orders/reduce/${orderId}`); }
    catch { setOrders(prev); toast.error("Failed to reduce"); }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm("Remove this item from cart?")) return;
    const prev = orders;
    setOrders((os) => os.filter((o) => o._id !== orderId));
    try { await axiosInstance.delete(`/orders/remove/${orderId}`); toast.success("Item removed"); }
    catch { setOrders(prev); toast.error("Failed to remove item"); }
  };

  const handleClearAll = async () => {
    if (!window.confirm("Clear all items from the cart?")) return;
    try {
      await axiosInstance.delete("/orders/clear");
      setOrders([]);
      // Tell CartContext immediately — floating cart badge resets to 0
      try { window.dispatchEvent(new CustomEvent("ordersUpdated", { detail: { total: 0 } })); } catch {}
      toast.success("Cart cleared");
    } catch { toast.error("Failed to clear cart"); }
  };

  const handleApiError = (err) => {
    const { title, message, type } = parseOrderError(err);
    if (type === "stock") {
      toast.error(
        <div><p className="font-semibold text-sm">{title}</p><p className="text-xs mt-1 leading-relaxed">{message}</p></div>,
        { autoClose: 9000 }
      );
      fetchOrders();
    } else {
      toast.error(`${title}: ${message}`);
    }
  };

  // ── Preview invoice ───────────────────────────────────────────────────────
  const previewInvoice = () => {
    if (!orders.length) { toast.error("Add items to cart first"); return; }
    setInvoiceParams({
      mode:          "preview",
      customerName:  customerName || "Walk-in Customer",
      paymentMethod: paymentMethod || "Not Specified",
      orderSource:   "staff",
    });
    setReceiptMode("preview");
    setShowReceiptModal(true);
  };

  // ── Complete order ────────────────────────────────────────────────────────
  const completeOrder = async () => {
    if (!paymentMethod) { toast.error("Select a payment method first"); return; }
    if (!orders.length) { toast.error("No items in cart"); return; }
    setProcessing(true);
    try {
      const res = await axiosInstance.post("/orders/complete", {
        paymentMethod,
        buyerName:   customerName || "Walk-in Customer",
        isWholesale,
      });
      if (res.data.success) {
        const orderId = res.data.orderId;
        setCompletedOrderId(orderId);
        toast.success("Order completed!");
        // Show final receipt via invoiceParams (uses server-side data — correct name/payment)
        setInvoiceParams({
          mode:           "final",
          orderSource:    "staff",
          historyReceipt: "true",
          orderId,
        });
        setReceiptMode("final");
        setShowReceiptModal(true);
        setOrders([]);
        setCustomerName("");
        setPaymentMethod("");
        setIsWholesale(false);
        try { localStorage.setItem("melech_staff_price_mode", "retail"); } catch {}
      }
    } catch (err) {
      handleApiError(err);
    } finally {
      setProcessing(false);
    }
  };

  const handleCloseReceiptModal = () => {
    setShowReceiptModal(false);
    setInvoiceParams(null);
    setCompletedOrderId(null);
  };

  // ── Empty cart state ──────────────────────────────────────────────────────
  const isEmpty = !loading && displayOrders.length === 0;

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-50 p-4 md:p-6">
        <div className="max-w-5xl mx-auto space-y-5">

          {/* ── Page header ─────────────────────────────────────────────────── */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2.5">
                <ShoppingCart size={26} className="text-indigo-600" />
                Walk-in Cart
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Manage in-store customer orders · {user?.name || "Staff"}
              </p>
            </div>

            {/* Right side: Products shortcut + Wholesale badge */}
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <motion.button
                onClick={() => navigate("/customer-dashboard")}
                whileTap={{ scale: 0.94 }}
                className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-green-200 text-green-700 bg-green-50 hover:bg-green-100 transition font-medium shrink-0"
              >
                <ShoppingBag size={14} />
                Products
              </motion.button>

              {/* Wholesale badge */}
              <AnimatePresence>
                {isWholesale && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    className="flex items-center gap-1.5 bg-amber-100 border border-amber-300 text-amber-800 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm"
                  >
                    <Store size={13} />
                    WHOLESALE PRICING ACTIVE
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ── Stats row ───────────────────────────────────────────────────── */}
          {!isEmpty && !loading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <StatCard icon={ShoppingCart} label="Items in Cart"  value={displayOrders.length} color="border-indigo-100" iconColor="bg-indigo-500" />
              <StatCard icon={ShoppingBag}  label="Total Units"    value={totalItems}            color="border-blue-100"   iconColor="bg-blue-500" />
              <StatCard icon={Receipt}      label="Cart Total"     value={`₦${grandTotal.toLocaleString()}`} color="border-green-100" iconColor="bg-green-500" />
            </div>
          )}

          {/* ── Order form panel ────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Panel header */}
            <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-600 to-indigo-700">
              <h2 className="text-white font-semibold text-sm flex items-center gap-2">
                <Receipt size={15} />
                Order Details
              </h2>
            </div>

            <div className="p-5 space-y-4">
              {/* Customer name + payment method */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    placeholder="Walk-in Customer"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50 transition"
                  >
                    <option value="">— Select Method —</option>
                    {PAYMENT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Wholesale toggle + action buttons — responsive grid on mobile */}
              <div className="space-y-3 pt-1">
                {/* Wholesale toggle — full width on mobile */}
                <button
                  type="button"
                  onClick={handleToggleWholesale}
                  className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border font-semibold text-sm transition-all ${
                    isWholesale
                      ? "bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-200"
                      : "bg-white border-gray-200 text-gray-600 hover:border-amber-400 hover:text-amber-600"
                  }`}
                >
                  {isWholesale ? <Store size={15} /> : <ShoppingBag size={15} />}
                  {isWholesale ? "Wholesale ON" : "Switch to Wholesale"}
                </button>

                {/* Action buttons — 2-col on mobile, single row on sm+ */}
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                  {displayOrders.length > 0 && (
                    <button
                      onClick={handleClearAll}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 transition"
                    >
                      <Trash2 size={14} />
                      Clear Cart
                    </button>
                  )}
                  <button
                    onClick={previewInvoice}
                    disabled={processing || !orders.length}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 text-sm font-semibold disabled:opacity-40 transition"
                  >
                    <Receipt size={14} />
                    Preview
                  </button>
                  <motion.button
                    onClick={completeOrder}
                    disabled={processing || !orders.length || !paymentMethod}
                    whileTap={{ scale: 0.97 }}
                    className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-md shadow-indigo-200 disabled:opacity-40 transition"
                  >
                    {processing ? (
                      <>
                        <RotateCcw size={14} className="animate-spin" />
                        Processing…
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={14} />
                        Complete Order
                      </>
                    )}
                  </motion.button>
                </div>
              </div>

              {/* Wholesale info banner */}
              <AnimatePresence>
                {isWholesale && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
                      <Store size={15} className="text-amber-500 mt-0.5 shrink-0" />
                      <span>
                        <strong>Wholesale pricing active</strong> — all prices reflect wholesale rates.
                        Products without a wholesale price keep their retail price.
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Missing payment method warning */}
              <AnimatePresence>
                {orders.length > 0 && !paymentMethod && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-xs text-amber-600 font-medium"
                  >
                    ⚠️ Select a payment method to complete the order.
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ── Cart items ──────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Cart header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <ShoppingCart size={16} className="text-indigo-500" />
                Cart Items
                {displayOrders.length > 0 && (
                  <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">
                    {displayOrders.length}
                  </span>
                )}
              </h2>
              {isWholesale && (
                <span className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                  PT: WSP
                </span>
              )}
            </div>

            <div className="p-4">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse flex gap-4 p-4 rounded-xl bg-gray-50">
                      <div className="w-16 h-16 rounded-xl bg-gray-200 shrink-0" />
                      <div className="flex-1 space-y-2 pt-1">
                        <div className="h-4 bg-gray-200 rounded w-2/3" />
                        <div className="h-3 bg-gray-200 rounded w-1/3" />
                      </div>
                      <div className="w-20 h-8 bg-gray-200 rounded-lg self-center" />
                    </div>
                  ))}
                </div>
              ) : isEmpty ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center py-16 gap-3 text-center"
                >
                  <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center">
                    <PackageOpen size={28} className="text-indigo-300" />
                  </div>
                  <p className="text-gray-500 font-medium">Cart is empty</p>
                  <p className="text-sm text-gray-400">
                    Browse products and add items to get started.
                  </p>
                </motion.div>
              ) : (
                <StaffTable
                  orders={displayOrders}
                  onIncreaseQty={handleIncreaseQty}
                  onReduceQty={handleReduceQty}
                  onRemoveOrder={handleDeleteOrder}
                  isWholesale={isWholesale}
                />
              )}
            </div>
          </div>

          {/* ── Grand total footer ───────────────────────────────────────────── */}
          {!isEmpty && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg shadow-indigo-200"
            >
              <div>
                <p className="text-indigo-200 text-xs font-semibold uppercase tracking-wide mb-0.5">
                  Order Grand Total
                </p>
                <p className="text-3xl font-bold text-white">
                  ₦{grandTotal.toLocaleString()}
                </p>
                <p className="text-indigo-300 text-xs mt-0.5">
                  {totalItems} unit{totalItems !== 1 ? "s" : ""} across {displayOrders.length} item{displayOrders.length !== 1 ? "s" : ""}
                  {isWholesale && " · Wholesale pricing"}
                </p>
              </div>
              <motion.button
                onClick={completeOrder}
                disabled={processing || !paymentMethod}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 bg-white text-indigo-700 font-bold px-6 py-3 rounded-xl shadow hover:bg-indigo-50 disabled:opacity-40 transition text-sm"
              >
                <CheckCircle2 size={16} />
                {processing ? "Processing…" : "Complete Order"}
              </motion.button>
            </motion.div>
          )}

        </div>
      </div>

      {/* Receipt modal — uses invoiceParams so all receipt fixes apply */}
      <ReceiptModal
        open={showReceiptModal}
        onClose={handleCloseReceiptModal}
        invoiceParams={invoiceParams}
        mode={receiptMode}
        role="staff"
      />
    </>
  );
};

export default StaffOrders;
