import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart, ShoppingBag, FileText, Clock, RefreshCw, PackageOpen, Trash2,
} from "lucide-react";
import axiosInstance from "../../../utils/axiosInstance";
import CustomerOrderTable from "./CustomerOrderTable";
import PaystackButton from "./PaystackButton";
import CartSkeleton from "./CartSkeleton";
import PendingOrdersModal from "./PendingOrdersModal";
import FulfillmentModal from "./FulfillmentModal";
import CartProductSearch from "./CartProductSearch";
import { useAuth } from "../../../context/AuthContext";
import { useCart } from "../../../context/CartContext";
import { useEngagementTracker } from "../../../hooks/useEngagementTracker";
import ReceiptModal from "../../share-component/receipt/ReceiptModal";

// ── Stat card ─────────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
    <div className={`p-2 rounded-lg ${color}`}>
      <Icon size={18} className="text-white" />
    </div>
    <div>
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className="text-base font-bold text-gray-800">{value}</p>
    </div>
  </div>
);

// ── Empty cart ────────────────────────────────────────────────────────────────
const EmptyCart = () => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center justify-center py-20 gap-4"
  >
    <div className="w-20 h-20 rounded-full bg-indigo-50 flex items-center justify-center">
      <PackageOpen size={36} className="text-indigo-300" />
    </div>
    <div className="text-center">
      <p className="text-lg font-semibold text-gray-600">Your cart is empty</p>
      <p className="text-sm text-gray-400 mt-1">
        Browse the catalogue and add items to get started.
      </p>
    </div>
  </motion.div>
);

// ── Stock error parser ────────────────────────────────────────────────────────
const parseOrderError = (err) => {
  const raw = err?.response?.data?.message || err?.message || "";
  if (raw.startsWith("STOCK_ERROR:")) {
    const parts       = raw.replace("STOCK_ERROR:", "").split(":");
    const productName = parts[0] || "This item";
    const requested   = Number(parts[1]) || 0;
    const remaining   = Number(parts[2]) ?? 0;
    let stockLine = remaining === 0
      ? "It is now completely out of stock."
      : `Only ${remaining} unit${remaining !== 1 ? "s" : ""} left in stock, but your cart has ${requested}.`;
    return {
      title:   "Item No Longer Available",
      message: `"${productName}" could not be reserved — someone else completed their purchase first. ${stockLine} Please update your cart quantity or remove it and try again.`,
      type:    "stock",
      productName,
      remaining,
    };
  }
  if (raw.toLowerCase().includes("no active orders")) {
    return { title: "Cart is Empty", message: "Your cart appears to be empty. Please add items before checking out.", type: "empty" };
  }
  return { title: "Checkout Failed", message: raw || "Something went wrong. Please try again.", type: "generic" };
};

// ── Main component ────────────────────────────────────────────────────────────
const CustomerOrderPortal = () => {
  const { user }    = useAuth();
  const { resetCart, cartCount } = useCart();
  const { trackAction, markPurchased } = useEngagementTracker();
  const navigate    = useNavigate();

  // Product page route per role
  const productsPath = user?.role === "wholesale"
    ? "/wholesale-dashboard"
    : user?.role === "staff"
      ? "/customer-dashboard"
      : "/user-dashboard";

  // Full profile (phone + address) fetched once — used to pre-fill FulfillmentModal
  const [userProfile, setUserProfile] = useState({
    name:    user?.name    || "",
    phone:   "",
    address: "",
  });

  const [orders,         setOrders]         = useState([]);
  const [priceMode,      setPriceMode]      = useState(() => {
    if (user?.role === "wholesale") return "wholesale";
    try {
      return localStorage.getItem("melech_staff_price_mode") === "wholesale" ? "wholesale" : "retail";
    } catch { return "retail"; }
  });
  const [pendingOrders,    setPendingOrders]    = useState([]);
  const [showPendingModal, setShowPendingModal] = useState(false);

  // ── Single status machine — prevents all flash states ────────────────────
  // "loading"  → initial fetch in progress     → show CartSkeleton
  // "ready"    → data loaded, cart shown        → normal UI
  // "clearing" → payment complete, blob loading → show success overlay
  // "paid"     → blob ready                     → receipt modal opens, orders already empty
  const [cartStatus, setCartStatus] = useState("loading");

  const [refreshing,        setRefreshing]        = useState(false);
  const [paymentClearing,   setPaymentClearing]   = useState(false);
  // Incremented each time SSE fires — tells the modal to silently re-fetch
  // its cancelled-pending list without any prop-sync loop.
  const [modalRefreshKey, setModalRefreshKey] = useState(0);

  // Receipt states
  const [showReceiptPrompt, setShowReceiptPrompt] = useState(false);
  const [receiptBlob,       setReceiptBlob]       = useState(null);

  // Preview invoice states
  const [previewLoading,   setPreviewLoading]   = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Fulfillment modal — shown before Paystack opens
  const [showFulfillment,    setShowFulfillment]    = useState(false);
  const [fulfillmentData,    setFulfillmentData]    = useState(null);
  const fulfillmentDataRef = useRef(null);           // always-current ref used inside Paystack closure
  const paystackRef        = useRef(null);
  const bypassPreCheck     = useRef(false);

  // ── Stable ref wrapper so SSE and event listeners never cause re-renders ──
  const fetchOrdersRef = useRef(null);

  // ── Fetch orders + pending history ───────────────────────────────────────
  const fetchOrders = useCallback(async (silent = false) => {
    try {
      if (!silent) setCartStatus("loading");
      else setRefreshing(true);

      const [orderRes, historyRes] = await Promise.all([
        axiosInstance.get("/orders"),
        axiosInstance.get("/placed-orders"),
      ]);

      const cartOrders = orderRes.data.data || orderRes.data.orders || [];
      const normalized = cartOrders.map((o) => ({
        ...o,
        total: o.total ?? o.quantity * o.price,
      }));
      setOrders(normalized);

      // Sync cart count — use a flag to distinguish internal vs external dispatch
      // so the ordersUpdated listener below does NOT re-trigger fetchOrders
      const realTotal = normalized.reduce((sum, o) => sum + (o.quantity || 0), 0);
      try {
        window.dispatchEvent(new CustomEvent("ordersUpdated", {
          detail: { total: realTotal, _source: "fetchOrders" }, // tag the source
        }));
      } catch (_) {}

      if (user?.role === "wholesale") {
        setPriceMode("wholesale");
      } else {
        const storedMode = localStorage.getItem("melech_staff_price_mode");
        const detected = normalized.find((o) => o.priceMode === "wholesale");
        setPriceMode(detected ? "wholesale" : storedMode === "wholesale" ? "wholesale" : "retail");
      }

      const history = historyRes.data.orders || [];
      const pending = history.filter((o) =>
        ["pending", "processing"].includes(o.deliveryStatus?.toLowerCase())
      );
      setPendingOrders(pending);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch orders");
    } finally {
      setCartStatus("ready");
      setRefreshing(false);
    }
  }, [user]);

  // Keep ref always pointing to latest fetchOrders — used in SSE/event handlers
  // so those effects never need fetchOrders in their dependency arrays
  useEffect(() => {
    fetchOrdersRef.current = fetchOrders;
  }, [fetchOrders]);

  useEffect(() => {
    fetchOrders();
    // Only re-fetch on events from EXTERNAL sources (other pages/tabs).
    // Skip events tagged with _source: "fetchOrders" to prevent self-triggering.
    const onExternalUpdate = (e) => {
      if (e?.detail?._source === "fetchOrders") return; // our own dispatch — ignore
      fetchOrdersRef.current?.(true);
    };
    window.addEventListener("ordersUpdated", onExternalUpdate);
    return () => window.removeEventListener("ordersUpdated", onExternalUpdate);
  }, [fetchOrders]);

  // ── SSE: real-time order status changes ──────────────────────────────────
  // Uses fetchOrdersRef so this effect only mounts ONCE — no dependency on
  // fetchOrders prevents the SSE connection from being torn down and rebuilt
  // on every render, which was causing the request storm.
  useEffect(() => {
    const token = localStorage.getItem("pos-token");
    if (!token) return;

    const base = import.meta.env.VITE_API_URL || "/api";
    const url  = `${base}/placed-orders/stream?token=${encodeURIComponent(token)}`;
    const es   = new EventSource(url);

    es.addEventListener("placedOrderUpdated", () => {
      fetchOrdersRef.current?.(true);
      setModalRefreshKey((k) => k + 1);
    });

    es.addEventListener("error", () => { es.close(); });

    return () => es.close();
  }, []); // empty deps — stable ref handles freshness

  // ── For wholesale users: lock server-side cart to wholesale pricing on load ──
  useEffect(() => {
    if (user?.role !== "wholesale") return;
    axiosInstance.post("/orders/set-price-mode/wholesale").catch(() => {});
    // Don't call fetchOrders here — the initial fetchOrders() already ran above
  }, [user]);

  // ── Fetch full profile once so FulfillmentModal can pre-fill phone + address ──
  useEffect(() => {
    axiosInstance.get("/users/profile")
      .then((res) => {
        if (res.data.success) {
          const d = res.data._doc || {};
          setUserProfile({
            name:    d.name    || user?.name    || "",
            phone:   d.phone   || "",
            address: d.address || "",
          });
        }
      })
      .catch(() => {}); // silently fail — pre-fill is best-effort
  }, [user]);

  // Cleanup blob URLs on unmount

  // ── Cart actions ─────────────────────────────────────────────────────────
  const handleIncreaseQty = async (orderId) => {
    const prev = orders;
    setOrders((os) =>
      os.map((o) =>
        o._id === orderId
          ? { ...o, quantity: o.quantity + 1, total: (o.quantity + 1) * o.price }
          : o
      )
    );
    try {
      const res = await axiosInstance.post(`/orders/increase/${orderId}`);
      if (!res.data.success) {
        setOrders(prev);
        toast.error(res.data.message || "Failed to increase quantity");
      } else {
        const newTotal = orders.reduce((sum, o) => {
          if (o._id === orderId) return sum + (o.quantity + 1);
          return sum + o.quantity;
        }, 0);
        try { window.dispatchEvent(new CustomEvent("ordersUpdated", { detail: { total: newTotal } })); } catch (e) { /* ignore */ }
      }
    } catch (err) {
      setOrders(prev);
      toast.error(err?.response?.data?.message || "Failed to increase quantity");
    }
  };

  const handleReduceQty = async (orderId) => {
    const order = orders.find((o) => o._id === orderId);
    if (!order) return;
    if (order.quantity <= 1) { handleDeleteOrder(orderId); return; }
    const prev = orders;
    setOrders((os) =>
      os.map((o) =>
        o._id === orderId
          ? { ...o, quantity: o.quantity - 1, total: (o.quantity - 1) * o.price }
          : o
      )
    );
    try {
      const res = await axiosInstance.post(`/orders/reduce/${orderId}`);
      if (!res.data.success) { 
        setOrders(prev); 
        toast.error("Failed to reduce quantity"); 
      } else {
        const newTotal = orders.reduce((sum, o) => {
          if (o._id === orderId) return sum + (o.quantity - 1);
          return sum + o.quantity;
        }, 0);
        try { window.dispatchEvent(new CustomEvent("ordersUpdated", { detail: { total: newTotal } })); } catch (e) { /* ignore */ }
      }
    } catch { setOrders(prev); toast.error("Failed to reduce quantity"); }
  };

  const handleDeleteOrder = async (orderId) => {
    const prev = orders;
    setOrders((os) => os.filter((o) => o._id !== orderId));
    try {
      const res = await axiosInstance.delete(`/orders/remove/${orderId}`);
      if (!res.data.success) { 
        setOrders(prev); 
        toast.error("Failed to remove item"); 
      } else {
        toast.success("Item removed");
        const newTotal = orders.reduce((sum, o) => o._id === orderId ? sum : sum + o.quantity, 0);
        try { window.dispatchEvent(new CustomEvent("ordersUpdated", { detail: { total: newTotal } })); } catch (e) { /* ignore */ }
      }
    } catch { setOrders(prev); toast.error("Failed to remove item"); }
  };

  // ── Clear entire cart ─────────────────────────────────────────────────────
  const handleClearCart = async () => {
    if (!orders.length) return;
    if (!window.confirm("Remove all items from your cart?")) return;
    const prev = orders;
    setOrders([]);
    resetCart();
    try {
      window.dispatchEvent(new CustomEvent("ordersUpdated", { detail: { total: 0 } }));
    } catch {}
    try {
      await axiosInstance.delete("/orders/clear");
      toast.success("Cart cleared");
    } catch {
      // Rollback
      setOrders(prev);
      fetchOrders(true);
      toast.error("Failed to clear cart");
    }
  };
  const togglePriceMode = async () => {
    const next = priceMode === "retail" ? "wholesale" : "retail";
    const previous = priceMode;
    try {
      localStorage.setItem("melech_staff_price_mode", next);
    } catch {
      // ignore storage failures
    }

    if (orders.length === 0) {
      setPriceMode(next);
      try { window.dispatchEvent(new CustomEvent("priceModeChanged", { detail: { mode: next } })); } catch (e) {}
      toast.success(`Cart pricing set to ${next}`);
      return;
    }

    try {
      const res = await axiosInstance.post(`/orders/set-price-mode/${next}`);
      if (!res.data.success) {
        localStorage.setItem("melech_staff_price_mode", previous);
        toast.error(res.data.message || "Failed to switch price mode");
        return;
      }

      // Prefer authoritative server state — refetch updated orders so product
      // population and computed totals are accurate (prevents stale product data)
      await fetchOrders(true);
      setPriceMode(next);
      try { window.dispatchEvent(new CustomEvent("priceModeChanged", { detail: { mode: next } })); } catch (e) {}
      toast.success(`Cart pricing switched to ${next}`);
    } catch (err) {
      console.error(err);
      localStorage.setItem("melech_staff_price_mode", previous);
      toast.error("Failed to change price mode");
    }
  };

  // ── Derived ──────────────────────────────────────────────────────────────
  const grandTotal = orders.reduce((sum, o) => sum + (o.total ?? o.quantity * o.price), 0);
  const totalItems = orders.reduce((sum, o) => sum + o.quantity, 0);

  // ── Preview invoice ───────────────────────────────────────────────────────
  const handlePreviewInvoice = async () => {
    if (!orders.length) { toast.info("Add items to your cart first"); return; }
    setShowPreviewModal(true);
  };

  const handleClosePreview = () => {
    setShowPreviewModal(false);
  };

  // ── Paystack success ──────────────────────────────────────────────────────
  const handlePaymentSuccess = async (paystackResponse) => {
    const paystackReference = paystackResponse?.reference || paystackResponse?.trxref || null;
    try {
      const completeRes = await axiosInstance.post("/orders/complete", {
        paymentMethod:         "Paystack",
        buyerName:             user?.name || "Customer",
        paystackReference,
        fulfillmentType:       fulfillmentDataRef.current?.fulfillmentType       || "pickup",
        deliveryAddress:       fulfillmentDataRef.current?.deliveryAddress       || undefined,
        deliveryRecipientName: fulfillmentDataRef.current?.deliveryRecipientName || undefined,
        deliveryPhone:         fulfillmentDataRef.current?.deliveryPhone         || undefined,
      });
      if (!completeRes.data.success) {
        toast.error(completeRes.data.message || "Order completion failed");
        return;
      }

      // ── Instant wipe: clear orders AND switch status BEFORE blob fetch ────
      setOrders([]);
      resetCart();
      setCartStatus("clearing");
      fulfillmentDataRef.current = null;
      setFulfillmentData(null);
      try {
        window.dispatchEvent(new CustomEvent("ordersUpdated", { detail: { total: 0 } }));
      } catch (_) {}

      // Mark engagement session as purchased
      markPurchased(grandTotal, orders.map(o => ({
        name:     o.product?.name || "Product",
        quantity: o.quantity,
        price:    o.price,
      })));

      // Fetch invoice blob while overlay is showing
      const query = new URLSearchParams({
        customerName:  user?.name || "Customer",
        paymentMethod: "Paystack",
        mode:          "final",
        orderSource:   "online",
        orderId:       completeRes.data.orderId,
      }).toString();
      const res = await axiosInstance.get(`/orders/invoice?${query}`, { responseType: "blob" });
      setReceiptBlob(res.data);
      setCartStatus("ready");     // clear overlay
      setShowReceiptPrompt(true); // invoice modal opens immediately
      fetchOrders(true);
    } catch (err) {
      setCartStatus("ready");
      setPaymentClearing(false);
      console.error("Order completion failed:", err);
      const { title, message, type } = parseOrderError(err);
      if (type === "stock") {
        toast.error(
          <div>
            <p className="font-semibold text-sm">{title}</p>
            <p className="text-xs mt-1 leading-relaxed">{message}</p>
            {paystackReference && (
              <p className="text-xs mt-2 text-amber-200 font-semibold">
                A refund has been initiated automatically to your card.
              </p>
            )}
          </div>,
          { autoClose: 10000 }
        );
        fetchOrders(true);
      } else {
        toast.error(`${title}: ${message}`);
      }
    }
  };

  // ── Pre-payment check: verify stock then open fulfillment modal ──────────
  const handlePrePayCheck = async () => {
    // Bypass: fulfillment already confirmed, Paystack is being opened via ref
    if (bypassPreCheck.current) {
      bypassPreCheck.current = false;
      return true;
    }
    // Track checkout start as engagement event
    trackAction("start_checkout");

    try {
      const res = await axiosInstance.post("/orders/verify-stock");
      if (!res.data.success) return false;
      // Stock OK — open fulfillment modal; Paystack triggered via ref after confirmation
      setShowFulfillment(true);
      return false;
    } catch (err) {
      const data   = err?.response?.data;
      const status = err?.response?.status;

      if (status === 403 && data?.code === "ACCOUNT_DEACTIVATED") {
        toast.error("Your account has been temporarily suspended. Please contact support.", { autoClose: 8000 });
        return false;
      }
      if (status === 403) {
        toast.error(data?.message || "Your account cannot process payments right now.");
        return false;
      }
      if (data?.message === "STOCK_CONFLICT" && data?.conflicts?.length) {
        const lines = data.conflicts.map((c) =>
          c.available === 0
            ? `• "${c.productName}" is out of stock`
            : `• "${c.productName}": you need ${c.requested}, only ${c.available} available`
        );
        toast.error(
          <div>
            <p className="font-semibold text-sm">Stock issue — cannot proceed</p>
            <div className="text-xs mt-1 leading-relaxed space-y-1">{lines.map((l, i) => <p key={i}>{l}</p>)}</div>
            <p className="text-xs mt-2 text-gray-200">Update your cart quantities and try again.</p>
          </div>,
          { autoClose: 9000 }
        );
        fetchOrders(true);
      } else {
        toast.error("Could not verify stock. Please try again.");
      }
      return false;
    }
  };

  // Called by FulfillmentModal — save data, bypass pre-check, open Paystack
  const handleFulfillmentConfirmed = (data) => {
    fulfillmentDataRef.current = data;  // write to ref FIRST — available instantly in closures
    setFulfillmentData(data);           // also set state for UI reactivity
    setShowFulfillment(false);
    bypassPreCheck.current = true;
    setTimeout(() => {
      paystackRef.current?.open();
    }, 80);
  };

  const handleDownloadFinalReceipt = () => {
    if (!receiptBlob) { toast.error("Receipt not ready"); return; }
    const link = document.createElement("a");
    const url = URL.createObjectURL(receiptBlob);
    link.href = url;
    link.download = `Receipt_${user?.name || "Customer"}_${Date.now()}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    handleCloseReceiptModal();
  };

  const handleCloseReceiptModal = () => {
    setShowReceiptPrompt(false);
    setReceiptBlob(null);
  };

  if (cartStatus === "loading") return <CartSkeleton />;

  // ── Payment clearing overlay — full screen, replaces cart entirely ────────
  // Shown from the moment /orders/complete succeeds until invoice blob is ready.
  // Cart table is already wiped from state so nothing old can bleed through.
  if (cartStatus === "clearing") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white gap-6">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center shadow-lg"
        >
          <span className="text-5xl">✅</span>
        </motion.div>
        <div className="text-center px-6">
          <p className="text-2xl font-bold text-gray-800">Payment Successful!</p>
          <p className="text-sm text-gray-500 mt-2">Generating your receipt…</p>
        </div>
        <div className="flex gap-2">
          {[0, 0.2, 0.4].map((delay) => (
            <motion.div
              key={delay}
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.7, 1, 0.7] }}
              transition={{ duration: 1, repeat: Infinity, delay }}
              className="w-2.5 h-2.5 rounded-full bg-green-500"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">

      {/* ── Soft refresh indicator — appears when silently revalidating ─────── */}
      <AnimatePresence>
        {refreshing && (
          <motion.div
            key="refreshing"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-indigo-600 text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg pointer-events-none"
          >
            <RefreshCw size={12} className="animate-spin" />
            Updating cart…
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShoppingCart size={24} className="text-indigo-600" />
            My Cart
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Review your items before checkout
            {user?.role === "wholesale" && (
              <span className="ml-2 inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                🏪 Wholesale pricing
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Browse Products shortcut */}
          <motion.button
            onClick={() => navigate(productsPath)}
            whileTap={{ scale: 0.94 }}
            className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-green-200 text-green-700 bg-green-50 hover:bg-green-100 transition font-medium"
          >
            <ShoppingBag size={14} />
            Products
          </motion.button>

          <motion.button
            onClick={() => fetchOrders(true)}
            disabled={refreshing}
            whileTap={{ scale: 0.94 }}
            className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition disabled:opacity-40"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </motion.button>

          {/* Pending Orders button — shows count badge */}
          <motion.button
            onClick={() => setShowPendingModal(true)}
            whileTap={{ scale: 0.94 }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg shadow-sm transition"
          >
            <Clock size={14} />
            Pending Orders
            {pendingOrders.length > 0 && (
              <span className="bg-white text-indigo-700 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {pendingOrders.length}
              </span>
            )}
          </motion.button>
        </div>
      </div>

      {/* Stats row */}
      {orders.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <StatCard icon={ShoppingCart} label="Items in Cart"   value={orders.length}         color="bg-indigo-500" />
          <StatCard icon={PackageOpen}  label="Total Units"     value={totalItems}            color="bg-blue-500" />
          <StatCard icon={Clock}        label="Pending Orders"  value={pendingOrders.length}  color="bg-amber-500" />
        </div>
      )}

      {/* Cart table or empty state */}
      <AnimatePresence mode="wait">
        {orders.length === 0 ? (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <EmptyCart />
            <CartProductSearch priceMode={priceMode} onCartUpdated={() => fetchOrders(true)} cartMap={{}} />
          </motion.div>
        ) : (
          <motion.div key="table" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* ── Add more products from cart ── */}
            <CartProductSearch
              priceMode={priceMode}
              onCartUpdated={() => fetchOrders(true)}
              cartMap={Object.fromEntries(orders.map(o => [o.product?._id || o.product, { quantity: o.quantity, orderId: o._id }]))}
            />

            <CustomerOrderTable
              orders={orders}
              onIncrease={handleIncreaseQty}
              onReduce={handleReduceQty}
              onDelete={handleDeleteOrder}
            />

            {/* Checkout footer */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-0.5">Grand Total</p>
                  <p className="text-3xl font-bold text-gray-900">₦{grandTotal.toLocaleString()}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {totalItems} unit{totalItems !== 1 ? "s" : ""} across{" "}
                    {orders.length} item{orders.length !== 1 ? "s" : ""}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                  {/* Price mode toggle for admin/staff (default: retail) */}
                  {(user?.role === "admin" || user?.role === "staff") && (
                    <div className="flex items-center gap-2 mr-2">
                      <span className="text-xs text-gray-500">Price mode</span>
                      <button
                        onClick={togglePriceMode}
                        className="px-3 py-2 rounded-lg border text-sm bg-white hover:bg-gray-50 border-gray-200"
                        title={`Switch to ${priceMode === "retail" ? "wholesale" : "retail"}`}
                      >
                        {priceMode === "retail" ? "Retail" : "Wholesale"}
                      </button>
                    </div>
                  )}

                  {/* Clear Cart */}
                  <motion.button
                    onClick={handleClearCart}
                    disabled={!orders.length}
                    whileTap={{ scale: 0.96 }}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 transition text-sm font-semibold disabled:opacity-40"
                  >
                    <Trash2 size={14} />
                    Clear Cart
                  </motion.button>

                  <motion.button
                    onClick={handlePreviewInvoice}
                    disabled={previewLoading}
                    whileTap={{ scale: 0.96 }}
                    className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-indigo-200 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition text-sm font-semibold disabled:opacity-50"
                  >
                    <FileText size={15} />
                    {previewLoading ? "Generating..." : "Preview Invoice"}
                  </motion.button>

                  {/* ── Payment warning ── */}
                  <div className="w-full bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 leading-relaxed">
                    <p className="font-bold mb-1">⚠️ Before you pay — please note:</p>
                    <p>
                      When your Paystack payment completes, ensure the <strong>account name</strong> on
                      your bank matches what you expect for <strong>{user?.name || "your account"}</strong>.
                      If unsure, <strong>contact us before paying</strong> to confirm payment details.
                      Payments cannot be reversed once confirmed.
                    </p>
                  </div>

                  <PaystackButton
                    triggerRef={paystackRef}
                    email={user?.email}
                    amount={grandTotal}
                    name={user?.name}
                    reference={`order_${Date.now()}`}
                    onPreCheck={handlePrePayCheck}
                    onSuccess={handlePaymentSuccess}
                    onCancel={() => toast.info("Payment cancelled")}
                    disabled={!orders.length}
                  />
                </div>
              </div>

              <p className="text-xs text-gray-400 mt-4 border-t border-gray-50 pt-3">
                By proceeding, your cart will be cleared upon successful payment and a receipt will be generated automatically.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}

      {/* Pending orders modal */}
      <PendingOrdersModal
        isOpen={showPendingModal}
        onClose={() => setShowPendingModal(false)}
        activeOrders={pendingOrders}
        refreshKey={modalRefreshKey}
      />

      {/* Fulfillment choice modal — appears before Paystack opens */}
      <FulfillmentModal
        isOpen={showFulfillment}
        onClose={() => setShowFulfillment(false)}
        onConfirm={handleFulfillmentConfirmed}
        userProfile={userProfile}
      />

      {/* Final receipt modal */}
      <ReceiptModal
        open={showReceiptPrompt}
        onClose={handleCloseReceiptModal}
        blob={receiptBlob}
        mode="final"
        role={user?.role || "customer"}
      />

      {/* Preview invoice modal */}
      <ReceiptModal
        open={showPreviewModal}
        onClose={handleClosePreview}
        invoiceParams={{ mode: "preview", orderSource: user?.role || "customer" }}
        role={user?.role || "customer"}
        mode="preview"
      />
    </div>
  );
};

export default CustomerOrderPortal;
