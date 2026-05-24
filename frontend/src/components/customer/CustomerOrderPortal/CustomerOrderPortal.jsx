import React, { useEffect, useState, useCallback } from "react";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart,
  FileText,
  Clock,
  RefreshCw,
  PackageOpen,
} from "lucide-react";
import axiosInstance from "../../../utils/axiosInstance";
import CustomerOrderTable from "./CustomerOrderTable";
import PaystackButton from "./PaystackButton";
import { useAuth } from "../../../context/AuthContext";
import PendingOrdersModal from "./PendingOrdersModal";
import ReceiptModal from "../../share-component/receipt/ReceiptModal";
import CartSkeleton from "./CartSkeleton";

// ─── tiny stat card ─────────────────────────────────────────────────────────
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

// ─── empty state ─────────────────────────────────────────────────────────────
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

// ─── Stock error parser ──────────────────────────────────────────────────────
const parseOrderError = (err) => {
  const raw = err?.response?.data?.message || err?.message || "";

  if (raw.startsWith("STOCK_ERROR:")) {
    const parts     = raw.replace("STOCK_ERROR:", "").split(":");
    const productName = parts[0] || "This item";
    const requested   = Number(parts[1]) || 0;
    const remaining   = Number(parts[2]) ?? 0;

    const stockLine =
      remaining === 0
        ? "It is now completely out of stock."
        : `Only ${remaining} unit${remaining !== 1 ? "s" : ""} left in stock, but your cart has ${requested}.`;

    return {
      title: "Item No Longer Available",
      message: `"${productName}" could not be reserved — someone else completed their purchase first. ${stockLine} Please update your cart quantity or remove it and try again.`,
      type: "stock",
      productName,
      remaining,
    };
  }

  if (raw.toLowerCase().includes("no active orders")) {
    return {
      title: "Cart is Empty",
      message: "Your cart appears to be empty. Please add items before checking out.",
      type: "empty",
    };
  }

  return {
    title: "Checkout Failed",
    message: raw || "Something went wrong. Please try again.",
    type: "generic",
  };
};

// ─── helpers ─────────────────────────────────────────────────────────────────

// Build the full invoice URL for a given mode.
// The invoice endpoint now returns an HTML page (not a PDF blob),
// so we pass the URL directly to the iframe src — no blob needed.
const buildInvoiceUrl = (user, mode, baseUrl) => {
  const params = new URLSearchParams({
    customerName:  user?.name || "Customer",
    paymentMethod: "Paystack",
    mode,           // "preview" | "final"
  });
  // baseUrl comes from axiosInstance baseURL (e.g. "/api")
  return `${baseUrl}/orders/invoice?${params.toString()}`;
};

// ─── main component ──────────────────────────────────────────────────────────
const CustomerOrderPortal = () => {
  const { user } = useAuth();

  const [orders, setOrders]               = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);

  // ── Receipt modal state ─────────────────────────────────────────────────
  // receiptUrl: the direct HTML invoice URL loaded in the ReceiptModal iframe.
  // No blob involved — the HTML page handles its own PDF download/share/print.
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptUrl, setReceiptUrl]             = useState("");

  // ── Preview invoice state ───────────────────────────────────────────────
  const [previewLoading, setPreviewLoading]   = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewUrl, setPreviewUrl]           = useState("");

  // ── Fetch orders ────────────────────────────────────────────────────────
  const fetchOrders = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
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

      const history = historyRes.data.orders || [];
      const pending = history.filter((o) =>
        ["pending", "processing"].includes(o.deliveryStatus?.toLowerCase())
      );
      setPendingOrders(pending);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch orders");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // ── Cart actions ────────────────────────────────────────────────────────
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
      if (!res.data.success) { setOrders(prev); toast.error("Failed to reduce quantity"); }
    } catch {
      setOrders(prev);
      toast.error("Failed to reduce quantity");
    }
  };

  const handleDeleteOrder = async (orderId) => {
    const prev = orders;
    setOrders((os) => os.filter((o) => o._id !== orderId));
    try {
      const res = await axiosInstance.delete(`/orders/remove/${orderId}`);
      if (!res.data.success) { setOrders(prev); toast.error("Failed to remove item"); }
      else toast.success("Item removed");
    } catch {
      setOrders(prev);
      toast.error("Failed to remove item");
    }
  };

  // ── Derived ─────────────────────────────────────────────────────────────
  const grandTotal  = orders.reduce((sum, o) => sum + (o.total ?? o.quantity * o.price), 0);
  const totalItems  = orders.reduce((sum, o) => sum + o.quantity, 0);

  // ── Preview invoice ─────────────────────────────────────────────────────
  // The invoice endpoint now returns HTML, so we just build the URL and
  // pass it directly to the iframe — no blob fetch needed.
  const handlePreviewInvoice = async () => {
    if (!orders.length) { toast.info("Add items to your cart first"); return; }
    try {
      setPreviewLoading(true);
      // Build the invoice URL with an auth token in the query string so the
      // iframe (which is a new browser context) can authenticate the request.
      // We read the token from localStorage the same way axiosInstance does.
      const token  = localStorage.getItem("pos-token") || "";
      const params = new URLSearchParams({
        customerName:  user?.name || "Customer",
        paymentMethod: "Paystack",
        mode:          "preview",
        token,          // pass token so the iframe request is authenticated
      });
      const baseUrl = axiosInstance.defaults.baseURL || "/api";
      const url     = `${baseUrl}/orders/invoice?${params.toString()}`;
      setPreviewUrl(url);
      setShowPreviewModal(true);
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate invoice preview");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleClosePreview = () => {
    setShowPreviewModal(false);
    setPreviewUrl("");
  };

  // ── Paystack pre-check ──────────────────────────────────────────────────
  const handlePrePayCheck = async () => {
    try {
      const res = await axiosInstance.post("/orders/verify-stock");
      return res.data.success;
    } catch (err) {
      const data = err?.response?.data;
      if (data?.message === "STOCK_CONFLICT" && data?.conflicts?.length) {
        const lines = data.conflicts.map((c) =>
          c.available === 0
            ? `• "${c.productName}" is out of stock`
            : `• "${c.productName}": you need ${c.requested}, only ${c.available} available`
        );
        toast.error(
          <div>
            <p className="font-semibold text-sm">Stock issue — cannot proceed</p>
            <div className="text-xs mt-1 leading-relaxed space-y-1">
              {lines.map((l, i) => <p key={i}>{l}</p>)}
            </div>
            <p className="text-xs mt-2 text-gray-200">Please update your cart quantities and try again.</p>
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

  // ── Paystack success ────────────────────────────────────────────────────
  const handlePaymentSuccess = async (paystackResponse) => {
    const paystackReference =
      paystackResponse?.reference || paystackResponse?.trxref || null;

    try {
      const completeRes = await axiosInstance.post("/orders/complete", {
        paymentMethod:     "Paystack",
        buyerName:         user?.name || "Customer",
        paystackReference,
      });

      if (!completeRes.data.success) {
        toast.error(completeRes.data.message || "Order completion failed");
        return;
      }

      toast.success("Payment successful! 🎉");

      // Build the final receipt URL — the HTML page the iframe will load.
      // We include the auth token because the iframe creates a new request
      // that won't automatically carry the Authorization header.
      const token  = localStorage.getItem("pos-token") || "";
      const params = new URLSearchParams({
        customerName:  user?.name || "Customer",
        paymentMethod: "Paystack",
        mode:          "final",
        token,
      });
      const baseUrl = axiosInstance.defaults.baseURL || "/api";
      const url     = `${baseUrl}/orders/invoice?${params.toString()}`;

      // Show the receipt modal — the iframe loads the full HTML receipt
      // which has its own working PDF / Save Image / Print / Share buttons.
      setReceiptUrl(url);
      setShowReceiptModal(true);
      setOrders([]);
      fetchOrders(true);

    } catch (err) {
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

  // ── Close receipt modal ──────────────────────────────────────────────────
  const handleCloseReceiptModal = () => {
    setShowReceiptModal(false);
    setReceiptUrl("");
  };

  // ── Skeleton ────────────────────────────────────────────────────────────
  if (loading) return <CartSkeleton />;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShoppingCart size={24} className="text-indigo-600" />
            My Cart
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Review your items before checkout
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <motion.button
            onClick={() => fetchOrders(true)}
            disabled={refreshing}
            whileTap={{ scale: 0.94 }}
            className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition disabled:opacity-40"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </motion.button>

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

      {/* ── Stats row ── */}
      {orders.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <StatCard icon={ShoppingCart} label="Items in Cart"   value={orders.length}         color="bg-indigo-500" />
          <StatCard icon={PackageOpen}  label="Total Units"     value={totalItems}             color="bg-blue-500"   />
          <StatCard icon={Clock}        label="Pending Orders"  value={pendingOrders.length}   color="bg-amber-500"  />
        </div>
      )}

      {/* ── Orders table / empty state ── */}
      <AnimatePresence mode="wait">
        {orders.length === 0 ? (
          <EmptyCart key="empty" />
        ) : (
          <motion.div
            key="table"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <CustomerOrderTable
              orders={orders}
              onIncrease={handleIncreaseQty}
              onReduce={handleReduceQty}
              onDelete={handleDeleteOrder}
            />

            {/* ── Checkout footer ── */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-0.5">
                    Grand Total
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    ₦{grandTotal.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {totalItems} unit{totalItems !== 1 ? "s" : ""} across{" "}
                    {orders.length} item{orders.length !== 1 ? "s" : ""}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                  <motion.button
                    onClick={handlePreviewInvoice}
                    disabled={previewLoading}
                    whileTap={{ scale: 0.96 }}
                    className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl
                      border border-indigo-200 text-indigo-600 bg-indigo-50
                      hover:bg-indigo-100 transition text-sm font-semibold
                      disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FileText size={15} />
                    {previewLoading ? "Generating..." : "Preview Invoice"}
                  </motion.button>

                  <PaystackButton
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
                By proceeding, your cart will be cleared upon successful payment
                and a receipt will be generated automatically.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modals ── */}

      <PendingOrdersModal
        isOpen={showPendingModal}
        onClose={() => setShowPendingModal(false)}
        pendingOrders={pendingOrders}
      />

      {/* Final receipt modal — iframe loads the full HTML receipt page.
          All PDF / Save Image / Print / Share buttons live inside that
          page and work independently. The modal only needs Close.       */}
      <ReceiptModal
        open={showReceiptModal}
        onClose={handleCloseReceiptModal}
        previewUrl={receiptUrl}
        mode="final"
        role="customer"
      />

      {/* Preview invoice modal */}
      <AnimatePresence>
        {showPreviewModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClosePreview}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <FileText size={18} className="text-indigo-600" />
                  <h3 className="font-semibold text-gray-800">Invoice Preview</h3>
                </div>
                <button
                  onClick={handleClosePreview}
                  className="text-gray-400 hover:text-gray-600 text-xl leading-none transition"
                >
                  ×
                </button>
              </div>

              <div className="h-[60vh]">
                {previewUrl ? (
                  <iframe
                    src={previewUrl}
                    title="Invoice Preview"
                    className="w-full h-full border-0"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                    Loading preview…
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-100 bg-gray-50">
                <button
                  onClick={handleClosePreview}
                  className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default CustomerOrderPortal;