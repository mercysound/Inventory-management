import React, { useEffect, useState } from "react";
import CustomerTable from "./CustomerTable";
import CustomerSkeleton from "./CustomerSkeleton";
import axiosInstance from "../../utils/axiosInstance";
import { toast } from "react-toastify";
import { motion } from "framer-motion";

const PAYMENT_OPTIONS = ["Cash", "Card", "POS", "Bank Transfer"];

const CustomerOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [processing, setProcessing] = useState(false);

  const fetchOrders = async () => {
    try {
      const res = await axiosInstance.get("/orders");
      const data = Array.isArray(res.data) ? res.data : res.data.orders || [];
      setOrders(data);
      const found = data.find((o) => o.paymentMethod)?.paymentMethod;
      if (found) setPaymentMethod(found);
    } catch (err) {
      toast.error("Failed to fetch orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
  fetchOrders();

  const handler = () => {
    fetchOrders();
  };
  window.addEventListener("ordersUpdated", handler);

  return () => {
    window.removeEventListener("ordersUpdated", handler);
  };
}, []);

  const handleIncreaseQty = async (orderId) => {
    try {
      const res = await axiosInstance.post(`/orders/increase/${orderId}`);
      if (res.data.success) {
        toast.success("Quantity increased");
        fetchOrders();
      }
    } catch {
      toast.error("Failed to increase quantity");
    }
  };

  const handleReduceQty = async (orderId) => {
    try {
      const res = await axiosInstance.post(`/orders/reduce/${orderId}`);
      if (res.data.success) fetchOrders();
    } catch {
      toast.error("Failed to reduce item");
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm("Delete this item?")) return;
    try {
      const res = await axiosInstance.delete(`/orders/remove/${orderId}`);
      if (res.data.success) {
        setOrders((prev) => prev.filter((o) => o._id !== orderId));
        toast.success("Item deleted");
      }
    } catch {
      toast.error("Failed to delete item");
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm("Clear all orders?")) return;
    try {
      const res = await axiosInstance.delete("/orders/clear");
      if (res.data.success) setOrders([]);
    } catch {
      toast.error("Failed to clear orders");
    }
  };

  const handleDownloadInvoice = async () => {
    try {
      setProcessing(true);
      if (!orders.length) return toast.error("No orders.");

      const query = new URLSearchParams({
        format: "pdf",
        customerName: customerName || "Guest",
        paymentMethod: paymentMethod || "Not Specified",
      }).toString();

      const response = await axiosInstance.get(`/orders/invoice?${query}`, {
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Invoice_${customerName || "Guest"}.pdf`;
      link.click();
      toast.success("Invoice downloaded");
    } catch {
      toast.error("Failed to download invoice");
    } finally {
      setProcessing(false);
    }
  };

  const completeOrder = async () => {
    if (!paymentMethod) return alert("Select payment method first.");
    if (!orders.length) return toast.error("No orders.");

    setProcessing(true);
    try {
      const allQuantity = orders.reduce((sum, o) => sum + (o.quantity || 0), 0);
      const totalPrice = orders.reduce(
        (sum, o) => sum + (o.totalPrice ?? o.quantity * o.price),
        0
      );
      const productList = orders.map((o) => o.product?.name || "Unnamed");
      const productDescription = orders.map(
        (o) => o.product?.description || "No Desc"
      );

      const res = await axiosInstance.post("/orders/payment", {
        paymentMethod,
        buyerName: customerName || "Unknown",
        productList,
        allQuantity,
        // deliveryStatus: "pending",
        totalPrice,
        paymentStatus: "Paid",
        productDescription,
      });

      if (res.data.success) {
        toast.success("Order completed successfully!");
        handleDownloadInvoice();
        await axiosInstance.delete("/orders/clear");
        setOrders([]);
        setCustomerName("");
        setPaymentMethod("");
      }
    } catch {
      toast.error("Error completing order");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto bg-white/80 backdrop-blur-md border border-gray-200 shadow-xl rounded-2xl p-6 mt-8"
    >
      <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">
        🧾 Customer Orders Summary
      </h2>

      {/* Top Controls */}
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
              onClick={completeOrder}
              disabled={processing}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-md transition-all disabled:opacity-60"
            >
              {processing ? "Saving..." : "Complete Order"}
            </button>
            <button
              onClick={handleDownloadInvoice}
              disabled={processing}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md transition-all disabled:opacity-60"
            >
              {processing ? "Downloading..." : "Download Invoice"}
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
            <CustomerSkeleton key={i} />
          ))}
        </div>
      ) : (
        <CustomerTable
          orders={orders}
          onIncreaseQty={handleIncreaseQty}
          onReduceQty={handleReduceQty}
          onRemoveOrder={handleDeleteOrder}
          onClearAll={handleClearAll}
        />
      )}
    </motion.div>
  );
};

export default CustomerOrders;
