import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import axiosInstance from "../../../utils/axiosInstance";
import { toast } from "react-toastify";
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

  // ── Fetch orders ─────────────────────────────────────────────────────────
  const fetchOrders = async (force = false) => {
    const now = Date.now();
    if (!force && lastFetchedAt.current && now - lastFetchedAt.current < CACHE_TTL) return;
    try {
      setLoading(true);
      const res = await axiosInstance.get("/placed-orders");
      if (res.data.success) {
        setOrders(res.data.orders || []);
        lastFetchedAt.current = now;
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  // ── Update delivery status ───────────────────────────────────────────────
  const updateDeliveryStatus = useCallback(async (orderId, newStatus) => {
    if (newStatus === "cancelled") {
      const confirmed = window.confirm(
        "⚠️ Cancel this order?\n\n" +
        "This will:\n• Restore the product stock\n" +
        "• Move the order to history with 'cancelled' status\n" +
        "• Send a cancellation email to the buyer\n\n" +
        "The buyer will still see this in their Pending modal until the refund is marked."
      );
      if (!confirmed) return;
    }
    if (newStatus === "delivered") {
      if (!window.confirm("Confirm this order has been delivered? It will move to history.")) return;
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
