import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import axiosInstance from "../../../utils/axiosInstance";
import { toast } from "react-toastify";
import { Search, ShieldCheck, X, Loader2 } from "lucide-react";
// Reuse the same table component as the admin — identical features
import PlacedOrdersTable from "../../admin/purchase/PlacedOrdersTable";
import PlacedOrdersSkeleton from "../../admin/purchase/PlacedOrdersSkeleton";

// ── Debounce hook ─────────────────────────────────────────────────────────────
const useDebounce = (value, delay = 300) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
};

// ── Always-visible labeled date input ────────────────────────────────────────
const DateInput = ({ label, value, onChange }) => (
  <div className="flex flex-col gap-0.5">
    <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide pl-0.5">
      {label}
    </label>
    <input
      type="date"
      value={value}
      onChange={onChange}
      className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
    />
  </div>
);

// ── Delegation info banner ────────────────────────────────────────────────────
// Explains to staff what their delegated access means and what history trails
// are created when they act on an order.
const DelegationBanner = () => (
  <div className="mb-5 flex items-start gap-3 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-4">
    <ShieldCheck size={20} className="text-indigo-500 shrink-0 mt-0.5" />
    <div className="text-xs text-indigo-800 leading-relaxed space-y-1">
      <p className="font-semibold text-sm text-indigo-700">You have delegated order management access</p>
      <p>
        You can view and update the status of all customer orders placed on this store.
        Use the <span className="font-semibold">Quick Order Lookup</span> below to find a specific
        order by its ID, or browse the full order list underneath.
      </p>
      <p>
        Any status change you make will be recorded in{" "}
        <span className="font-semibold">your history</span>,{" "}
        <span className="font-semibold">the customer's history</span>, and{" "}
        <span className="font-semibold">the admin's history</span> — marked with a
        🛡️ <span className="font-semibold">Delegated</span> badge so everyone can see who acted.
      </p>
    </div>
  </div>
);

// ── Quick Order ID Lookup panel ───────────────────────────────────────────────
// Lets staff paste a full order ID and get that single order immediately
// without loading or scrolling through the full list.
const QuickOrderLookup = ({ onStatusUpdate, updatingId }) => {
  const [rawId,    setRawId]    = useState("");
  const [result,   setResult]   = useState(null);   // single order object | null
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [expanded, setExpanded] = useState(false);   // panel open/closed

  const handleSearch = async (e) => {
    e.preventDefault();
    const id = rawId.trim();
    if (!id) { setError("Please enter an Order ID."); return; }
    setError(""); setResult(null); setLoading(true);
    try {
      const res = await axiosInstance.get(`/placed-orders/${encodeURIComponent(id)}`);
      if (res.data.success && res.data.order) {
        setResult(res.data.order);
      } else {
        setError("Order not found. Check the ID and try again.");
      }
    } catch (err) {
      const msg = err?.response?.data?.message || "Order not found or invalid ID.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => { setRawId(""); setResult(null); setError(""); };

  // When the status is updated for the looked-up order, update local result too
  const handleLocalStatusUpdate = useCallback(async (orderId, newStatus) => {
    await onStatusUpdate(orderId, newStatus);
    // If cancelled or delivered, the order is gone — clear the lookup result
    if (newStatus === "cancelled" || newStatus === "delivered") {
      setResult(null);
      setRawId("");
    } else {
      setResult((prev) => prev ? { ...prev, deliveryStatus: newStatus } : prev);
    }
  }, [onStatusUpdate]);

  return (
    <div className="mb-6 bg-white border border-indigo-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Header — always visible, click to expand/collapse */}
      <button
        type="button"
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center justify-between px-5 py-4 bg-gradient-to-r from-indigo-50 to-blue-50 hover:from-indigo-100 hover:to-blue-100 transition"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-indigo-700">
          <Search size={16} className="text-indigo-500" />
          Quick Order ID Lookup
        </span>
        <span className="text-xs text-indigo-400 font-medium">
          {expanded ? "▲ hide" : "▼ expand"}
        </span>
      </button>

      {expanded && (
        <div className="px-5 py-4">
          <p className="text-xs text-gray-500 mb-3">
            Paste the full Order ID to instantly find and manage a specific order.
          </p>
          <form onSubmit={handleSearch} className="flex gap-2 items-center flex-wrap">
            <input
              type="text"
              value={rawId}
              onChange={(e) => { setRawId(e.target.value); setError(""); }}
              placeholder="e.g. 685a3c1f2e4b0a9d7c3f1e82"
              className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-2 text-sm
                focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono"
            />
            <button
              type="submit"
              disabled={loading || !rawId.trim()}
              className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700
                disabled:opacity-40 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              {loading ? "Searching..." : "Find Order"}
            </button>
            {(result || error || rawId) && (
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition"
              >
                <X size={13} /> Clear
              </button>
            )}
          </form>

          {error && (
            <p className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {result && (
            <div className="mt-4">
              <p className="text-xs text-green-700 font-semibold mb-2">
                ✅ Order found — manage status below:
              </p>
              <PlacedOrdersTable
                orders={[result]}
                allOrders={[result]}
                updateDeliveryStatus={handleLocalStatusUpdate}
                updatingId={updatingId}
                sortField="createdAt"
                sortDir="desc"
                onSort={() => {}}
                currentPage={1}
                pageSize={1}
                highlightId={result._id}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const StaffPlacedOrders = () => {
  const location = useLocation();
  // Support highlight from external navigation (e.g. expiring orders page)
  const highlightOrderId = location.state?.highlightOrderId || null;

  const [orders,           setOrders]           = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [updatingId,       setUpdatingId]       = useState(null);
  const [searchOrderIdRaw, setSearchOrderIdRaw] = useState(highlightOrderId || "");
  const [searchBuyerRaw,   setSearchBuyerRaw]   = useState("");
  const [filterStatus,     setFilterStatus]     = useState("");
  const [dateFrom,         setDateFrom]         = useState("");
  const [dateTo,           setDateTo]           = useState("");
  const searchOrderId = useDebounce(searchOrderIdRaw, 300);
  const searchBuyer   = useDebounce(searchBuyerRaw,   300);
  const [sortField,   setSortField]   = useState("createdAt");
  const [sortDir,     setSortDir]     = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE     = 10;
  const lastFetchedAt = useRef(null);
  const CACHE_TTL     = 30000;

  // ── Fetch all placed orders ───────────────────────────────────────────────
  const fetchOrders = async (force = false) => {
    const now = Date.now();
    if (!force && lastFetchedAt.current && now - lastFetchedAt.current < CACHE_TTL) return;
    try {
      setLoading(true);
      const res = await axiosInstance.get("/placed-orders");
      if (res.data.success) {
        // Always ensure newest orders are first
        const sortedOrders = [...(res.data.orders || [])].sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
        setOrders(sortedOrders);
        lastFetchedAt.current = now;
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  // ── SSE — new order arrives → force refresh → newest at top ─────────────
  useEffect(() => {
    const token = localStorage.getItem("pos-token");
    if (!token) return;
    const base = import.meta.env.VITE_API_URL || "/api";
    const es   = new EventSource(`${base}/placed-orders/stream?token=${encodeURIComponent(token)}`);
    es.addEventListener("placedOrderUpdated", () => {
      lastFetchedAt.current = null;
      fetchOrders(true);
    });
    es.addEventListener("error", () => {});
    return () => es.close();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Update delivery status ───────────────────────────────────────────────
  // Used by both the full list table AND the Quick Lookup table
  const updateDeliveryStatus = useCallback(async (orderId, newStatus) => {
    if (newStatus === "cancelled") {
      const confirmed = window.confirm(
        "⚠️ Cancel this order?\n\n" +
        "This will:\n• Restore the product stock\n" +
        "• Move the order to history with 'cancelled' status\n" +
        "• Send a cancellation email to the buyer\n\n" +
        "This action will appear in your history, the customer's history, and the admin's history " +
        "with a 🛡️ Delegated badge."
      );
      if (!confirmed) return;
    }
    if (newStatus === "delivered") {
      if (!window.confirm(
        "Confirm this order has been delivered?\n\n" +
        "It will be moved to history. This action will appear in your history, " +
        "the customer's history, and the admin's history with a 🛡️ Delegated badge."
      )) return;
    }

    const previousOrders = orders;
    if (newStatus === "cancelled" || newStatus === "delivered") {
      setOrders((prev) => prev.filter((o) => o._id !== orderId));
    } else {
      setOrders((prev) =>
        prev.map((o) => o._id === orderId ? { ...o, deliveryStatus: newStatus } : o)
      );
    }

    setUpdatingId(orderId);
    try {
      const res = await axiosInstance.put(`/placed-orders/${orderId}/status`, { deliveryStatus: newStatus });
      if (res.data.success) {
        toast.success(res.data.message || "Status updated!");
        lastFetchedAt.current = null;
      } else {
        setOrders(previousOrders);
        toast.error(res.data.message || "Failed to update status");
      }
    } catch (err) {
      setOrders(previousOrders);
      toast.error(err?.response?.data?.message || "Error updating delivery status");
    } finally {
      setUpdatingId(null);
    }
  }, [orders]);

  // ── Filter + sort + paginate ─────────────────────────────────────────────
  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const idMatch     = searchOrderId ? String(o._id).toLowerCase().includes(searchOrderId.toLowerCase()) : true;
      const buyerMatch  = searchBuyer   ? (o.buyerName || "").toLowerCase().includes(searchBuyer.toLowerCase()) : true;
      const statusMatch = filterStatus  ? o.deliveryStatus === filterStatus : true;
      const dateStr     = new Date(o.createdAt).toISOString().slice(0, 10);
      const fromMatch   = dateFrom ? dateStr >= dateFrom : true;
      const toMatch     = dateTo   ? dateStr <= dateTo   : true;
      return idMatch && buyerMatch && statusMatch && fromMatch && toMatch;
    });
  }, [orders, searchOrderId, searchBuyer, filterStatus, dateFrom, dateTo]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let aVal, bVal;
      if      (sortField === "createdAt")  { aVal = new Date(a.createdAt); bVal = new Date(b.createdAt); }
      else if (sortField === "totalPrice") { aVal = a.totalPrice || 0;     bVal = b.totalPrice || 0; }
      else if (sortField === "buyerName")  { aVal = (a.buyerName || "").toLowerCase(); bVal = (b.buyerName || "").toLowerCase(); }
      else { aVal = a[sortField]; bVal = b[sortField]; }
      if (aVal < bVal) return sortDir === "asc" ? -1 :  1;
      if (aVal > bVal) return sortDir === "asc" ?  1 : -1;
      return 0;
    });
  }, [filtered, sortField, sortDir]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated  = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleSort = useCallback((field) => {
    if (sortField === field) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  }, [sortField]);

  // ── CSV export ───────────────────────────────────────────────────────────
  const handleExport = useCallback(() => {
    const headers = ["Order ID", "Buyer", "User Role", "Products", "Total", "Payment", "Status", "Date"];
    const rows = sorted.map((o) => [
      String(o._id), o.buyerName || "Unknown", o.userOrdering?.role || "—",
      o.productList?.map((i) => `${i.productName || i.productId?.name || "Unknown"} x${i.quantity}`).join(" | ") || "",
      o.totalPrice || 0, o.paymentMethod || "", o.deliveryStatus || "",
      new Date(o.createdAt).toLocaleDateString(),
    ]);
    const csv  = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `placed-orders-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  }, [sorted]);

  const resetFilters = () => {
    setSearchOrderIdRaw(""); setSearchBuyerRaw("");
    setFilterStatus(""); setDateFrom(""); setDateTo(""); setCurrentPage(1);
  };
  const hasFilters = searchOrderIdRaw || searchBuyerRaw || filterStatus || dateFrom || dateTo;

  useEffect(() => { fetchOrders(); }, []);
  useEffect(() => { setCurrentPage(1); }, [searchOrderId, searchBuyer, filterStatus, dateFrom, dateTo]);

  // ── Stats ────────────────────────────────────────────────────────────────
  const totalRevenue    = useMemo(() => orders.reduce((s, o) => s + (o.totalPrice || 0), 0), [orders]);
  const filteredRevenue = useMemo(() => filtered.reduce((s, o) => s + (o.totalPrice || 0), 0), [filtered]);
  const pendingCount    = useMemo(() => orders.filter((o) => o.deliveryStatus === "pending").length,    [orders]);
  const processingCount = useMemo(() => orders.filter((o) => o.deliveryStatus === "processing").length, [orders]);
  const deliveryCount   = useMemo(() => orders.filter((o) => o.fulfillmentType === "delivery").length,  [orders]);

  return (
    <div className="p-4">
      {/* Page header */}
      <div className="flex flex-wrap justify-between items-center mb-4 gap-3">
        <h2 className="text-xl font-bold text-gray-800">📦 Placed Orders</h2>
        <button onClick={handleExport} disabled={sorted.length === 0}
          className="bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white px-4 py-2 rounded-md text-sm">
          Export CSV
        </button>
      </div>

      {/* Delegation context banner */}
      <DelegationBanner />

      {/* Quick Order ID Lookup */}
      <QuickOrderLookup
        onStatusUpdate={updateDeliveryStatus}
        updatingId={updatingId}
      />

      {loading ? (
        <PlacedOrdersSkeleton />
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {[
              { label: "Total Orders",  value: orders.length },
              { label: "Pending",       value: pendingCount,    color: "text-yellow-600" },
              { label: "Processing",    value: processingCount, color: "text-blue-600" },
              { label: "Total Revenue", value: `₦${totalRevenue.toLocaleString()}` },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <p className={`text-lg font-semibold ${color || "text-gray-800"}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Delivery alert */}
          {deliveryCount > 0 && (
            <div className="mb-4 flex items-center gap-3 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3">
              <span className="text-xl">🚚</span>
              <p className="text-sm text-amber-900 font-semibold">
                {deliveryCount} order{deliveryCount !== 1 ? "s" : ""} require delivery.
                <span className="font-normal ml-1">Expand each delivery order to see address and recipient details before updating status.</span>
              </p>
            </div>
          )}

          {/* Filters */}
          <div className="mb-4 flex flex-wrap gap-3 items-end bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide pl-0.5">Order ID</label>
              <input type="text" placeholder="Search..." value={searchOrderIdRaw}
                onChange={(e) => setSearchOrderIdRaw(e.target.value)}
                className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-36" />
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide pl-0.5">Buyer name</label>
              <input type="text" placeholder="Search..." value={searchBuyerRaw}
                onChange={(e) => setSearchBuyerRaw(e.target.value)}
                className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-36" />
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide pl-0.5">Status</label>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
              </select>
            </div>
            <DateInput label="From date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <DateInput label="To date"   value={dateTo}   onChange={(e) => setDateTo(e.target.value)} />
            {hasFilters && (
              <button onClick={resetFilters}
                className="text-xs text-red-500 underline hover:text-red-700 self-end pb-1.5">
                Reset
              </button>
            )}
            {hasFilters && (
              <span className="text-xs text-gray-500 ml-auto self-end pb-1.5">
                {filtered.length} of {orders.length} · ₦{filteredRevenue.toLocaleString()}
              </span>
            )}
          </div>

          {orders.length > 0 ? (
            <>
              <PlacedOrdersTable
                orders={paginated}
                allOrders={orders}
                updateDeliveryStatus={updateDeliveryStatus}
                updatingId={updatingId}
                sortField={sortField}
                sortDir={sortDir}
                onSort={handleSort}
                currentPage={currentPage}
                pageSize={PAGE_SIZE}
                highlightId={highlightOrderId}
              />
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-3 mt-5">
                  <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}
                    className="px-3 py-1 rounded border border-gray-300 text-sm disabled:opacity-40 hover:bg-gray-100">
                    ← Prev
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages} · {sorted.length} orders
                  </span>
                  <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                    className="px-3 py-1 rounded border border-gray-300 text-sm disabled:opacity-40 hover:bg-gray-100">
                    Next →
                  </button>
                </div>
              )}
            </>
          ) : (
            <p className="text-gray-500 text-center py-8">No active placed orders</p>
          )}
        </>
      )}
    </div>
  );
};

export default StaffPlacedOrders;
