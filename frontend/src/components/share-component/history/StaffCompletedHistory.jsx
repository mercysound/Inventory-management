import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import SharedOrderTable from "./SharedOrderTable";
import axiosInstance from "../../../utils/axiosInstance";
import ReceiptModal from "../receipt/ReceiptModal";

// ── Helper: build invoice URL with auth token for iframe ────────────────────
const buildInvoiceUrl = (params) => {
  const token   = localStorage.getItem("pos-token") || "";
  const baseUrl = axiosInstance.defaults.baseURL || "/api";
  const qs      = new URLSearchParams({ ...params, token }).toString();
  return `${baseUrl}/orders/invoice?${qs}`;
};

const StaffCompletedHistory = () => {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Receipt modal state ──────────────────────────────────────────────────
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptUrl, setReceiptUrl]             = useState("");

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

  // ── View receipt ─────────────────────────────────────────────────────────
  const handleViewReceipt = (orderId, order) => {
    const url = buildInvoiceUrl({
      orderId,
      mode:          "final",
      customerName:  order.buyerName || "Customer",
      paymentMethod: order.paymentMethod || "",
      orderSource:   order.userOrdering?.role || "staff",
      // historyReceipt intentionally omitted for staff — matches original code
    });
    setReceiptUrl(url);
    setShowReceiptModal(true);
  };

  const handleCloseReceipt = () => {
    setShowReceiptModal(false);
    setReceiptUrl("");
  };

  useEffect(() => { fetchOrders(); }, []);

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

      {/* Receipt Modal — iframe loads HTML receipt page directly */}
      <ReceiptModal
        open={showReceiptModal}
        onClose={handleCloseReceipt}
        previewUrl={receiptUrl}
        mode="final"
        role="staff"
      />
    </div>
  );
};

export default StaffCompletedHistory;