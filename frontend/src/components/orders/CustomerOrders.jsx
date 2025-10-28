import React, { useEffect, useState } from "react";
import CustomerTable from "./CustomerTable";
import CustomerSkeleton from "./CustomerSkeleton";
import axiosInstance from "../../utils/axiosInstance";
import { toast } from "react-toastify";

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
      console.error("Error fetching orders:", err);
      toast.error("Failed to fetch orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // ✅ Reduce quantity
  const handleReduceQty = async (orderId) => {
    try {
      const res = await axiosInstance.post(`/orders/reduce/${orderId}`);
      if (res.data.success) {
        setOrders((prev) =>
          prev
            .map((order) =>
              order._id === orderId
                ? {
                  ...order,
                  quantity: Math.max(order.quantity - 1, 0),
                  totalPrice: (order.quantity - 1) * order.price,
                }
                : order
            )
            .filter((o) => o.quantity > 0)
        );
      }
    } catch (error) {
      console.error("Error reducing:", error);
      toast.error("Failed to reduce item.");
    }
  };

  // ✅ Delete order
  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    try {
      const res = await axiosInstance.delete(`/orders/remove/${orderId}`);
      if (res.data.success) {
        setOrders((prev) => prev.filter((o) => o._id !== orderId));
        toast.success("Item deleted.");
      }
    } catch (error) {
      console.error("delete error:", error);
      toast.error("Failed to delete item.");
    }
  };

  // ✅ View Invoice (includes paymentStatus)
  const handleViewInvoice = () => {
    const token = localStorage.getItem("pos-token");
    if (!token) {
      alert("Please login again.");
      return;
    }
    if (!orders || orders.length === 0) {
        toast.error("No orders to view.");
        return;
      }
    const query = new URLSearchParams({
      format: "pdf",
      token,
      customerName: customerName || "Guest Customer",
      paymentMethod: paymentMethod || "Not Specified",
    }).toString();
    window.open(`${import.meta.env.VITE_API_URL}/orders/invoice?${query}`, "_blank");
  };
  // ✅ Download Invoice
  const handleDownloadInvoice = async () => {
    try {
      setProcessing(true);
      if (!orders || orders.length === 0) {
        toast.error("No orders.");
        return;
      }
      const query = new URLSearchParams({
        format: "pdf",
        customerName: customerName || "Guest Customer",
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
    } catch (error) {
      console.error("download invoice error:", error);
      toast.error("Failed to download invoice.");
    } finally {
      setProcessing(false);
    }
  };
  const handleClearAll = async () => {
    if (!window.confirm("Clear all current orders? This cannot be undone.")) return;
    try {
      const res = await axiosInstance.delete("/orders/clear");
      if (res.data.success) {
        setOrders([]);
        toast.success(res.data.message || "Orders cleared.");
      }
    } catch (error) {
      console.error("clear error:", error);
      toast.error("Failed to clear orders.");
    }
  };
  const clearAllSilently = async () => {
    try {
      const res = await axiosInstance.delete("/orders/clear");
      if (res.data.success) {
        setOrders([]);
        console.log("Orders cleared automatically.");
      }
    } catch (error) {
      console.error("Auto clear error:", error);
    }
  };
  // ✅ Complete Order with paymentStatus: "Paid"
 const completeOrder = async () => {
    try {
      if (!orders || orders.length === 0) {
        toast.error("No orders to complete.");
        return;
      }
      if (!paymentMethod) {
        alert("Please select a payment method first.");
        return;
      }

      setProcessing(true);

      const allQuantity = orders.reduce((sum, o) => sum + (o.quantity || 0), 0);
      const totalPrice = orders.reduce(
        (sum, o) => sum + (o.totalPrice ?? o.quantity * o.price),
        0
      );
      const productList = orders.map((o) => o.product?.name || "Unnamed");
      const productDescription = orders.map((o) => o.product?.description || "No Desc");
      const deliveryStatus = "pending";

      // ✅ Complete order and record payment as "Paid"
      const res = await axiosInstance.post("/orders/payment", {
        paymentMethod,
        buyerName: customerName || "Unknown",
        productList,
        allQuantity,
        deliveryStatus,
        totalPrice,
        paymentStatus: "Paid",
        productDescription,
      });

      if (res.data.success) {
        toast.success("Order completed successfully!");

        // ✅ Download invoice automatically
        try {
          const query = new URLSearchParams({
            format: "pdf",
            customerName: customerName || "Guest Customer",
            paymentMethod: paymentMethod || "Not Specified",
            paymentStatus: "Paid", // ✅ force show paid
          }).toString();

          const response = await axiosInstance.get(`/orders/invoice?${query}`, {
            responseType: "blob",
          });

          const blob = new Blob([response.data], { type: "application/pdf" });
          const link = document.createElement("a");
          link.href = URL.createObjectURL(blob);
          link.download = `Invoice_${customerName || "Guest"}.pdf`;
          link.click();

          toast.success("Invoice downloaded automatically.");
        } catch (downloadError) {
          console.error("Invoice download error:", downloadError);
          toast.error("Order saved, but failed to auto-download invoice.");
        }

        // ✅ Clear all orders after invoice download
        await clearAllSilently();
        await fetchOrders();
      } else {
        toast.error(res.data.message || "Failed to complete order");
      }
    } catch (error) {
      console.error("completeOrder error:", error);
      toast.error("Error completing order.");
    } finally {
      setProcessing(false);
    }
  };


  return (
    <div className="max-w-6xl mx-auto bg-white shadow-lg rounded-2xl p-6 mt-8 border border-gray-200">
      <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">
        🧾 Customer Orders Summary
      </h2>

      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
        {/* Input + Select */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Enter customer name (optional)"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="p-2 border rounded-md focus:ring focus:ring-indigo-200 w-full sm:w-64"
          />
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="p-2 border rounded-md focus:ring focus:ring-indigo-200"
          >
            <option value="">-- Select Payment Method --</option>
            {PAYMENT_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={completeOrder}
            disabled={processing}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow disabled:opacity-60"
          >
            {processing ? "Saving..." : "Complete Order"}
          </button>
          <button
            onClick={handleViewInvoice}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md shadow"
          >
            View Invoice
          </button>
          <button
            onClick={handleDownloadInvoice}
            disabled={processing}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow disabled:opacity-60"
          >
            {processing ? "Downloading..." : "Download Invoice"}
          </button>
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
          onReduceQty={handleReduceQty}
          onRemoveOrder={handleDeleteOrder}
          onClearAll={handleClearAll}
        />
      )}
    </div>
  );
};

export default CustomerOrders;
