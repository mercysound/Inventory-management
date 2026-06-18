import React, { useState, useCallback, useMemo } from "react";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import axiosInstance from "../../../utils/axiosInstance";
import {
  FaSearch, FaBoxOpen, FaChevronDown, FaChevronUp,
} from "react-icons/fa";
import { Loader2 } from "lucide-react";

// ── Status badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const map = {
    pending:    "bg-yellow-100 text-yellow-800",
    processing: "bg-blue-100 text-blue-800",
    delivered:  "bg-green-100 text-green-800",
    cancelled:  "bg-red-100 text-red-700",
  };
  const cls = map[status?.toLowerCase()] || "bg-gray-100 text-gray-700";
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {status?.toUpperCase() || "—"}
    </span>
  );
};

// ── Order detail card ────────────────────────────────────────────────────────
const OrderCard = ({ order, onStatusChange, updating }) => {
  const [expanded, setExpanded] = useState(false);

  const handleChange = async (newStatus) => {
    if (newStatus === order.deliveryStatus) return;
    if (newStatus === "cancelled") {
      if (!window.confirm(
        "⚠️ Cancel this order?\n\n" +
        "This will restore product stock and send a cancellation email to the buyer. " +
        "The buyer stays in their Pending modal until refund is marked."
      )) return;
    }
    if (newStatus === "delivered") {
      if (!window.confirm("Confirm this order has been delivered? It will move to history.")) return;
    }
    await onStatusChange(order._id, newStatus);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden"
    >
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-gray-100">
        <div className="space-y-0.5">
          <p className="text-xs text-gray-400 font-mono">
            Order ID: <span className="text-gray-600">{String(order._id)}</span>
          </p>
          <p className="font-semibold text-gray-800 text-sm">
            {order.buyerName || "Unknown Buyer"}
            <span className="ml-2 text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
              {order.userOrdering?.role || "customer"}
            </span>
          </p>
          <p className="text-xs text-gray-500">
            {new Date(order.createdAt).toLocaleString()} · {order.paymentMethod}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={order.deliveryStatus} />
          <span className="font-bold text-green-700 text-sm">
            ₦{order.totalPrice?.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Actions + expand */}
      <div className="flex flex-wrap items-center gap-3 p-4">
        {/* Status selector — disabled once finalized */}
        {(order.deliveryStatus === "pending" || order.deliveryStatus === "processing") ? (
          <div className="relative">
            {updating && (
              <Loader2 size={14} className="absolute -top-1 -right-1 animate-spin text-indigo-500" />
            )}
            <select
              value={order.deliveryStatus}
              onChange={(e) => handleChange(e.target.value)}
              disabled={updating}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white disabled:opacity-60"
            >
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">❌ Cancel Order</option>
            </select>
          </div>
        ) : (
          <span className="text-xs text-gray-400 italic">Status is finalised</span>
        )}

        <button
          onClick={() => setExpanded((p) => !p)}
          className="ml-auto flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 transition"
        >
          {expanded ? <FaChevronUp /> : <FaChevronDown />}
          {expanded ? "Hide" : "View"} {order.productList?.length || 0} item(s)
        </button>
      </div>

      {/* Product list */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <ul className="px-4 pb-4 space-y-2">
              {order.productList?.map((item, idx) => (
                <li key={idx} className="flex items-start gap-3 text-sm bg-indigo-50 rounded-lg p-3">
                  <span className="bg-indigo-100 text-indigo-800 text-xs px-2 py-0.5 rounded-full font-semibold shrink-0">
                    ×{item.quantity}
                  </span>
                  <div>
                    <p className="font-semibold text-gray-800">
                      {item.productName || item.productId?.name || "Unknown Product"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {item.categoryName || item.productId?.categoryId?.name || ""}
                    </p>
                    <p className="text-xs text-green-700 font-medium mt-0.5">
                      ₦{item.price?.toLocaleString()} each · ₦{item.totalPrice?.toLocaleString()} total
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ── Main page ────────────────────────────────────────────────────────────────
const StaffPlacedOrders = () => {
  const [searchInput,  setSearchInput]  = useState("");
  const [searchedId,   setSearchedId]   = useState("");
  const [order,        setOrder]        = useState(null);
  const [allOrders,    setAllOrders]    = useState(null); // null = not loaded yet
  const [loading,      setLoading]      = useState(false);
  const [loadingAll,   setLoadingAll]   = useState(false);
  const [updatingId,   setUpdatingId]   = useState(null);
  const [mode,         setMode]         = useState("search"); // "search" | "all"
  const [filterStatus, setFilterStatus] = useState("");

  // ── Search single order by ID ─────────────────────────────────────────────
  const handleSearch = useCallback(async (e) => {
    e?.preventDefault();
    const trimmed = searchInput.trim();
    if (!trimmed) { toast.error("Enter an Order ID to search"); return; }
    setLoading(true);
    setOrder(null);
    setSearchedId(trimmed);
    try {
      const res = await axiosInstance.get(`/placed-orders/${trimmed}`);
      if (res.data.success) {
        setOrder(res.data.order);
      } else {
        toast.error(res.data.message || "Order not found");
      }
    } catch (err) {
      const msg = err?.response?.data?.message || "Order not found";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [searchInput]);

  // ── Load all placed orders ────────────────────────────────────────────────
  const handleLoadAll = useCallback(async () => {
    setLoadingAll(true);
    setMode("all");
    try {
      const res = await axiosInstance.get("/placed-orders");
      if (res.data.success) setAllOrders(res.data.orders || []);
    } catch {
      toast.error("Failed to load orders");
    } finally {
      setLoadingAll(false);
    }
  }, []);

  // ── Update status ─────────────────────────────────────────────────────────
  const handleStatusChange = useCallback(async (orderId, newStatus) => {
    setUpdatingId(orderId);
    try {
      const res = await axiosInstance.put(`/placed-orders/${orderId}/status`, {
        deliveryStatus: newStatus,
      });
      if (res.data.success) {
        toast.success(res.data.message || "Status updated!");
        const isFinalized = ["delivered", "cancelled"].includes(newStatus);
        if (mode === "search") {
          if (isFinalized) setOrder(null);
          else setOrder((prev) => prev ? { ...prev, deliveryStatus: newStatus } : prev);
        } else {
          if (isFinalized) setAllOrders((prev) => prev?.filter((o) => o._id !== orderId));
          else setAllOrders((prev) => prev?.map((o) =>
            o._id === orderId ? { ...o, deliveryStatus: newStatus } : o
          ));
        }
      } else {
        toast.error(res.data.message || "Failed to update status");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Error updating status");
    } finally {
      setUpdatingId(null);
    }
  }, [mode]);

  // ── Filtered all-orders list ──────────────────────────────────────────────
  const filteredOrders = useMemo(() => {
    if (!allOrders) return [];
    if (!filterStatus) return allOrders;
    return allOrders.filter((o) => o.deliveryStatus === filterStatus);
  }, [allOrders, filterStatus]);

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-6">

      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">📦 Placed Orders</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Search an order by its ID, or load all active placed orders to manage them.
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode("search")}
          className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${
            mode === "search"
              ? "bg-indigo-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          🔍 Search by ID
        </button>
        <button
          onClick={allOrders === null ? handleLoadAll : () => setMode("all")}
          className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${
            mode === "all"
              ? "bg-indigo-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          📋 All Active Orders
        </button>
      </div>

      {/* ── SEARCH MODE ── */}
      {mode === "search" && (
        <div className="space-y-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Paste the full Order ID here…"
              className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition"
            >
              {loading
                ? <Loader2 size={15} className="animate-spin" />
                : <FaSearch size={13} />}
              Search
            </button>
          </form>

          {loading && (
            <div className="text-center py-8 text-gray-400">Searching…</div>
          )}

          {!loading && searchedId && !order && (
            <div className="text-center py-8">
              <FaBoxOpen size={36} className="mx-auto text-gray-300 mb-2" />
              <p className="text-gray-500 text-sm">
                No active placed order found for ID: <span className="font-mono">{searchedId}</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">
                The order may have already been delivered, cancelled, or the ID is incorrect.
              </p>
            </div>
          )}

          {order && (
            <OrderCard
              order={order}
              onStatusChange={handleStatusChange}
              updating={updatingId === order._id}
            />
          )}
        </div>
      )}

      {/* ── ALL ORDERS MODE ── */}
      {mode === "all" && (
        <div className="space-y-4">
          {loadingAll && (
            <div className="text-center py-10 text-gray-400">
              <Loader2 size={28} className="animate-spin mx-auto mb-2" />
              Loading all orders…
            </div>
          )}

          {!loadingAll && allOrders !== null && (
            <>
              {/* Filter + refresh */}
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                </select>
                <button
                  onClick={handleLoadAll}
                  className="text-xs text-indigo-600 underline hover:text-indigo-800"
                >
                  Refresh
                </button>
                <span className="text-xs text-gray-400 ml-auto">
                  {filteredOrders.length} order(s)
                </span>
              </div>

              {filteredOrders.length === 0 ? (
                <div className="text-center py-10">
                  <FaBoxOpen size={36} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-500 text-sm">No active placed orders found.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredOrders.map((o) => (
                    <OrderCard
                      key={o._id}
                      order={o}
                      onStatusChange={handleStatusChange}
                      updating={updatingId === o._id}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default StaffPlacedOrders;
