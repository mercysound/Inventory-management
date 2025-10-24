import React, { useEffect, useState } from "react";
import CustomerTable from "./CustomerTable";
import CustomerSkeleton from "./CustomerSkeleton";
import axiosInstance from "../../utils/axiosInstance";

const PAYMENT_OPTIONS = ["Cash", "Card", "POS", "Bank Transfer"];

const CustomerOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await axiosInstance.get("/orders");
        const data = Array.isArray(res.data) ? res.data : res.data.orders || [];
        setOrders(data);
        const found = data.find(o => o.paymentMethod)?.paymentMethod;
        if (found) setPaymentMethod(found);
      } catch (err) {
        console.error("Error fetching orders:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  // ✅ Set payment for all orders (entire cart)
  const handleSetPaymentMethod = async () => {
    if (!paymentMethod) {
      alert("Please select a payment method first.");
      return;
    }
    try {
      setProcessing(true);
      const res = await axiosInstance.post("/orders/payment", { paymentMethod });
      if (res.data.success) {
        setOrders(prev => prev.map(o => ({ ...o, paymentMethod })));
        alert("Payment method saved successfully!");
      }
    } catch (error) {
      console.error("Error setting payment method:", error);
      alert("Failed to set payment method.");
    } finally {
      setProcessing(false);
    }
  };

  // ✅ View unified invoice (all products)
const handleViewInvoice = async () => {
  const token = localStorage.getItem("pos-token");
  if (!token) {
    alert("Please login again, session expired.");
    return;
  }

  const url = `${import.meta.env.VITE_API_URL}/orders/invoice?format=pdf&token=${token}`;
  window.open(url, "_blank");
};


  // ✅ Download unified invoice (all products)
  const handleDownloadInvoice = async () => {
    try {
      setProcessing(true);
      const response = await axiosInstance.get(`/orders/invoice?format=pdf`, {
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "Invoice_All_Products.pdf";
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

      {/* Payment method selector for the entire order */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <label className="font-medium text-gray-700">Payment Method:</label>
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

        <button
          onClick={handleSetPaymentMethod}
          disabled={processing}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow disabled:opacity-60"
        >
          {processing ? "Saving..." : "Save Payment Method"}
        </button>
      </div>

      {/* Orders table or skeleton */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <CustomerSkeleton key={i} />
          ))}
        </div>
      ) : (
        <CustomerTable orders={orders} />
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
