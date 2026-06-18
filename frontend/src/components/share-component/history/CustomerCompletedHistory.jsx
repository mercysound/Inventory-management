import React, { useEffect, useState, useCallback } from "react";
import { toast } from "react-toastify";
import SharedOrderTable from "./SharedOrderTable";
import axiosInstance from "../../../utils/axiosInstance";
import ReceiptModal from "../receipt/ReceiptModal";

const CustomerCompletedHistory = () => {
  const [orders,           setOrders]           = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [invoiceParams,    setInvoiceParams]    = useState(null);
  const [showReceiptPrompt,setShowReceiptPrompt]= useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/completed-history");
      if (res.data.success) setOrders(res.data.orders || []);
    } catch {
      toast.error("Failed to fetch your completed orders");
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteOrder = useCallback(async (id) => {
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
  }, []);

  // Bulk delete — no per-item confirm (caller already confirmed once)
  const deleteOrderDirect = useCallback(async (id) => {
    try {
      const res = await axiosInstance.delete(`/completed-history/${id}`);
      if (res.data.success) {
        setOrders((prev) => prev.filter((o) => o._id !== id));
      }
    } catch {
      // silently accumulate — errors shown by caller
    }
  }, []);

  const clearAllOrders = useCallback(async () => {
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
  }, []);

  const handleViewReceipt = useCallback(async (orderId, order) => {
    try {
      setInvoiceParams({
        orderId,
        mode:           "final",
        historyReceipt: "true",
      });
      setShowReceiptPrompt(true);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load receipt");
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

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
        onDeleteMany={deleteOrderDirect}
        onClearAll={clearAllOrders}
        onViewReceipt={handleViewReceipt}
      />

      <ReceiptModal
        open={showReceiptPrompt}
        onClose={() => {
          setShowReceiptPrompt(false);
          setInvoiceParams(null);
        }}
        invoiceParams={invoiceParams}
        mode="final"
        role="customer"
      />
    </div>
  );
};

export default CustomerCompletedHistory;
