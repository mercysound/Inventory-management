import React, { useEffect, useState, useCallback } from "react";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import axiosInstance from "../../../utils/axiosInstance";
import StaffTable from "./StaffTable";
import StaffSkeleton from "./StaffSkeleton";
import ReceiptModal from "../../share-component/receipt/ReceiptModal";

const STORE_ACCOUNT = {
  bankName: "MELECH BANK",
  accountName: "MELECH STORE",
  accountNumber: "1234567890",
};

const PAYMENT_OPTIONS = ["card", "bank_transfer", "cash_on_delivery", "paystack"];

// ─── Stock error parser ─────────────────────────────────────────────────────
// Backend sends: STOCK_ERROR:ProductName:requestedQty:remainingStock
// Staff get a more operational message — they need to know what to adjust.
const parseOrderError = (err) => {
  const raw = err?.response?.data?.message || err?.message || "";

  if (raw.startsWith("STOCK_ERROR:")) {
    const parts     = raw.replace("STOCK_ERROR:", "").split(":");
    const productName = parts[0] || "This item";
    const requested   = Number(parts[1]) || 0;
    const remaining   = Number(parts[2]) ?? 0;

    let stockLine = "";
    if (remaining === 0) {
      stockLine = "It is now completely out of stock — remove it from the cart.";
    } else {
      stockLine = `Only ${remaining} unit${remaining !== 1 ? "s" : ""} available, but the cart has ${requested}. Please reduce the quantity to ${remaining} or less and try again.`;
    }

    return {
      title: "Stock Conflict",
      message: `"${productName}" could not be reserved — a customer may have just purchased the last units. ${stockLine}`,
      type: "stock",
      productName,
      remaining,
    };
  }

  if (raw.toLowerCase().includes("no active orders")) {
    return {
      title: "Cart is Empty",
      message: "No items in the cart. Add products before completing the order.",
      type: "empty",
    };
  }

  return {
    title: "Order Failed",
    message: raw || "Something went wrong. Please try again.",
    type: "generic",
  };
};

const StaffOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [processing, setProcessing] = useState(false);

  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState("");
  const [receiptDownloadUrl, setReceiptDownloadUrl] = useState("");
  const [receiptMode, setReceiptMode] = useState("preview");

  // ── Fetch orders ────────────────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/orders");
      const data = Array.isArray(res.data)
        ? res.data
        : res.data.data || res.data.orders || [];
      setOrders(data);
    } catch (err) {
      toast.error("Failed to fetch orders.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    const handler = () => fetchOrders();
    window.addEventListener("ordersUpdated", handler);
    return () => window.removeEventListener("ordersUpdated", handler);
  }, [fetchOrders]);

  // ── Cart actions — optimistic UI ────────────────────────────────────────
  // State is updated INSTANTLY on click. Server call happens in background.
  // If server fails, state rolls back and error toast shows.
  // This removes the full page reload that was happening before.

  const handleIncreaseQty = async (orderId) => {
    const prev = orders;
    setOrders((os) =>
      os.map((o) =>
        o._id === orderId
          ? { ...o, quantity: o.quantity + 1, totalPrice: (o.quantity + 1) * o.price }
          : o
      )
    );
    try {
      await axiosInstance.post(`/orders/increase/${orderId}`);
    } catch (err) {
      setOrders(prev);
      const msg = err?.response?.data?.message || "Failed to increase quantity";
      toast.error(msg);
    } finally {
    }
  };

  const handleReduceQty = async (orderId) => {
    const order = orders.find((o) => o._id === orderId);
    if (!order) return;
    const prev = orders;

    if (order.quantity <= 1) {
      setOrders((os) => os.filter((o) => o._id !== orderId));
      try {
        await axiosInstance.post(`/orders/reduce/${orderId}`);
      } catch {
        setOrders(prev);
        toast.error("Failed to reduce quantity");
      }
      return;
    }

    setOrders((os) =>
      os.map((o) =>
        o._id === orderId
          ? { ...o, quantity: o.quantity - 1, totalPrice: (o.quantity - 1) * o.price }
          : o
      )
    );
    try {
      await axiosInstance.post(`/orders/reduce/${orderId}`);
    } catch {
      setOrders(prev);
      toast.error("Failed to reduce quantity");
    } finally {
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm("Delete this item?")) return;
    const prev = orders;
    setOrders((os) => os.filter((o) => o._id !== orderId));
    try {
      await axiosInstance.delete(`/orders/remove/${orderId}`);
      toast.success("Item deleted");
    } catch {
      setOrders(prev); // rollback
      toast.error("Failed to delete item");
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm("Clear all orders?")) return;
    try {
      await axiosInstance.delete("/orders/clear");
      setOrders([]);
      toast.success("All orders cleared");
    } catch {
      toast.error("Failed to clear orders");
    }
  };

  const grandTotal = orders.reduce(
    (sum, o) => sum + (o.totalPrice || o.quantity * o.price || 0),
    0
  );

  // ── Error handler using the parser ──────────────────────────────────────
  const handleApiError = (err) => {
    const { title, message, type } = parseOrderError(err);

    if (type === "stock") {
      toast.error(
        <div>
          <p className="font-semibold text-sm">{title}</p>
          <p className="text-xs mt-1 leading-relaxed">{message}</p>
        </div>,
        { autoClose: 9000 } // staff need more time to read the action required
      );
      // Refresh so staff can see the current quantities immediately
      fetchOrders();
    } else {
      toast.error(`${title}: ${message}`);
    }
  };

  // ── Preview invoice ─────────────────────────────────────────────────────
  const previewInvoice = async () => {
    if (!orders.length) return toast.error("No orders to preview");

    try {
      setProcessing(true);
      const query = new URLSearchParams({
        mode: "preview",
        customerName: customerName || "Walk-in Customer",
        paymentMethod: paymentMethod || "Not Specified",
      }).toString();

      const url = `/orders/invoice?${query}`;
      setReceiptUrl(url);
      setReceiptDownloadUrl(`/orders/invoice?${query}&download=true`);
      setReceiptMode("preview");
      setShowReceiptModal(true);
    } catch (err) {
      toast.error("Failed to generate preview");
    } finally {
      setProcessing(false);
    }
  };

  // ── Complete order ──────────────────────────────────────────────────────
  const completeOrder = async () => {
    if (!paymentMethod) return toast.error("Select payment method first");
    if (!orders.length) return toast.error("No orders to complete");

    setProcessing(true);

    try {
      const res = await axiosInstance.post("/orders/complete", {
        paymentMethod,
        buyerName: customerName || "Walk-in Customer",
      });

      if (res.data.success) {
        toast.success("Order completed successfully");

        const query = new URLSearchParams({
          mode: "final",
          orderSource: "staff",
          customerName: customerName || "Walk-in Customer",
          paymentMethod,
        }).toString();

        const url = `/orders/invoice?${query}`;
        setReceiptUrl(url);
        setReceiptDownloadUrl(`/orders/invoice?${query}&download=true`);
        setReceiptMode("final");
        setShowReceiptModal(true);

        setOrders([]);
        setCustomerName("");
        setPaymentMethod("");
      }
    } catch (err) {
      handleApiError(err);
    } finally {
      setProcessing(false);
    }
  };

  // ── Download receipt ────────────────────────────────────────────────────
  const handleDownloadReceipt = () => {
    if (!receiptDownloadUrl) return;
    const link = document.createElement("a");
    link.href = receiptDownloadUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    handleCloseReceiptModal();
  };

  // ── Close modal ─────────────────────────────────────────────────────────
  const handleCloseReceiptModal = () => {
    setShowReceiptModal(false);
    setReceiptUrl("");
    setReceiptDownloadUrl("");
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl mx-auto bg-white/80 backdrop-blur-md border border-gray-200 shadow-xl rounded-2xl p-6 mt-8"
      >
        <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">
          🧾 Customer Orders Summary
        </h2>

        {/* Controls */}
        <div className="bg-white/70 backdrop-blur-sm border border-gray-100 rounded-xl p-4 mb-6 shadow-sm">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
              <input
                type="text"
                placeholder="Enter customer name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full sm:w-64 px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-400 transition-all"
              />
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full sm:w-56 px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-400 transition-all"
              >
                <option value="">-- Select Payment Method --</option>
                {PAYMENT_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap justify-center lg:justify-end gap-3 w-full lg:w-auto">
              <button
                onClick={previewInvoice}
                disabled={processing}
                className="px-5 py-2 bg-gray-700 hover:bg-gray-800 text-white rounded-lg shadow-md transition-all disabled:opacity-60"
              >
                Preview Invoice
              </button>
              <button
                onClick={completeOrder}
                disabled={processing}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-md transition-all disabled:opacity-60"
              >
                Complete Order
              </button>
              <button
                onClick={handleClearAll}
                className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-md transition-all"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <StaffSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <StaffTable
              orders={orders}
              onIncreaseQty={handleIncreaseQty}
              onReduceQty={handleReduceQty}
              onRemoveOrder={handleDeleteOrder}
            />
          </div>
        )}

        <div className="mt-4 text-right font-semibold text-lg">
          Grand Total: ₦{grandTotal.toLocaleString()}
        </div>
      </motion.div>

      {/* Receipt Modal */}
      <ReceiptModal
        open={showReceiptModal}
        onClose={handleCloseReceiptModal}
        previewUrl={receiptUrl}
        mode={receiptMode}
        role="staff"
        storeAccount={STORE_ACCOUNT}
        downloadUrl={receiptDownloadUrl}
        onDownload={handleDownloadReceipt}
      />
    </>
  );
};

export default StaffOrders;