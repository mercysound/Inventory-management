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
        const data = Array.isArray(res.data)
          ? res.data
          : res.data.orders || [];
        setOrders(data);
        const found = data.find((o) => o.paymentMethod)?.paymentMethod;
        if (found) setPaymentMethod(found);
      } catch (err) {
        console.error("Error fetching orders:", err);
      } finally {
        setLoading(false);
      }
    };
  // ✅ Fetch orders
  useEffect(() => {
    fetchOrders();
  }, []);

  // ✅ Save payment method
const completeOrder = async () => {
  try {
    if (!paymentMethod) {
      alert("Please select a payment method first.");
      return;
    }
    
    if (!orders || orders.length === 0) {
      toast.error("No orders found.");
      return;
    }

    // 🧮 Compute derived values
    const allQuantity = orders.reduce((sum, o) => sum + o.quantity, 0);
    const totalPrice = orders.reduce((sum, o) => sum + o.totalPrice, 0);
    const userOrdering = orders[0]?.userOrdering?.name || "Unknown User";
    const productList = [...new Set(orders.map(o => o.product?.name || "Unnamed Product"))];
    const deliveryStatus = "pending"; // or from state if you track it

    // 📨 Send to backend
    const res = await axiosInstance.post("/orders/payment", {
      paymentMethod,
      buyerName: customerName || "Unknown",
      userOrdering,
      productList,
      allQuantity,
      deliveryStatus,
      totalPrice
    });

    if (res.data.success) {
      toast.success(res.data.message);
      fetchOrders(); // refresh the table
    } else {
      toast.error(res.data.message);
    }
  } catch (error) {
    console.error("Error saving payment method:", error);
    toast.error("Failed to save payment details.");
  }
};




  // ✅ Reduce quantity
  const handleReduceQty = async (orderId) => {
    try {
      const res = await axiosInstance.post(`/orders/reduce/${orderId}`);
      if (res.data.success) {
        setOrders((prev) =>
          prev.map((order) =>
            order._id === orderId
              ? { ...order, quantity: Math.max(order.quantity - 1, 0) }
              : order
          )
        );
      }
    } catch (error) {
      console.error("Error reducing order quantity:", error);
      alert("Failed to reduce quantity.");
    }
  };

  // ✅ Delete order item
  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;

    try {
      const res = await axiosInstance.delete(`/orders/remove/${orderId}`);
      if (res.data.success) {
        setOrders((prev) => prev.filter((order) => order._id !== orderId));
      }
    } catch (error) {
      console.error("Error deleting order:", error);
      alert("Failed to delete order.");
    }
  };

  // ✅ Invoice (same as before)
  const handleViewInvoice = async () => {
    const token = localStorage.getItem("pos-token");
    if (!token) {
      alert("Please login again.");
      return;
    }

    const url = `${import.meta.env.VITE_API_URL}/orders/invoice?format=pdf&token=${token}&customerName=${encodeURIComponent(
      customerName
    )}&paymentMethod=${encodeURIComponent(paymentMethod)}`;
    window.open(url, "_blank");
  };

  const handleDownloadInvoice = async () => {
    try {
      setProcessing(true);
      const response = await axiosInstance.get(
        `/orders/invoice?format=pdf&customerName=${encodeURIComponent(
          customerName
        )}&paymentMethod=${encodeURIComponent(paymentMethod)}`,
        { responseType: "blob" }
      );
      const blob = new Blob([response.data], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Invoice_${customerName || "Guest"}.pdf`;
      link.click();
    } catch (error) {
      console.error("Error downloading invoice:", error);
      alert("Error downloading invoice.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto bg-white shadow-lg rounded-2xl p-6 mt-8 border border-gray-200">
      <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">
        🧾 Customer Orders Summary
      </h2>

      {/* Inputs */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
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
            {["Cash", "Card", "POS", "Bank Transfer"].map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={completeOrder}
          disabled={processing}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow disabled:opacity-60"
        >
          {processing ? "Saving..." : "Complete Order"}
        </button>
      </div>

      {/* Orders table */}
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
        />
      )}

      {!loading && orders.length > 0 && (
        <div className="flex justify-center gap-4 mt-6">
          <button
            onClick={handleViewInvoice}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-md transition-all"
          >
            View Invoice
          </button>
          <button
            onClick={handleDownloadInvoice}
            disabled={processing}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md transition-all disabled:opacity-60"
          >
            {processing ? "Downloading..." : "Download Invoice"}
          </button>
        </div>
      )}
    </div>
  );
};

export default CustomerOrders;
