import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import SharedOrderTable from "./SharedOrderTable";
import axiosInstance from "../../../utils/axiosInstance";
import ReceiptModal from "../receipt/ReceiptModal";

const CustomerCompletedHistory = () => {
  const [orders,           setOrders]           = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [receiptBlob,      setReceiptBlob]      = useState(null);
  const [receiptPreviewUrl,setReceiptPreviewUrl]= useState("");
  const [showReceiptPrompt,setShowReceiptPrompt]= useState(false);

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
      toast.error("Error removing order");
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

  const handleViewReceipt = async (orderId, order) => {
    try {
      const query = new URLSearchParams({
        orderId,
        mode:          "final",
        customerName:  order.userOrdering?.name || order.buyerName || "Customer",
        paymentMethod: order.paymentMethod,
        orderSource:   order.userOrdering?.role || "customer",
        historyReceipt: true,
      }).toString();

      const res = await axiosInstance.get(`/orders/invoice?${query}`, { responseType: "blob" });
      setReceiptBlob(res.data);
      setReceiptPreviewUrl(URL.createObjectURL(res.data));
      setShowReceiptPrompt(true);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load receipt");
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  if (loading) return <p className="text-center py-10">Loading...</p>;

  return (
    <div className="p-5">
      <h2 className="text-2xl font-bold mb-1">📜 Your Order History</h2>
      <p className="text-sm text-gray-500 mb-4">
        Completed, cancelled, and refunded orders appear here.
      </p>

      <SharedOrderTable
        orders={orders}
        role="customer"
        onDelete={deleteOrder}
        onClearAll={clearAllOrders}
        onViewReceipt={handleViewReceipt}
      />

      <ReceiptModal
        open={showReceiptPrompt}
        onClose={() => {
          setShowReceiptPrompt(false);
          if (receiptPreviewUrl) URL.revokeObjectURL(receiptPreviewUrl);
          setReceiptPreviewUrl("");
        }}
        blob={receiptBlob}
        previewUrl={receiptPreviewUrl}
        mode="final"
        role="customer"
        onDownload={() => {
          if (!receiptBlob) return;
          const link      = document.createElement("a");
          link.href       = URL.createObjectURL(receiptBlob);
          link.download   = "receipt.pdf";
          link.click();
        }}
      />
    </div>
  );
};

export default CustomerCompletedHistory;
