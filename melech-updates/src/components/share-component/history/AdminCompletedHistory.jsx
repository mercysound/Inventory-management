import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import SharedOrderTable from "./SharedOrderTable";
import axiosInstance from "../../../utils/axiosInstance";
import ReceiptModal from "../receipt/ReceiptModal";

const AdminCompletedHistory = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refundingId, setRefundingId] = useState(null);

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
      toast.error("Failed to fetch completed orders");
    } finally {
      setLoading(false);
    }
  };

  // ── REFUND — one-time, irreversible ──────────────────────────────────────
  const handleMarkRefund = async (orderId) => {
    const confirmed = window.confirm(
      "⚠️ Are you sure you want to mark this refund as completed?\n\n" +
      "This action CANNOT be undone. The order will be excluded from revenue " +
      "and the buyer will see it as REFUNDED in their history."
    );
    if (!confirmed) return;

    setRefundingId(orderId);
    try {
      const res = await axiosInstance.post(`/completed-history/${orderId}/refund`);
      if (res.data.success) {
        toast.success("Refund marked successfully. This order is now excluded from revenue.");
        // Update locally — no full re-fetch needed
        setOrders((prev) =>
          prev.map((o) =>
            o._id === orderId
              ? { ...o, refundMade: true, refundMadeAt: new Date().toISOString(), deliveryStatus: "refunded" }
              : o
          )
        );
      } else {
        toast.error(res.data.message || "Failed to mark refund");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Error marking refund");
    } finally {
      setRefundingId(null);
    }
  };

  const deleteOrder = async (id) => {
    if (!window.confirm("Delete this order from admin view?")) return;
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
    if (!window.confirm("Clear all completed orders from admin view?")) return;
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
        mode: "final",
        customerName: order.buyerName,
        paymentMethod: order.paymentMethod,
        orderSource: order.userOrdering?.role || "customer",
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
      <h2 className="text-2xl font-bold mb-3">📜 Admin Completed Orders</h2>

      <SharedOrderTable
        orders={orders}
        role="admin"
        onDelete={deleteOrder}
        onClearAll={clearAllOrders}
        onViewReceipt={handleViewReceipt}
        onMarkRefund={handleMarkRefund}   // ✅ pass refund handler
        refundingId={refundingId}         // ✅ pass loading state
      />

      <ReceiptModal
        open={showReceiptPrompt}
        onClose={() => setShowReceiptPrompt(false)}
        blob={receiptBlob}
        previewUrl={receiptPreviewUrl}
        mode="final"
        role="admin"
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

export default AdminCompletedHistory;
