import React, { useEffect, useState, useCallback } from "react";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart, FileText, Clock, RefreshCw, PackageOpen,
} from "lucide-react";
import axiosInstance from "../../../utils/axiosInstance";
import CustomerOrderTable from "./CustomerOrderTable";
import PaystackButton from "./PaystackButton";
import { useAuth } from "../../../context/AuthContext";
import PendingOrdersModal from "./PendingOrdersModal";
import ReceiptModal from "../../share-component/receipt/ReceiptModal";
import CartSkeleton from "./CartSkeleton";

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
    <div className={`p-2 rounded-lg ${color}`}><Icon size={18} className="text-white" /></div>
    <div>
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className="text-base font-bold text-gray-800">{value}</p>
    </div>
  </div>
);

const EmptyCart = () => (
  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center justify-center py-20 gap-4">
    <div className="w-20 h-20 rounded-full bg-indigo-50 flex items-center justify-center">
      <PackageOpen size={36} className="text-indigo-300" />
    </div>
    <div className="text-center">
      <p className="text-lg font-semibold text-gray-600">Your cart is empty</p>
      <p className="text-sm text-gray-400 mt-1">Browse the catalogue and add items to get started.</p>
    </div>
  </motion.div>
);

const parseOrderError = (err) => {
  const raw = err?.response?.data?.message || err?.message || "";
  if (raw.startsWith("STOCK_ERROR:")) {
    const parts = raw.replace("STOCK_ERROR:", "").split(":");
    const productName = parts[0] || "This item";
    const requested   = Number(parts[1]) || 0;
    const remaining   = Number(parts[2]) ?? 0;
    const stockLine   = remaining === 0
      ? "It is now completely out of stock."
      : `Only ${remaining} unit${remaining !== 1 ? "s" : ""} left in stock, but your cart has ${requested}.`;
    return { title: "Item No Longer Available", message: `"${productName}" could not be reserved — someone else completed their purchase first. ${stockLine} Please update your cart quantity or remove it and try again.`, type: "stock", productName, remaining };
  }
  if (raw.toLowerCase().includes("no active orders")) {
    return { title: "Cart is Empty", message: "Your cart appears to be empty. Please add items before checking out.", type: "empty" };
  }
  return { title: "Checkout Failed", message: raw || "Something went wrong. Please try again.", type: "generic" };
};

const CustomerOrderPortal = () => {
  const { user } = useAuth();
  const [orders, setOrders]                     = useState([]);
  const [pendingOrders, setPendingOrders]       = useState([]);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [loading, setLoading]                   = useState(true);
  const [refreshing, setRefreshing]             = useState(false);

  // ── Both the final receipt and the preview invoice now use ReceiptModal.
  // invoiceParams is the plain object of query params.
  // ReceiptModal fetches the HTML via axios internally — no URL building needed.
  const [receiptModal, setReceiptModal] = useState({ open: false, params: null, mode: "final" });

  const fetchOrders = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true); else setRefreshing(true);
      const [orderRes, historyRes] = await Promise.all([
        axiosInstance.get("/orders"),
        axiosInstance.get("/placed-orders"),
      ]);
      const cartOrders = orderRes.data.data || orderRes.data.orders || [];
      setOrders(cartOrders.map((o) => ({ ...o, total: o.total ?? o.quantity * o.price })));
      const history = historyRes.data.orders || [];
      setPendingOrders(history.filter((o) => ["pending", "processing"].includes(o.deliveryStatus?.toLowerCase())));
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch orders");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleIncreaseQty = async (orderId) => {
    const prev = orders;
    setOrders((os) => os.map((o) => o._id === orderId ? { ...o, quantity: o.quantity + 1, total: (o.quantity + 1) * o.price } : o));
    try {
      const res = await axiosInstance.post(`/orders/increase/${orderId}`);
      if (!res.data.success) { setOrders(prev); toast.error(res.data.message || "Failed to increase quantity"); }
    } catch (err) { setOrders(prev); toast.error(err?.response?.data?.message || "Failed to increase quantity"); }
  };

  const handleReduceQty = async (orderId) => {
    const order = orders.find((o) => o._id === orderId);
    if (!order) return;
    if (order.quantity <= 1) { handleDeleteOrder(orderId); return; }
    const prev = orders;
    setOrders((os) => os.map((o) => o._id === orderId ? { ...o, quantity: o.quantity - 1, total: (o.quantity - 1) * o.price } : o));
    try {
      const res = await axiosInstance.post(`/orders/reduce/${orderId}`);
      if (!res.data.success) { setOrders(prev); toast.error("Failed to reduce quantity"); }
    } catch { setOrders(prev); toast.error("Failed to reduce quantity"); }
  };

  const handleDeleteOrder = async (orderId) => {
    const prev = orders;
    setOrders((os) => os.filter((o) => o._id !== orderId));
    try {
      const res = await axiosInstance.delete(`/orders/remove/${orderId}`);
      if (!res.data.success) { setOrders(prev); toast.error("Failed to remove item"); }
      else toast.success("Item removed");
    } catch { setOrders(prev); toast.error("Failed to remove item"); }
  };

  const grandTotal = orders.reduce((sum, o) => sum + (o.total ?? o.quantity * o.price), 0);
  const totalItems = orders.reduce((sum, o) => sum + o.quantity, 0);

  // ── Preview invoice — opens ReceiptModal in preview mode ─────────────────
  const handlePreviewInvoice = () => {
    if (!orders.length) { toast.info("Add items to your cart first"); return; }
    setReceiptModal({
      open:   true,
      mode:   "preview",
      params: {
        customerName:  user?.name || "Customer",
        paymentMethod: "Paystack",
        mode:          "preview",
      },
    });
  };

  // ── Paystack pre-check ───────────────────────────────────────────────────
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
            <div className="text-xs mt-1 leading-relaxed space-y-1">{lines.map((l, i) => <p key={i}>{l}</p>)}</div>
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

  // ── Paystack success — opens ReceiptModal in final mode ──────────────────
  const handlePaymentSuccess = async (paystackResponse) => {
    const paystackReference = paystackResponse?.reference || paystackResponse?.trxref || null;
    try {
      const completeRes = await axiosInstance.post("/orders/complete", {
        paymentMethod: "Paystack",
        buyerName: user?.name || "Customer",
        paystackReference,
      });
      if (!completeRes.data.success) { toast.error(completeRes.data.message || "Order completion failed"); return; }
      toast.success("Payment successful! 🎉");
      setReceiptModal({
        open:   true,
        mode:   "final",
        params: {
          customerName:  user?.name || "Customer",
          paymentMethod: "Paystack",
          mode:          "final",
        },
      });
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
            {paystackReference && <p className="text-xs mt-2 text-amber-200 font-semibold">A refund has been initiated automatically to your card.</p>}
          </div>,
          { autoClose: 10000 }
        );
        fetchOrders(true);
      } else {
        toast.error(`${title}: ${message}`);
      }
    }
  };

  const closeReceiptModal = () => setReceiptModal({ open: false, params: null, mode: "final" });

  if (loading) return <CartSkeleton />;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShoppingCart size={24} className="text-indigo-600" /> My Cart
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">Review your items before checkout</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <motion.button onClick={() => fetchOrders(true)} disabled={refreshing} whileTap={{ scale: 0.94 }}
            className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition disabled:opacity-40">
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> Refresh
          </motion.button>
          <motion.button onClick={() => setShowPendingModal(true)} whileTap={{ scale: 0.94 }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg shadow-sm transition">
            <Clock size={14} /> Pending Orders
            {pendingOrders.length > 0 && (
              <span className="bg-white text-indigo-700 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">{pendingOrders.length}</span>
            )}
          </motion.button>
        </div>
      </div>

      {/* Stats */}
      {orders.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <StatCard icon={ShoppingCart} label="Items in Cart"  value={orders.length}       color="bg-indigo-500" />
          <StatCard icon={PackageOpen}  label="Total Units"    value={totalItems}           color="bg-blue-500"   />
          <StatCard icon={Clock}        label="Pending Orders" value={pendingOrders.length} color="bg-amber-500"  />
        </div>
      )}

      {/* Orders / empty */}
      <AnimatePresence mode="wait">
        {orders.length === 0 ? (
          <EmptyCart key="empty" />
        ) : (
          <motion.div key="table" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
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
                    {totalItems} unit{totalItems !== 1 ? "s" : ""} across {orders.length} item{orders.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                  <motion.button
                    onClick={handlePreviewInvoice}
                    whileTap={{ scale: 0.96 }}
                    className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-indigo-200 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition text-sm font-semibold"
                  >
                    <FileText size={15} /> Preview Invoice
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
                By proceeding, your cart will be cleared upon successful payment and a receipt will be generated automatically.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <PendingOrdersModal
        isOpen={showPendingModal}
        onClose={() => setShowPendingModal(false)}
        pendingOrders={pendingOrders}
      />

      {/* Single ReceiptModal handles both preview and final receipt.
          mode prop controls the header label (Unpaid/Paid).
          invoiceParams is passed to the modal which fetches HTML via axios. */}
      <ReceiptModal
        open={receiptModal.open}
        onClose={closeReceiptModal}
        invoiceParams={receiptModal.params}
        mode={receiptModal.mode}
        role="customer"
      />

    </div>
  );
};

export default CustomerOrderPortal;