import React, { useEffect, useState } from "react";
import axiosInstance from "../../../utils/axiosInstance";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import { X, PackageCheck, Truck, Clock, RefreshCw } from "lucide-react";
import SkeletonLoader from "../../common/SkeletonLoader";

// ─── Status badge ──────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const s = status?.toLowerCase() || "pending";
  const config = {
    pending: {
      bg: "bg-amber-50",
      text: "text-amber-700",
      border: "border-amber-200",
      icon: <Clock size={11} />,
    },
    "in transit": {
      bg: "bg-blue-50",
      text: "text-blue-700",
      border: "border-blue-200",
      icon: <Truck size={11} />,
    },
    processing: {
      bg: "bg-purple-50",
      text: "text-purple-700",
      border: "border-purple-200",
      icon: <RefreshCw size={11} />,
    },
    completed: {
      bg: "bg-green-50",
      text: "text-green-700",
      border: "border-green-200",
      icon: <PackageCheck size={11} />,
    },
  };
  const c = config[s] || config.pending;
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap px-2.5 py-1 rounded-full text-xs font-semibold border ${c.bg} ${c.text} ${c.border}`}
    >
      {c.icon}
      {status}
    </span>
  );
};

// ─── Order row card (mobile-friendly) ──────────────────────────────────────
const OrderCard = ({ order, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.04 }}
    className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3"
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
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
      </div>
    </div>
          {/* <hr className="border-gray-50" /> */}
    {/* Products */}
    {order.productList?.length > 0 && (
      <div className="border-t border-gray-50 pt-3 space-y-1.5">
        {order.productList.map((item, idx) => (
          <div key={idx} className="flex items-start justify-between gap-2">
            <div>
              <span className="text-sm font-medium text-gray-700">
                {item?.productId?.name || "Unnamed"}
              </span>
              {item?.productId?.categoryId?.name && (
                <span className="ml-1.5 text-xs text-gray-400">
                  ({item.productId.categoryId.name})
                </span>
              )}
              {item?.productId?.description && (
                <p className="text-xs text-gray-400 italic mt-0.5 line-clamp-1">
                  {item.productId.description}
                </p>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              <span className="text-xs text-gray-500">
                ×{item?.quantity || 1}
              </span>
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
                Order_ID: ...{String(order._id).slice(-8).toUpperCase()}
              </span>
      <span className="text-xs text-gray-500">{order.paymentMethod}</span>
      <span className="font-bold text-green-700 text-base">
        ₦{order.totalPrice?.toLocaleString() || 0}
      </span>
    </div>
  </motion.div>
);

// ─── Main modal ─────────────────────────────────────────────────────────────
/**
 * Props:
 *  - isOpen         {boolean}
 *  - onClose        {fn}
 *  - pendingOrders  {array}  passed from parent (avoids redundant fetch)
 *                            If you want the modal to show ALL placed orders,
 *                            pass the full `history` array instead.
 */
const PendingOrdersModal = ({ isOpen, onClose, pendingOrders = [] }) => {
  // If pendingOrders is provided from parent we use it directly.
  // Optionally re-fetch if needed (e.g. parent didn't pass updated data).
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // Use prop data if available, otherwise fetch
    if (pendingOrders.length > 0) {
      setOrders(pendingOrders);
      return;
    }

    const fetchAll = async () => {
      try {
        setLoading(true);
        const res = await axiosInstance.get("/placed-orders");
        if (res.data.success) {
          setOrders(res.data.orders || []);
        }
      } catch {
        toast.error("Failed to fetch orders");
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [isOpen, pendingOrders]);

  // Keep in sync when parent prop updates
  useEffect(() => {
    if (pendingOrders.length > 0) setOrders(pendingOrders);
  }, [pendingOrders]);

  const grandTotal = orders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);

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
            className="relative w-full max-w-2xl max-h-[90vh] flex flex-col
              bg-white rounded-2xl shadow-2xl overflow-hidden"
            initial={{ y: 32, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 32, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Modal header ──────────────────────────────────────── */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Clock size={16} className="text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Pending Orders</h3>
                  <p className="text-xs text-gray-400">
                    {orders.length} order{orders.length !== 1 ? "s" : ""} awaiting fulfilment
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full
                  text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* ── Modal body ─────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {loading ? (
                <SkeletonLoader rows={4} />
              ) : orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                  <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                    <PackageCheck size={24} className="text-gray-300" />
                  </div>
                  <p className="text-gray-500 font-medium">No pending orders</p>
                  <p className="text-sm text-gray-400">
                    All your orders have been fulfilled or no orders have been placed yet.
                  </p>
                </div>
              ) : (
                orders.map((order, i) => (
                  <OrderCard key={order._id} order={order} index={i} />
                ))
              )}
              
            </div>

            {/* ── Modal footer / grand total ─────────────────────────── */}
            {orders.length > 0 && (
              <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 bg-gray-50 flex-shrink-0">
                <span className="text-sm text-gray-500 font-medium">
                  Grand Total ({orders.length} orders)
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