import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import SharedOrderTable from "./SharedOrderTable";
import axiosInstance from "../../../utils/axiosInstance";
import ReceiptModal from "../receipt/ReceiptModal";

const AdminCompletedHistory = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // receipt modal
  const [invoiceParams, setInvoiceParams] = useState(null);
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
    if (!window.confirm("Clear all completed orders?")) return;
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
      const handleViewReceipt = (orderId, order) => {
    const params = {
      orderId,
      mode: "final",
      customerName: order.buyerName,
      paymentMethod: order.paymentMethod,
      orderSource: order.userOrdering.role,
      historyReceipt: true,
    };

    setInvoiceParams(params);
    setShowReceiptPrompt(true);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  if (loading) return <p className="text-center py-10">Loading...</p>;

  return (
    <div className="p-5">
      <h2 className="text-2xl font-bold mb-3">📜 Admin Completed Orders</h2>

      <SharedOrderTable
        orders={orders}
        role="admin"
        onDelete={deleteOrder}
        onClearAll={clearAllOrders}
        onViewReceipt={handleViewReceipt} // ✅ add receipt button
      />

      <ReceiptModal
        open={showReceiptPrompt}
        onClose={() => setShowReceiptPrompt(false)}
        invoiceParams={invoiceParams}
        mode="final"
        role="admin"
      />
    </div>
  );
};

export default AdminCompletedHistory;
