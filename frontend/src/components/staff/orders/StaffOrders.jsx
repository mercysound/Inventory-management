import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import StaffTable from "./StaffTable";
import axiosInstance from "../../../utils/axiosInstance";

const PAYMENT_METHODS = ["Cash", "Bank Transfer", "POS", "Paystack"];

export default function OrderCheckout({ user }) {
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [customerName, setCustomerName] = useState(user?.name || "");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [receiptBlob, setReceiptBlob] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showFinal, setShowFinal] = useState(false);
  const [processing, setProcessing] = useState(false);

  const fetchOrders = async () => {
    try {
      const res = await axiosInstance.get("/orders");
      const data = Array.isArray(res.data) ? res.data : res.data.orders;
      setOrders(data || []);
    } catch {
      alert("Failed to load orders");
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
  const fetchData = async () => {
    try {
      const res = await axiosInstance.get("/orders");
      const data = Array.isArray(res.data) ? res.data : res.data.orders;
      setOrders(data || []);
    } catch {
      alert("Failed to load orders");
    } finally {
      setLoadingOrders(false);
    }
  };

  fetchData();
}, []);

  const grandTotal = orders.reduce(
    (sum, o) => sum + (o.totalPrice || o.quantity * o.price || 0),
    0
  );

  const handleIncreaseQty = async (id) => {
    try {
      await axiosInstance.post(`/orders/increase/${id}`);
      fetchOrders();
    } catch {
      alert("Failed to increase quantity");
    }
  };

  const handleReduceQty = async (id) => {
    try {
      await axiosInstance.post(`/orders/reduce/${id}`);
      fetchOrders();
    } catch {
      alert("Failed to reduce quantity");
    }
  };

  const handleDeleteOrder = async (id) => {
    if (!window.confirm("Delete this item?")) return;
    try {
      await axiosInstance.delete(`/orders/remove/${id}`);
      fetchOrders();
    } catch {
      alert("Failed to delete order");
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm("Clear all orders?")) return;
    try {
      await axiosInstance.delete("/orders/clear");
      setOrders([]);
    } catch {
      alert("Failed to clear orders");
    }
  };

  const handlePreviewInvoice = async () => {
    if (!orders.length) return alert("No orders to preview");
    try {
      setProcessing(true);
      const query = new URLSearchParams({
        format: "pdf",
        customerName: customerName || "Guest",
        paymentMethod: paymentMethod || "Not Specified",
        mode:"preview"
      }).toString();
      const res = await axiosInstance.get(
        `/orders/invoice?${query}`,
        { responseType: "blob" }
      );
      setReceiptBlob(res.data);
      setShowPreview(true);
      setShowFinal(false);
    } catch {
      alert("Failed to generate invoice preview");
    } finally {
      setProcessing(false);
    }
  };

  const handleCompleteOrder = async () => {
    if (!paymentMethod) return alert("Select payment method");
    if (!orders.length) return alert("No orders to complete");
    try {
      setProcessing(true);
      await axiosInstance.post("/orders/complete", {
        paymentMethod,
        buyerName: customerName || "Walk-in Customer",
      });
      const res = await axiosInstance.get(
        `/orders/invoice?mode=final&customerName=${customerName}&paymentMethod=${paymentMethod}`,
        { responseType: "blob" }
      );
      setReceiptBlob(res.data);
      setShowPreview(false);
      setShowFinal(true);
      setOrders([]);
    } catch {
      alert("Failed to complete order");
    } finally {
      setProcessing(false);
    }
  };

  const downloadReceipt = (filename) => {
    if (!receiptBlob) return;
    const url = URL.createObjectURL(receiptBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-xl p-6"
      >
        <h2 className="text-2xl font-bold text-center mb-6">🧾 POS Checkout</h2>

        {/* Customer Info */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Customer name"
            className="border rounded-xl px-4 py-3 flex-1 shadow-sm focus:ring-2 focus:ring-indigo-400"
          />
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="border rounded-xl px-4 py-3 shadow-sm focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">Select payment method</option>
            {PAYMENT_METHODS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* Orders Table */}
        <StaffTable
          orders={orders}
          loading={loadingOrders}
          onIncreaseQty={handleIncreaseQty}
          onReduceQty={handleReduceQty}
          onDeleteOrder={handleDeleteOrder}
        />

        <div className="flex justify-between items-center mt-4 mb-6 flex-wrap gap-2">
          <button
            onClick={handleClearAll}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-md"
          >
            Clear All
          </button>
          <span className="font-bold text-lg">
            Grand Total: ₦{grandTotal.toLocaleString()}
          </span>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-4 justify-center">
          <button
            onClick={handlePreviewInvoice}
            disabled={processing}
            className="px-6 py-3 rounded-xl bg-gray-700 text-white"
          >
            Preview Invoice
          </button>
          <button
            onClick={handleCompleteOrder}
            disabled={processing}
            className="px-6 py-3 rounded-xl bg-indigo-600 text-white"
          >
            Complete Order
          </button>
        </div>
      </motion.div>

      {/* Invoice Modal */}
      <AnimatePresence>
        {(showPreview || showFinal) && receiptBlob && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-2"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white rounded-2xl w-full md:w-[80%] h-[85vh] p-4 flex flex-col"
            >
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold">
                  {showFinal ? "Final Receipt (PAID)" : "Invoice Preview (UNPAID)"}
                </h3>
                <button
                  onClick={() => {
                    setShowPreview(false);
                    setShowFinal(false);
                  }}
                >
                  ✕
                </button>
              </div>
              <iframe
                src={URL.createObjectURL(receiptBlob)}
                className="w-full flex-1 border rounded"
                title="Invoice"
              />
              <div className="flex justify-end mt-4">
                <button
                  onClick={() =>
                    downloadReceipt(showFinal ? "Receipt_PAID.pdf" : "Invoice_UNPAID.pdf")
                  }
                  className="px-5 py-2 bg-indigo-600 text-white rounded-xl"
                >
                  Download
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
