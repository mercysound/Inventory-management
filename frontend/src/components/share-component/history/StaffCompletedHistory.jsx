import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import SharedOrderTable from "./SharedOrderTable";
import axiosInstance from "../../../utils/axiosInstance";
import ReceiptModal from "../receipt/ReceiptModal";


const StaffCompletedHistory = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // receipt modal
  const [receiptBlob, setReceiptBlob] = useState(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState("");
  const [showReceiptPrompt, setShowReceiptPrompt] = useState(false);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/completed-history");
      if (res.data.success) setOrders(res.data.orders || []);
    } catch {
      toast.error("Failed to fetch staff orders");
    } finally {
      setLoading(false);
    }
  };

  const deleteOrder = async (id) => {
    if (!window.confirm("Remove this order from your view?")) return;
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
      customerName: order.buyerName,
      paymentMethod: order.paymentMethod,
      orderSource:order.userOrdering.role, // ✅ REAL source from DB
      // historyReceipt: true
    }).toString();

    const res = await axiosInstance.get(`/orders/invoice?${query}`, {
      responseType: "blob",
    });

    setReceiptBlob(res.data);
    setReceiptPreviewUrl(URL.createObjectURL(res.data));
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
      <h2 className="text-2xl font-bold mb-3">📜 Staff Completed Orders</h2>

      <SharedOrderTable
        orders={orders}
        role="staff"
        onDelete={deleteOrder}
        onClearAll={clearAllOrders}
        onViewReceipt={handleViewReceipt}
      />

      <ReceiptModal
        open={showReceiptPrompt}
        onClose={() => setShowReceiptPrompt(false)}
        blob={receiptBlob}
        previewUrl={receiptPreviewUrl}
        mode="final"
        role="staff"
        onDownload={() => {
          if (!receiptBlob) return;
          const link = document.createElement("a");
          link.href = URL.createObjectURL(receiptBlob);
          link.download = "receipt.pdf";
          link.click();
        }}
      />
    </div>
  );
};

export default StaffCompletedHistory;
