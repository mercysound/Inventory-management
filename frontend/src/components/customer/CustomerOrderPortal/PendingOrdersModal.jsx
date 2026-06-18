import React, { useEffect, useState, useCallback, useRef } from "react";
import axiosInstance from "../../../utils/axiosInstance";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import { X, PackageCheck, Truck, Clock, RefreshCw, AlertTriangle } from "lucide-react";
import SkeletonLoader from "../../common/SkeletonLoader";

// ─── Status badge ──────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const s = status?.toLowerCase() || "pending";
  const config = {
    pending:    { bg: "bg-amber-50",   text: "text-amber-700",  border: "border-amber-200",  icon: <Clock size={11} /> },
    "in transit":{ bg:"bg-blue-50",   text: "text-blue-700",   border: "border-blue-200",   icon: <Truck size={11} /> },
    processing: { bg: "bg-purple-50",  text: "text-purple-700", border: "border-purple-200", icon: <RefreshCw size={11} /> },
    completed:  { bg: "bg-green-50",   text: "text-green-700",  border: "border-green-200",  icon: <PackageCheck size={11} /> },
    // ✅ Cancelled status shown in pending modal until refund is made
    cancelled:  { bg: "bg-red-50",     text: "text-red-700",    border: "border-red-200",    icon: <AlertTriangle size={11} /> },
  };
  const c = config[s] || config.pending;
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap px-2.5 py-1 rounded-full text-xs font-semibold border ${c.bg} ${c.text} ${c.border}`}>
      {c.icon}
      {status}
    </span>
  );
};

// ─── Order row card ─────────────────────────────────────────────────────────────
const OrderCard = ({ order, index, isCancelled }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.04 }}
    className={`rounded-xl border shadow-sm p-4 space-y-3 ${
      isCancelled ? "bg-red-50 border-red-200" : "bg-white border-gray-100"
    }`}
  >
    {/* Header row */}
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
          Order #{index + 1}
        </p>
        <p className="font-semibold text-gray-800 mt-0.5">
          {order.userOrdering?.name || order.buyerName || "Unknown"}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <StatusBadge status={order.deliveryStatus} />
        <span className="text-xs text-gray-400">
          {new Date(order.createdAt).toLocaleDateString("en-NG", {
            day: "numeric", month: "short", year: "numeric",
          })}
        </span>
      </div>
    </div>

    {/* Cancelled note */}
    {isCancelled && (
      <div className="bg-red-100 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
        <strong>⚠️ Order Cancelled</strong> — This order was cancelled by the admin.
        A refund is being processed to your payment method.
        Please contact the store if you have not received it.
        {order.cancelledAt && (
          <span className="block mt-0.5 text-red-500">
            Cancelled on: {new Date(order.cancelledAt).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}
          </span>
        )}
      </div>
    )}

    {/* Products */}
    {order.productList?.length > 0 && (
      <div className="border-t border-gray-50 pt-3 space-y-1.5">
        {order.productList.map((item, idx) => (
          <div key={idx} className="flex items-start justify-between gap-2">
            <div>
              <span className="text-sm font-medium text-gray-700">
                {item?.productName || item?.productId?.name || "Unknown Product"}
              </span>
              {(item?.categoryName || item?.productId?.categoryId?.name) && (
                <span className="ml-1.5 text-xs text-gray-400">
                  ({item?.categoryName || item?.productId?.categoryId?.name})
                </span>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              <span className="text-xs text-gray-500">×{item?.quantity || 1}</span>
              <p className="text-xs font-semibold text-gray-700">
                ₦{((item?.price || 0) * (item?.quantity || 1)).toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    )}

    {/* Footer row */}
    <div className="flex items-center justify-between border-t border-gray-50 pt-3">
      <span className="text-xs text-gray-500">
        ID: ...{String(order._id).slice(-8).toUpperCase()}
      </span>
      <span className="text-xs text-gray-500">{order.paymentMethod}</span>
      <span className="font-bold text-green-700 text-base">
        ₦{order.totalPrice?.toLocaleString() || 0}
      </span>
    </div>
  </motion.div>
);

// ─── Main modal ────────────────────────────────────────────────────────────────
const PendingOrdersModal = ({ isOpen, onClose, pendingOrders = [], onRefresh }) => {
  const [orders,          setOrders]          = useState([]);
  const [cancelledOrders, setCancelledOrders] = useState([]);
  const [loading,         setLoading]         = useState(false);
  const esRef = useRef(null);

  // ── Fetch both active-pending and cancelled-pending ────────────────────────
  const fetchAll = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [placedRes, cancelledRes] = await Promise.all([
        axiosInstance.get("/placed-orders"),
        axiosInstance.get("/completed-history/cancelled-pending"),
      ]);

      if (placedRes.data.success) {
        const history = placedRes.data.orders || [];
        setOrders(
          history.filter((o) =>
            ["pending", "processing"].includes(o.deliveryStatus?.toLowerCase())
          )
        );
      }
      if (cancelledRes.data.success) {
        setCancelledOrders(cancelledRes.data.orders || []);
      }
    } catch {
      if (!silent) toast.error("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Open / close lifecycle ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) {
      // Close SSE when modal closes
      if (esRef.current) { esRef.current.close(); esRef.current = null; }
      return;
    }

    // Initial fetch when modal opens
    fetchAll();

    // ── Open SSE stream for real-time updates ──────────────────────────────
    const token = localStorage.getItem("pos-token");
    if (token) {
      const base = import.meta.env.VITE_API_URL || "/api";
      const url  = `${base}/placed-orders/stream?token=${encodeURIComponent(token)}`;
      const es   = new EventSource(url);
      esRef.current = es;

      es.addEventListener("placedOrderUpdated", () => {
        // Re-fetch silently — no spinner, instant update
        fetchAll(true);
        // Also tell the parent CartPage to refresh its badge count
        onRefresh?.();
      });

      es.addEventListener("error", () => {
        // SSE error — close and let it reconnect on next modal open
        es.close();
        esRef.current = null;
      });
    }

    return () => {
      if (esRef.current) { esRef.current.close(); esRef.current = null; }
    };
  }, [isOpen, fetchAll, onRefresh]);

  // ── Keep local orders in sync when parent passes fresh pendingOrders ───────
  useEffect(() => {
    if (pendingOrders.length > 0) setOrders(pendingOrders);
  }, [pendingOrders]);

  const grandTotal      = orders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
  const totalOrderCount = orders.length + cancelledOrders.length;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden"
            initial={{ y: 32, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 32, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Clock size={16} className="text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Pending Orders</h3>
                  <p className="text-xs text-gray-400">
                    {totalOrderCount} order{totalOrderCount !== 1 ? "s" : ""} in progress
                    {cancelledOrders.length > 0 && (
                      <span className="ml-1 text-red-500 font-medium">
                        · {cancelledOrders.length} cancelled (refund pending)
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <button onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition">
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {loading ? (
                <SkeletonLoader rows={4} />
              ) : totalOrderCount === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                  <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                    <PackageCheck size={24} className="text-gray-300" />
                  </div>
                  <p className="text-gray-500 font-medium">No pending orders</p>
                  <p className="text-sm text-gray-400">
                    All your orders have been fulfilled or you have not placed any orders yet.
                  </p>
                </div>
              ) : (
                <>
                  {/* Active pending/processing orders */}
                  {orders.map((order, i) => (
                    <OrderCard key={order._id} order={order} index={i} isCancelled={false} />
                  ))}

                  {/* ✅ Cancelled-but-not-refunded orders */}
                  {cancelledOrders.length > 0 && (
                    <>
                      <div className="flex items-center gap-2 pt-2">
                        <div className="flex-1 h-px bg-red-200" />
                        <span className="text-xs text-red-500 font-semibold px-2">
                          CANCELLED — AWAITING REFUND
                        </span>
                        <div className="flex-1 h-px bg-red-200" />
                      </div>
                      {cancelledOrders.map((order, i) => (
                        <OrderCard
                          key={order._id}
                          order={order}
                          index={orders.length + i}
                          isCancelled={true}
                        />
                      ))}
                    </>
                  )}
                </>
              )}
            </div>

            {/* Footer / grand total */}
            {orders.length > 0 && (
              <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 bg-gray-50 flex-shrink-0">
                <span className="text-sm text-gray-500 font-medium">
                  Grand Total ({orders.length} active order{orders.length !== 1 ? "s" : ""})
                </span>
                <span className="text-lg font-bold text-gray-900">
                  ₦{grandTotal.toLocaleString()}
                </span>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PendingOrdersModal;
