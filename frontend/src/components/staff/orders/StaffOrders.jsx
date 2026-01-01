import React, { useEffect, useState, useCallback } from "react";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import axiosInstance from "../../../utils/axiosInstance";
import StaffTable from "./StaffTable";
import StaffSkeleton from "./StaffSkeleton";
import StaffReceiptPromptModal from "./StaffReceiptPromptModal";

// Replace with your real store account details
const STORE_ACCOUNT = {
  bankName: "MELECH BANK",
  accountName: "MELECH STORE",
  accountNumber: "1234567890",
};

const PAYMENT_OPTIONS = ["Cash", "Card", "POS", "Bank Transfer"];

const StaffOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [processing, setProcessing] = useState(false);

  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptBlob, setReceiptBlob] = useState(null);
  const [receiptMode, setReceiptMode] = useState("preview"); // preview | final
  const [completedOrderId, setCompletedOrderId] = useState(null);

  // Fetch active orders
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/orders");
      const data = Array.isArray(res.data) ? res.data : res.data.orders || [];
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

  // ==================== CART ACTIONS ====================
  const handleIncreaseQty = async (orderId) => {
    try {
      await axiosInstance.post(`/orders/increase/${orderId}`);
      fetchOrders();
    } catch {
      toast.error("Failed to increase quantity");
    }
  };

  const handleReduceQty = async (orderId) => {
    try {
      await axiosInstance.post(`/orders/reduce/${orderId}`);
      fetchOrders();
    } catch {
      toast.error("Failed to reduce quantity");
    }
  };

  const handleDeleteOrder = async (orderId) => {
    alert("work")
    if (!window.confirm("Delete this item?")) return;
    try {
      await axiosInstance.delete(`/orders/remove/${orderId}`);
      fetchOrders();
      toast.success("Item deleted");
    } catch {
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

  // ==================== PREVIEW INVOICE ====================
  const previewInvoice = async () => {
    if (!orders.length) return toast.error("No orders to preview");

    try {
      setProcessing(true);
      const query = new URLSearchParams({
        mode: "preview",
        customerName: customerName || "Walk-in Customer",
        paymentMethod: paymentMethod || "Not Specified",
      }).toString();

      const res = await axiosInstance.get(`/orders/invoice?${query}`, {
        responseType: "blob",
      });

      setReceiptBlob(res.data);
      setReceiptMode("preview");
      setShowReceiptModal(true);
    } catch (err) {
      toast.error("Failed to generate preview");
    } finally {
      setProcessing(false);
    }
  };

  // ==================== COMPLETE ORDER ====================
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
        setCompletedOrderId(res.data.orderId);

        // Fetch final receipt
        const query = new URLSearchParams({
          mode: "final",
          orderSource: "staff",
          customerName: customerName || "Walk-in Customer",
          paymentMethod,
        }).toString();

        const invoiceRes = await axiosInstance.get(
          `/orders/invoice?${query}`,
          { responseType: "blob" }
        );
        setReceiptBlob(invoiceRes.data);
        setReceiptMode("final");
        setShowReceiptModal(true);

        // Clear local orders
        setOrders([]);
        setCustomerName("");
        setPaymentMethod("");
      }
    } catch (err) {
      toast.error("Failed to complete order");
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  // ==================== DOWNLOAD RECEIPT ====================
  const handleDownloadReceipt = () => {
    if (!receiptBlob) return;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(receiptBlob);
    link.download =
      receiptMode === "preview"
        ? `Invoice_UNPAID_${customerName || "Walk-in"}.pdf`
        : `Receipt_PAID_${customerName || "Walk-in"}.pdf`;
    link.click();
    setShowReceiptModal(false);
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
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
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
          <StaffTable
            orders={orders}
            onIncreaseQty={handleIncreaseQty}
            onReduceQty={handleReduceQty}
            onRemoveOrder={handleDeleteOrder}
          />
        )}

        <div className="mt-4 text-right font-semibold text-lg">
          Grand Total: ₦{grandTotal.toLocaleString()}
        </div>
      </motion.div>
      <StaffReceiptPromptModal
        show={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        receiptBlob={receiptBlob}
        receiptMode={receiptMode}
        onDownload={handleDownloadReceipt}
        storeAccount={STORE_ACCOUNT}
      />
    </>
  );
};

export default StaffOrders;
