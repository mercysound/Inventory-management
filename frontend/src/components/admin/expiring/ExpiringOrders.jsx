import React, { useEffect, useState, useCallback } from "react";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../../utils/axiosInstance";
import {
  Clock, AlertTriangle, Package, ChevronDown, ChevronUp,
  ExternalLink, RefreshCw,
} from "lucide-react";

const HoursBadge = ({ hours, expiryHours }) => {
  const overBy = hours - expiryHours;
  const color =
    overBy > 72 ? "bg-red-100 text-red-700 border-red-200" :
    overBy > 24 ? "bg-orange-100 text-orange-700 border-orange-200" :
                  "bg-amber-100 text-amber-700 border-amber-200";
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${color}`}>
      <Clock size={10} />
      {hours}h elapsed
    </span>
  );
};

const ExpiringOrders = () => {
  const navigate = useNavigate();
  const [orders,   setOrders]   = useState([]);
  const [settings, setSettings] = useState({ orderExpiryHours: 48 });
  const [loading,  setLoading]  = useState(true);
  const [expanded, setExpanded] = useState({});
  const [refreshing,  setRefreshing]  = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const EXPIRY_PAGE_SIZE = 10;

  const fetchData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      const res = await axiosInstance.get("/expiring-orders");
      if (res.data.success) {
        setOrders(res.data.orders || []);
        setSettings(res.data.settings || { orderExpiryHours: 48 });
      }
    } catch {
      toast.error("Failed to fetch expiring orders");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh every 5 minutes while admin is on this page
  useEffect(() => {
    const interval = setInterval(() => fetchData(true), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const toggleExpand = (id) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  // Navigate to Placed Orders page, passing the specific order ID so it gets highlighted
  const handleViewInPlacedOrders = (orderId) => {
    navigate("/admin-dashboard/placed-orders", { state: { highlightOrderId: orderId } });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-5">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Clock size={22} className="text-amber-500" />
            Expiring Orders
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Orders that have not been picked up within{" "}
            <strong>{settings.orderExpiryHours} hours</strong> of being placed.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            onClick={() => navigate("/admin-dashboard/settings")}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
          >
            ⚙️ Settings
          </button>
        </div>
      </div>

      {/* Settings summary pill */}
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="bg-amber-50 border border-amber-200 text-amber-700 rounded-full px-3 py-1 font-medium">
          ⏰ Threshold: {settings.orderExpiryHours}h
        </span>
        <span className="bg-blue-50 border border-blue-200 text-blue-700 rounded-full px-3 py-1 font-medium">
          📧 Mode: {settings.reminderMode === "once" ? "One-time email" : `Repeat every ${settings.reminderIntervalHours}h`}
        </span>
        {settings.adminNotificationEmail && (
          <span className="bg-gray-50 border border-gray-200 text-gray-600 rounded-full px-3 py-1">
            ✉️ {settings.adminNotificationEmail}
          </span>
        )}
      </div>

      {/* Empty state */}
      {orders.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 gap-3 text-center bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
            <Package size={28} className="text-green-400" />
          </div>
          <p className="text-lg font-semibold text-gray-700">No expiring orders 🎉</p>
          <p className="text-sm text-gray-400 max-w-sm">
            All active orders are within the {settings.orderExpiryHours}-hour pickup window. Check back later.
          </p>
        </motion.div>
      ) : (
        <>
          {/* Count summary */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-xs text-amber-600 font-medium uppercase tracking-wide">Expiring Orders</p>
              <p className="text-3xl font-bold text-amber-700 mt-1">{orders.length}</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Value</p>
              <p className="text-xl font-bold text-gray-800 mt-1">
                ₦{orders.reduce((s, o) => s + (o.totalPrice || 0), 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hidden sm:block">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Most Overdue</p>
              <p className="text-xl font-bold text-red-600 mt-1">
                {Math.max(...orders.map((o) => o.hoursElapsed))}h
              </p>
            </div>
          </div>

          {/* Info box */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex gap-3">
            <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">
              <strong>Action required:</strong> Review each order below. If the buyer has not responded or given a valid reason,
              click <strong>"View in Placed Orders"</strong> to navigate to the order and cancel it — this will restore the stock.
            </p>
          </div>

          {/* Orders list */}
          <div>
          <div className="space-y-3">
            <AnimatePresence>
              {orders.slice((currentPage - 1) * EXPIRY_PAGE_SIZE, currentPage * EXPIRY_PAGE_SIZE).map((order, i) => (
                <motion.div
                  key={order._id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden"
                >
                  {/* Order card header */}
                  <div className="px-4 sm:px-5 py-4">
                    {/* Top row: buyer info */}
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-bold text-gray-900 text-base">
                        {order.buyerName || order.userOrdering?.name || "Unknown Buyer"}
                      </span>
                      <span className="text-xs bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-full px-2 py-0.5 font-medium">
                        {order.userOrdering?.role || "customer"}
                      </span>
                      <HoursBadge hours={order.hoursElapsed} expiryHours={settings.orderExpiryHours} />
                    </div>

                    {/* Meta info — stacks naturally on mobile */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mt-1">
                      <span>
                        Order ID:{" "}
                        <span className="font-mono font-semibold text-gray-700">
                          ...{String(order._id).slice(-8).toUpperCase()}
                        </span>
                      </span>
                      <span>
                        Placed:{" "}
                        {new Date(order.createdAt).toLocaleString("en-NG", {
                          day: "numeric", month: "short", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </span>
                      <span>Payment: {order.paymentMethod}</span>
                      <span className="font-semibold text-green-700">
                        ₦{order.totalPrice?.toLocaleString()}
                      </span>
                    </div>

                    {order.expiryEmailCount > 0 && (
                      <p className="text-xs text-amber-600 mt-1.5">
                        📧 {order.expiryEmailCount} reminder email{order.expiryEmailCount !== 1 ? "s" : ""} sent
                        {order.lastExpiryReminderSentAt && (
                          <> · Last sent: {new Date(order.lastExpiryReminderSentAt).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</>
                        )}
                      </p>
                    )}

                    {/* Action buttons — full-width row on mobile, right-aligned on desktop */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      <button
                        onClick={handleViewInPlacedOrders.bind(null, order._id)}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition shadow-sm whitespace-nowrap"
                      >
                        <ExternalLink size={12} />
                        View in Placed Orders
                      </button>
                      <button
                        onClick={() => toggleExpand(order._id)}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition"
                      >
                        {expanded[order._id] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        {expanded[order._id] ? "Hide" : "Show"} items
                      </button>
                    </div>
                  </div>

                  {/* Expanded product list */}
                  <AnimatePresence>
                    {expanded[order._id] && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 sm:px-5 pb-4 border-t border-amber-100 pt-3">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                            Order Items ({order.productList?.length || 0})
                          </p>
                          <ul className="space-y-2">
                            {order.productList?.map((item, idx) => (
                              <li key={idx} className="flex items-start gap-3 text-sm">
                                <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0">
                                  ×{item.quantity}
                                </span>
                                <div>
                                  <span className="font-semibold text-gray-800">
                                    {item.productId?.name || "Unnamed"}
                                  </span>
                                  {item.productId?.categoryId?.name && (
                                    <span className="text-gray-400 text-xs ml-1.5">
                                      ({item.productId.categoryId.name})
                                    </span>
                                  )}
                                  <p className="text-green-700 text-xs font-medium mt-0.5">
                                    ₦{item.price?.toLocaleString()} each · Total: ₦{item.totalPrice?.toLocaleString()}
                                  </p>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          </div>{/* end scroll wrapper */}

          {/* Pagination */}
          {Math.ceil(orders.length / EXPIRY_PAGE_SIZE) > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4 flex-wrap">
              <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition">
                ← Prev
              </button>
              {Array.from({ length: Math.ceil(orders.length / EXPIRY_PAGE_SIZE) }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === Math.ceil(orders.length / EXPIRY_PAGE_SIZE) || Math.abs(p - currentPage) <= 1)
                .reduce((acc, p, idx, arr) => { if (idx > 0 && p - arr[idx-1] > 1) acc.push("…"); acc.push(p); return acc; }, [])
                .map((p, idx) => p === "…"
                  ? <span key={`e${idx}`} className="text-gray-400 text-sm">…</span>
                  : <button key={p} onClick={() => setCurrentPage(p)}
                      className={`w-8 h-8 rounded-lg text-sm font-semibold border transition ${p === currentPage ? "bg-amber-500 text-white border-amber-500" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                      {p}
                    </button>
                )}
              <button onClick={() => setCurrentPage((p) => Math.min(Math.ceil(orders.length / EXPIRY_PAGE_SIZE), p + 1))} disabled={currentPage === Math.ceil(orders.length / EXPIRY_PAGE_SIZE)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition">
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ExpiringOrders;
