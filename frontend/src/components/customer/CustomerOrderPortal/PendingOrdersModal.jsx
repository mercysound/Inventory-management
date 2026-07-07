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
    pending:      { bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200",  icon: <Clock size={11} /> },
    "in transit": { bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-200",   icon: <Truck size={11} /> },
    processing:   { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", icon: <RefreshCw size={11} /> },
    completed:    { bg: "bg-green-50",  text: "text-green-700",  border: "border-green-200",  icon: <PackageCheck size={11} /> },
    cancelled:    { bg: "bg-red-50",    text: "text-red-700",    border: "border-red-200",    icon: <AlertTriangle size={11} /> },
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
            hour: "2-digit", minute: "2-digit",
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
            Cancelled on:{" "}
            {new Date(order.cancelledAt).toLocaleDateString("en-NG", {
              day: "numeric", month: "long", year: "numeric",
              hour: "2-digit", minute: "2-digit",
            })}
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
//
// Data responsibilities:
//   activeOrders   — passed from parent (CustomerOrderPortal), kept fresh by
//                    the parent's SSE connection. Covers pending + processing.
//   cancelledOrders — fetched here once on open, then silently re-fetched
//                    whenever `refreshKey` changes (parent increments it on
//                    every SSE event, including refund notifications).
//
// This design avoids the flicker loop that caused skeleton/content toggling.
// ─────────────────────────────────────────────────────────────────────────────
const PendingOrdersModal = ({
  isOpen,
  onClose,
  activeOrders = [],
  refreshKey   = 0,
}) => {
  const [cancelledOrders, setCancelledOrders] = useState([]);
  const [loading,         setLoading]         = useState(false);

  // Guards against React StrictMode double-invoke on mount
  const hasFetchedRef  = useRef(false);
  // Tracks the last refreshKey we acted on — must be declared before effects
  const prevRefreshKey = useRef(refreshKey);

  // ── Fetch cancelled-pending list ──────────────────────────────────────────
  const fetchCancelled = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await axiosInstance.get("/completed-history/cancelled-pending");
      if (res.data.success) {
        setCancelledOrders(res.data.orders || []);
      }
    } catch {
      if (!silent) toast.error("Failed to load cancelled orders");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // ── On open: fetch once; on close: reset guards ───────────────────────────
  useEffect(() => {
    if (!isOpen) {
      // Reset so next open triggers a fresh fetch
      hasFetchedRef.current  = false;
      // Sync baseline so a refreshKey that changed while closed doesn't
      // trigger a redundant silent fetch the moment the modal re-opens
      prevRefreshKey.current = refreshKey;
      return;
    }
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchCancelled(false);
    }
  }, [isOpen]); // intentionally only [isOpen] — fetchCancelled is stable, refreshKey handled below

  // ── Silent re-fetch when parent signals an update ─────────────────────────
  // refreshKey increments each time the parent SSE fires (status change OR refund).
  // We compare against prevRefreshKey to act only on new increments.
  useEffect(() => {
    if (!isOpen) return;
    if (refreshKey !== prevRefreshKey.current) {
      prevRefreshKey.current = refreshKey;
      fetchCancelled(true); // silent — no spinner, no loading flash
    }
  }, [isOpen, refreshKey, fetchCancelled]);

  const grandTotal      = activeOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
  const totalOrderCount = activeOrders.length + cancelledOrders.length;

  // Lock main scroll container while modal is open
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    const scroller = document.getElementById("main-scroll");
    if (scroller) scroller.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      const scroller = document.getElementById("main-scroll");
      if (scroller) scroller.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center overflow-y-auto"
          style={{ backgroundColor: "rgba(0,0,0,0.45)", touchAction: "none", padding: "16px", zIndex: 9999 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative w-full max-w-2xl flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden my-auto"
            style={{ maxHeight: "90vh" }}
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
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
              >
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
                  {/* Active pending / processing — from parent prop, no fetch here */}
                  {activeOrders.map((order, i) => (
                    <OrderCard key={order._id} order={order} index={i} isCancelled={false} />
                  ))}

                  {/* Cancelled-but-not-refunded — auto-removed when refund is marked */}
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
                          index={activeOrders.length + i}
                          isCancelled={true}
                        />
                      ))}
                    </>
                  )}
                </>
              )}
            </div>

            {/* Footer / grand total — only active orders count */}
            {activeOrders.length > 0 && (
              <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 bg-gray-50 flex-shrink-0">
                <span className="text-sm text-gray-500 font-medium">
                  Grand Total ({activeOrders.length} active order{activeOrders.length !== 1 ? "s" : ""})
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
