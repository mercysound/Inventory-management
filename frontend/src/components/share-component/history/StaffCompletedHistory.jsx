import React, { useEffect, useState, useCallback } from "react";
import { toast } from "react-toastify";
import SharedOrderTable from "./SharedOrderTable";
import axiosInstance from "../../../utils/axiosInstance";
import ReceiptModal from "../receipt/ReceiptModal";

// ── Delegation action info banner ─────────────────────────────────────────────
// Shown above the table when the current staff has delegated-action history
const DelegationInfoBanner = ({ delegatedCount }) => {
  if (!delegatedCount) return null;
  return (
    <div className="mb-4 flex items-start gap-3 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
      <span className="text-xl">🛡️</span>
      <div className="text-xs text-indigo-800 leading-relaxed">
        <p className="font-semibold mb-0.5">Delegated Actions Included</p>
        <p>
          {delegatedCount} order status change{delegatedCount !== 1 ? "s" : ""} you made
          as a delegated staff member {delegatedCount !== 1 ? "are" : "is"} shown in this history
          with a <span className="font-semibold">🛡️ Delegated</span> badge.
        </p>
      </div>
    </div>
  );
};

const StaffCompletedHistory = () => {
  const [orders,           setOrders]           = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [invoiceParams,    setInvoiceParams]    = useState(null);
  const [showReceiptPrompt,setShowReceiptPrompt]= useState(false);
  const [refundingId,      setRefundingId]      = useState(null);

  // Count how many delegated-action entries are in the history
  const delegatedCount = orders.filter((o) => o.isDelegatedAction === true).length;

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/completed-history");
      if (res.data.success) setOrders(res.data.orders || []);
    } catch {
      toast.error("Failed to fetch staff orders");
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteOrder = useCallback(async (id) => {
    if (!window.confirm("Remove this order from your view?")) return;
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
    if (!window.confirm("Clear all your completed orders from view?")) return;
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
        orderSource:    "staff",
      });
      setShowReceiptPrompt(true);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load receipt");
    }
  }, []);

  // ── Refund — only for delegated-action orders this staff member cancelled ──
  const handleMarkRefund = useCallback(async (orderId) => {
    const confirmed = window.confirm(
      "⚠️ Mark refund as completed?\n\n" +
      "This is irreversible. The order will be excluded from revenue and the buyer will see it as REFUNDED."
    );
    if (!confirmed) return;
    setRefundingId(orderId);
    try {
      const res = await axiosInstance.post(`/completed-history/${orderId}/refund`);
      if (res.data.success) {
        toast.success("Refund marked. The order is now excluded from revenue.");
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
      toast.error(err?.response?.data?.message || "Error marking refund");
    } finally {
      setRefundingId(null);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  if (loading) return <p className="text-center py-10">Loading...</p>;

  return (
    <div className="p-5">
      <h2 className="text-2xl font-bold mb-3">📜 Staff Completed Orders</h2>

      {/* Delegation info banner — only shows when delegated action history exists */}
      <DelegationInfoBanner delegatedCount={delegatedCount} />

      <SharedOrderTable
        orders={orders}
        role="staff"
        onDelete={deleteOrder}
        onDeleteMany={deleteOrderDirect}
        onClearAll={clearAllOrders}
        onViewReceipt={handleViewReceipt}
        onMarkRefund={handleMarkRefund}
        refundingId={refundingId}
      />

      <ReceiptModal
        open={showReceiptPrompt}
        onClose={() => {
          setShowReceiptPrompt(false);
          setInvoiceParams(null);
        }}
        invoiceParams={invoiceParams}
        mode="final"
        role="staff"
      />
    </div>
  );
};

export default StaffCompletedHistory;
