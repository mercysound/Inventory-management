import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import { useWholesaleAccess } from "../../../hooks/useWholesaleAccess";
import {
  ShoppingCart, Receipt, Trash2, RotateCcw,
  CheckCircle2, PackageOpen, Store, ShoppingBag, ChevronDown, ChevronUp,
} from "lucide-react";
import axiosInstance from "../../../utils/axiosInstance";
import CartProductSearch from "../../customer/CustomerOrderPortal/CartProductSearch";
import ReceiptModal from "../../share-component/receipt/ReceiptModal";
import StaffTable from "./StaffTable";
import { useAuth } from "../../../context/AuthContext";

const PAYMENT_OPTIONS = [
  { value: "cash",          label: "Cash" },
  { value: "card",          label: "Card (POS)" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cash_on_delivery", label: "Cash on Delivery" },
];

const parseOrderError = (err) => {
  const raw = err?.response?.data?.message || err?.message || "";
  if (raw.startsWith("STOCK_ERROR:")) {
    const parts    = raw.replace("STOCK_ERROR:", "").split(":");
    const name     = parts[0] || "This item";
    const req      = Number(parts[1]) || 0;
    const rem      = Number(parts[2]) ?? 0;
    const stockLine = rem === 0
      ? "It is now completely out of stock — remove it from the cart."
      : `Only ${rem} unit${rem !== 1 ? "s" : ""} available, but the cart has ${req}.`;
    return { title: "Stock Conflict", message: `"${name}" — ${stockLine}`, type: "stock" };
  }
  if (raw.toLowerCase().includes("no active orders"))
    return { title: "Cart is Empty", message: "Add products before completing the order.", type: "empty" };
  return { title: "Order Failed", message: raw || "Something went wrong.", type: "generic" };
};

const StaffOrders = () => {
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const { canUseWholesale } = useWholesaleAccess();

  const [orders,       setOrders]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [paymentMethod,setPaymentMethod]= useState("");
  const [customerName, setCustomerName] = useState("");
  const [processing,   setProcessing]   = useState(false);
  const [formOpen,     setFormOpen]     = useState(true); // collapse form on mobile when items added

  const [isWholesale, setIsWholesale] = useState(() => {
    try { return localStorage.getItem("melech_staff_price_mode") === "wholesale"; }
    catch { return false; }
  });

  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [invoiceParams,    setInvoiceParams]    = useState(null);
  const [receiptMode,      setReceiptMode]      = useState("preview");

  // ── Fetch orders ──────────────────────────────────────────────────────────
  // silent=true → skip skeleton loader (used for background refreshes)
  const fetchOrders = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res  = await axiosInstance.get("/orders");
      const data = Array.isArray(res.data) ? res.data : res.data.data || res.data.orders || [];
      setOrders(data);
      if (data.length > 0) {
        const sw = data.some((o) => o.priceMode === "wholesale");
        setIsWholesale((prev) => {
          if (prev !== sw) { try { localStorage.setItem("melech_staff_price_mode", sw ? "wholesale" : "retail"); } catch {} return sw; }
          return prev;
        });
      }
    } catch { toast.error("Failed to fetch orders."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchOrders();
    // ordersUpdated from CartProductSearch uses _source:"cartSearch" — refresh silently
    const h = (e) => {
      const silent = e?.detail?._source === "cartSearch";
      fetchOrders(silent);
    };
    window.addEventListener("ordersUpdated", h);
    return () => window.removeEventListener("ordersUpdated", h);
  }, [fetchOrders]);

  // ── Wholesale toggle ──────────────────────────────────────────────────────
  const handleToggleWholesale = async () => {
    const next = isWholesale ? "retail" : "wholesale";
    const prev = isWholesale ? "wholesale" : "retail";
    const prevOrders = orders;
    setIsWholesale(next === "wholesale");
    try { localStorage.setItem("melech_staff_price_mode", next); } catch {}
    window.dispatchEvent(new CustomEvent("priceModeChanged", { detail: { mode: next } }));
    try {
      const res = await axiosInstance.post(`/orders/set-price-mode/${next}`);
      if (res.data?.success) {
        const fresh = await axiosInstance.get("/orders");
        const data  = Array.isArray(fresh.data) ? fresh.data : fresh.data.data || fresh.data.orders || [];
        setOrders(data);
        toast.success(`Switched to ${next} pricing`);
      } else {
        setIsWholesale(prev === "wholesale");
        try { localStorage.setItem("melech_staff_price_mode", prev); } catch {}
        toast.error(res.data?.message || "Failed to update prices");
      }
    } catch (err) {
      setIsWholesale(prev === "wholesale");
      setOrders(prevOrders);
      try { localStorage.setItem("melech_staff_price_mode", prev); } catch {}
      toast.error(err?.response?.data?.message || "Failed to update prices");
    }
  };

  const displayOrders = orders.map((o) => {
    if (!isWholesale) return o;
    const wp = o.product?.wholesalePrice ?? o.wholesalePrice ?? null;
    return wp ? { ...o, price: wp, totalPrice: wp * o.quantity } : o;
  });

  const grandTotal = displayOrders.reduce((s, o) => s + (o.totalPrice || o.quantity * o.price || 0), 0);
  const totalItems = displayOrders.reduce((s, o) => s + o.quantity, 0);
  const isEmpty    = !loading && displayOrders.length === 0;

  // ── Cart actions ──────────────────────────────────────────────────────────
  const handleIncreaseQty = async (orderId) => {
    const prev = orders;
    setOrders((os) => os.map((o) => o._id === orderId ? { ...o, quantity: o.quantity + 1, totalPrice: (o.quantity + 1) * o.price } : o));
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
    setOrders((os) => os.map((o) => o._id === orderId ? { ...o, quantity: o.quantity - 1, totalPrice: (o.quantity - 1) * o.price } : o));
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
      try { window.dispatchEvent(new CustomEvent("ordersUpdated", { detail: { total: 0 } })); } catch {}
      toast.success("Cart cleared");
    } catch { toast.error("Failed to clear cart"); }
  };

  const handleApiError = (err) => {
    const { title, message, type } = parseOrderError(err);
    if (type === "stock") {
      toast.error(<div><p className="font-semibold text-sm">{title}</p><p className="text-xs mt-1">{message}</p></div>, { autoClose: 9000 });
      fetchOrders();
    } else { toast.error(`${title}: ${message}`); }
  };

  const previewInvoice = () => {
    if (!orders.length) { toast.error("Add items to cart first"); return; }
    setInvoiceParams({ mode: "preview", customerName: customerName || "Walk-in Customer", paymentMethod: paymentMethod || "Not Specified", orderSource: "staff", staffName: user?.name || "Staff", staffId: user?._id || "" });
    setReceiptMode("preview");
    setShowReceiptModal(true);
  };

  const completeOrder = async () => {
    if (!paymentMethod) { toast.error("Select a payment method first"); return; }
    if (!orders.length) { toast.error("No items in cart"); return; }
    setProcessing(true);
    try {
      const res = await axiosInstance.post("/orders/complete", { paymentMethod, buyerName: customerName || "Walk-in Customer", isWholesale });
      if (res.data.success) {
        const orderId = res.data.orderId;
        toast.success("Order completed!");
        setInvoiceParams({ mode: "final", orderSource: "staff", historyReceipt: "true", orderId });
        setReceiptMode("final");
        setShowReceiptModal(true);
        setOrders([]);
        setCustomerName("");
        setPaymentMethod("");
        setIsWholesale(false);
        setFormOpen(true);
        try { localStorage.setItem("melech_staff_price_mode", "retail"); } catch {}
      }
    } catch (err) { handleApiError(err); }
    finally { setProcessing(false); }
  };

  return (
    <>
      {/* ── Full-height layout: sticky top panel + cart items below ── */}
      <div className="flex flex-col -mx-4 md:-mx-6 -mt-4 md:-mt-6">

        {/* ════════════════════════════════════════════════════════════════
            STICKY TOP PANEL
        ════════════════════════════════════════════════════════════════ */}
        <div className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 shadow-sm" data-cart-sticky>

          {/* ── Row 1: Branding + stats + Products btn ── */}
          <div className="flex items-center gap-2 px-4 pt-3 pb-2">
            {/* Icon + title */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
                <ShoppingCart size={14} className="text-white" />
              </div>
              <div className="leading-tight">
                <p className="font-bold text-gray-900 dark:text-white text-xs">Walk-in Cart</p>
                <p className="text-[9px] text-gray-400 leading-none">{user?.name || "Staff"}</p>
              </div>
            </div>

            {/* Stats — flex-1 so they fill available space */}
            {displayOrders.length > 0 && (
              <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-center">
                <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md whitespace-nowrap">
                  {displayOrders.length} item{displayOrders.length !== 1 ? "s" : ""}
                </span>
                <span className="text-[11px] font-bold text-green-700 bg-green-50 border border-green-100 px-2 py-0.5 rounded-md truncate max-w-[110px]">
                  ₦{grandTotal.toLocaleString()}
                </span>
              </div>
            )}
            {!displayOrders.length && <div className="flex-1" />}

            {/* Products shortcut */}
            <button onClick={() => navigate("/customer-dashboard")}
              className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg border border-green-200 text-green-700 bg-green-50 hover:bg-green-100 transition font-semibold shrink-0">
              <ShoppingBag size={11} /> Products
            </button>
          </div>

          {/* ── Row 2: Customer name + Payment ── */}
          <div className="grid grid-cols-2 gap-2 px-4 pb-2">
            <input
              type="text"
              placeholder="Customer name…"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 transition"
            />
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className={`w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50 dark:bg-gray-800 dark:text-gray-200 transition
                ${!paymentMethod && orders.length ? "border-amber-300 ring-1 ring-amber-200" : "border-gray-200 dark:border-gray-700"}`}
            >
              <option value="">— Payment method —</option>
              {PAYMENT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* ── Row 3: Action buttons — 2 rows so Complete never gets cut ── */}
          <div className="px-4 pb-3 space-y-2">
            {/* Top sub-row: secondary actions */}
            <div className="flex items-center gap-2">
              {canUseWholesale && (
                <button onClick={handleToggleWholesale}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition
                    ${isWholesale ? "bg-amber-500 border-amber-500 text-white" : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-amber-400"}`}>
                  <Store size={12} />
                  {isWholesale ? "WS ON" : "Wholesale"}
                </button>
              )}
              {displayOrders.length > 0 && (
                <button onClick={handleClearAll}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-200 text-red-600 text-[11px] font-semibold hover:bg-red-50 transition">
                  <Trash2 size={12} /> Clear
                </button>
              )}
              <button onClick={previewInvoice} disabled={!orders.length}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-indigo-200 text-indigo-700 bg-indigo-50 text-[11px] font-semibold disabled:opacity-40 hover:bg-indigo-100 transition">
                <Receipt size={12} /> Preview
              </button>
            </div>

            {/* Bottom sub-row: Complete — always full width */}
            <motion.button
              onClick={completeOrder}
              disabled={processing || !orders.length || !paymentMethod}
              whileTap={{ scale: 0.97 }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold
                disabled:opacity-40 transition shadow-sm shadow-indigo-200"
            >
              {processing
                ? <><RotateCcw size={14} className="animate-spin" /> Processing…</>
                : <><CheckCircle2 size={14} /> Complete Order</>
              }
            </motion.button>
          </div>

          {/* Warnings */}
          <AnimatePresence>
            {orders.length > 0 && !paymentMethod && (
              <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                className="px-4 pb-2 text-[11px] text-amber-600 font-medium">
                ⚠️ Select a payment method to complete the order.
              </motion.p>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {canUseWholesale && isWholesale && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden px-4 pb-2">
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5 text-[11px] text-amber-800">
                  <Store size={11} className="text-amber-500 shrink-0" />
                  <span><strong>Wholesale pricing active</strong> — prices reflect wholesale rates.</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ════════════════════════════════════════════════════════════════
            SCROLLABLE CART BODY — independent scroll, sticky panel stays fixed
        ════════════════════════════════════════════════════════════════ */}
        <div className="px-4 md:px-6 pt-4 pb-6">

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex gap-4 p-4 rounded-2xl bg-white border border-gray-100">
                  <div className="w-16 h-16 rounded-xl bg-gray-200 shrink-0" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-4 bg-gray-200 rounded w-2/3" />
                    <div className="h-3 bg-gray-100 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : isEmpty ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-4">
              <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
                <div className="w-20 h-20 rounded-3xl bg-indigo-50 flex items-center justify-center">
                  <PackageOpen size={32} className="text-indigo-300" />
                </div>
                <p className="text-gray-500 font-semibold">Cart is empty</p>
                <p className="text-sm text-gray-400">Browse products and add items to get started.</p>
                <button onClick={() => navigate("/customer-dashboard")}
                  className="mt-2 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition">
                  <ShoppingBag size={15} /> Go to Products
                </button>
              </div>
              <CartProductSearch priceMode={isWholesale ? "wholesale" : "retail"} cartMap={{}} />
            </motion.div>
          ) : (
            <>
              {/* Cart items label */}
              <div className="flex items-center justify-between mb-3 px-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                  <ShoppingCart size={12} className="text-indigo-400" />
                  {displayOrders.length} item{displayOrders.length !== 1 ? "s" : ""} in cart
                  {isWholesale && <span className="text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">WSP</span>}
                </p>
                <p className="text-xs text-gray-400">{totalItems} unit{totalItems !== 1 ? "s" : ""}</p>
              </div>

              <CartProductSearch
                priceMode={isWholesale ? "wholesale" : "retail"}
                cartMap={Object.fromEntries(orders.map(o => [o.product?._id || o.product, { quantity: o.quantity, orderId: o._id }]))}
              />

              <StaffTable
                orders={displayOrders}
                onIncreaseQty={handleIncreaseQty}
                onReduceQty={handleReduceQty}
                onRemoveOrder={handleDeleteOrder}
                isWholesale={isWholesale}
              />

              {/* Grand total — bottom of scroll area */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="mt-4 bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-2xl p-5 shadow-lg shadow-indigo-200">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-indigo-200 text-[10px] font-semibold uppercase tracking-wide mb-0.5">Grand Total</p>
                    <p className="text-2xl font-bold text-white">₦{grandTotal.toLocaleString()}</p>
                    <p className="text-indigo-300 text-[11px] mt-0.5">
                      {totalItems} unit{totalItems !== 1 ? "s" : ""} · {displayOrders.length} item{displayOrders.length !== 1 ? "s" : ""}
                      {isWholesale && " · WS pricing"}
                    </p>
                  </div>
                  <motion.button onClick={completeOrder} disabled={processing || !paymentMethod} whileTap={{ scale: 0.97 }}
                    className="flex items-center gap-2 bg-white text-indigo-700 font-bold px-5 py-3 rounded-xl hover:bg-indigo-50 disabled:opacity-40 transition text-sm shadow shrink-0">
                    <CheckCircle2 size={15} />
                    {processing ? "Processing…" : "Complete"}
                  </motion.button>
                </div>
              </motion.div>
            </>
          )}
        </div>
      </div>

      <ReceiptModal
        open={showReceiptModal}
        onClose={() => { setShowReceiptModal(false); setInvoiceParams(null); }}
        invoiceParams={invoiceParams}
        mode={receiptMode}
        role="staff"
      />
    </>
  );
};

export default StaffOrders;
