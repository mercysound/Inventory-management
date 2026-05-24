import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import SharedOrderTable from "./SharedOrderTable";
import axiosInstance from "../../../utils/axiosInstance";
import ReceiptModal from "../receipt/ReceiptModal";


const CustomerCompletedHistory = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // receipt modal
  const [receiptHtml, setReceiptHtml] = useState("");
  const [receiptDownloadUrl, setReceiptDownloadUrl] = useState("");
  const [showReceiptPrompt, setShowReceiptPrompt] = useState(false);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/completed-history");
      if (res.data.success) setOrders(res.data.orders || []);
    } catch {
      toast.error("Failed to fetch your completed orders");
    } finally {
      setLoading(false);
    }
  };

  const deleteOrder = async (id) => {
    if (!window.confirm("Remove this order from your history?")) return;
    try {
      const res = await axiosInstance.delete(`/completed-history/${id}`);
      if (res.data.success) {
        toast.success(res.data.message);
        setOrders((prev) => prev.filter((o) => o._id !== id));
      }
    } catch {
      toast.error("Error deleting order");
    }
  };

  const clearAllOrders = async () => {
    if (!window.confirm("Clear all your completed orders?")) return;
    try {
      const res = await axiosInstance.delete("/completed-history/clear/all");
      if (res.data.success) {
        setOrders([]);
        toast.success(res.data.message);
      }
    } catch {
      toast.error("Error clearing orders");
    }
  };

  // ------------------ RECEIPT PREVIEW ------------------
  const handleViewReceipt = async (orderId, order) => {
    console.log(order);
    
  try {
    const query = new URLSearchParams({
      orderId,
      mode: "final",
      customerName: order.userOrdering.name,
      paymentMethod: order.paymentMethod,
      orderSource:order.userOrdering.role, // ✅ REAL source from DB
      historyReceipt: true
    }).toString();

    const res = await axiosInstance.get(`/orders/invoice?${query}`, {
      responseType: "text",
    });

    setReceiptHtml(res.data);
    setReceiptDownloadUrl(`/orders/invoice?${query}&download=true`);
    setShowReceiptPrompt(true);
  } catch (err) {
    console.error(err);
    toast.error("Failed to load receipt");
  }
};


  useEffect(() => {
    fetchOrders();
  }, []);

  if (loading) return <p className="text-center py-10">Loading...</p>;

  return (
    <div className="p-5">
      <h2 className="text-2xl font-bold mb-3">📜 Your Completed Orders</h2>

      <SharedOrderTable
        orders={orders}
        role="customer"
        onDelete={deleteOrder}
        onClearAll={clearAllOrders}
        onViewReceipt={handleViewReceipt}
      />

      <ReceiptModal
        open={showReceiptPrompt}
        onClose={() => setShowReceiptPrompt(false)}
        html={receiptHtml}
        mode="final"
        role="customer"
        downloadUrl={receiptDownloadUrl}
      />
    </div>
  );
};

export default CustomerCompletedHistory;
