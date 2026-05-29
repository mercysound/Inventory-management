import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import axiosInstance from "../../../utils/axiosInstance";
import { toast } from "react-toastify";
import { FaCalendarAlt } from "react-icons/fa";
import PlacedOrdersTable from "./PlacedOrdersTable";
import PlacedOrdersSkeleton from "./PlacedOrdersSkeleton";

// ✅ Debounce hook — prevents filter from firing on every keystroke
const useDebounce = (value, delay = 300) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
};

const PlacedOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null); // ✅ track which row is updating

  // ── RAW filter inputs (debounced below)
  const [searchOrderIdRaw, setSearchOrderIdRaw] = useState("");
  const [searchBuyerRaw, setSearchBuyerRaw] = useState("");

  // ── Other filters (no debounce needed — they fire on select/date change)
  const [filterStatus, setFilterStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // ✅ Debounced versions used in filter logic
  const searchOrderId = useDebounce(searchOrderIdRaw, 300);
  const searchBuyer = useDebounce(searchBuyerRaw, 300);

  // sort
  const [sortField, setSortField] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");

  // pagination
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  // ✅ Cache — skip fetch if data is less than 30s old
  const lastFetchedAt = useRef(null);
  const CACHE_TTL = 30000;

  const fetchOrders = async (force = false) => {
    const now = Date.now();
    if (
      !force &&
      lastFetchedAt.current &&
      now - lastFetchedAt.current < CACHE_TTL
    ) {
      return; // ✅ data is still fresh, skip the request
    }
    try {
      setLoading(true);
      const res = await axiosInstance.get("/placed-orders");
      if (res.data.success) {
        setOrders(res.data.orders || []);
        lastFetchedAt.current = now; // ✅ stamp fetch time
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Optimistic status update — UI changes instantly, rolls back on failure
  const updateDeliveryStatus = useCallback(async (orderId, newStatus) => {
    if (newStatus === "delivered") {
      const confirmDelivery = window.confirm(
        "Are you sure this order has been delivered? Once confirmed, it will move to history."
      );
      if (!confirmDelivery) return;
    }

    const previousOrders = orders; // save for rollback

    // ✅ Update UI instantly
    if (newStatus === "delivered") {
      setOrders((prev) => prev.filter((o) => o._id !== orderId));
    } else {
      setOrders((prev) =>
        prev.map((o) =>
          o._id === orderId ? { ...o, deliveryStatus: newStatus } : o
        )
      );
    }

    setUpdatingId(orderId); // ✅ show ping indicator on that row
    try {
      const res = await axiosInstance.put(`/placed-orders/${orderId}/status`, {
        deliveryStatus: newStatus,
      });
      if (res.data.success) {
        toast.success("Delivery status updated!");
        lastFetchedAt.current = null; // ✅ invalidate cache so next visit refetches
      } else {
        setOrders(previousOrders); // ✅ rollback
        toast.error(res.data.message || "Failed to update status");
      }
    } catch (err) {
      setOrders(previousOrders); // ✅ rollback
      toast.error("Error updating delivery status");
    } finally {
      setUpdatingId(null);
    }
  }, [orders]);

  // ✅ Optimistic delete — removes row instantly, rolls back on failure
  const handleDeleteOrder = useCallback(async (id) => {
    if (!window.confirm("Are you sure you want to delete this order?")) return;

    const previousOrders = orders;

    setOrders((prev) => prev.filter((o) => o._id !== id)); // ✅ remove instantly
    toast.success("Order deleted!");
    lastFetchedAt.current = null; // ✅ invalidate cache

    try {
      const res = await axiosInstance.delete(`/placed-orders/${id}`);
      if (!res.data.success) {
        setOrders(previousOrders); // ✅ rollback
        toast.error(res.data.message || "Failed to delete order");
      }
    } catch (error) {
      setOrders(previousOrders); // ✅ rollback
      toast.error("Error deleting order");
    }
  }, [orders]);

  // ── FILTER ──
  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const idMatch = searchOrderId
        ? String(o._id).toLowerCase().includes(searchOrderId.toLowerCase())
        : true;
      const buyerMatch = searchBuyer
        ? (o.buyerName || "").toLowerCase().includes(searchBuyer.toLowerCase())
        : true;
      const statusMatch = filterStatus ? o.deliveryStatus === filterStatus : true;
      const dateStr = new Date(o.createdAt).toISOString().slice(0, 10);
      const dateFromMatch = dateFrom ? dateStr >= dateFrom : true;
      const dateToMatch = dateTo ? dateStr <= dateTo : true;
      return idMatch && buyerMatch && statusMatch && dateFromMatch && dateToMatch;
    });
  }, [orders, searchOrderId, searchBuyer, filterStatus, dateFrom, dateTo]);

  // ── SORT ──
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let aVal, bVal;
      if (sortField === "createdAt") {
        aVal = new Date(a.createdAt);
        bVal = new Date(b.createdAt);
      } else if (sortField === "totalPrice") {
        aVal = a.totalPrice || 0;
        bVal = b.totalPrice || 0;
      } else if (sortField === "buyerName") {
        aVal = (a.buyerName || "").toLowerCase();
        bVal = (b.buyerName || "").toLowerCase();
      } else {
        aVal = a[sortField];
        bVal = b[sortField];
      }
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortField, sortDir]);

  // ── PAGINATE ──
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated = sorted.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // ── CSV EXPORT ──
  const handleExport = useCallback(() => {
    const headers = [
      "Order ID", "Buyer", "User Role", "Products",
      "Total", "Payment", "Status", "Date",
    ];
    const rows = sorted.map((o) => [
      String(o._id),
      o.buyerName || "Unknown",
      o.userOrdering?.role || "—",
      o.productList?.map((i) => `${i.productId?.name} x${i.quantity}`).join(" | ") || "",
      o.totalPrice || 0,
      o.paymentMethod || "",
      o.deliveryStatus || "",
      new Date(o.createdAt).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${c}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `placed-orders-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [sorted]);

  const resetFilters = () => {
    setSearchOrderIdRaw("");
    setSearchBuyerRaw("");
    setFilterStatus("");
    setDateFrom("");
    setDateTo("");
    setCurrentPage(1);
  };

  const hasFilters =
    searchOrderIdRaw || searchBuyerRaw || filterStatus || dateFrom || dateTo;

  // ✅ Memoized sort handler
  const handleSort = useCallback((field) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  }, [sortField]);

  useEffect(() => { fetchOrders(); }, []);
  useEffect(() => { setCurrentPage(1); }, [searchOrderId, searchBuyer, filterStatus, dateFrom, dateTo]);

  // ── STATS ──
  const totalRevenue = useMemo(
    () => orders.reduce((s, o) => s + (o.totalPrice || 0), 0),
    [orders]
  );
  const filteredRevenue = useMemo(
    () => filtered.reduce((s, o) => s + (o.totalPrice || 0), 0),
    [filtered]
  );
  const pendingCount = useMemo(
    () => orders.filter((o) => o.deliveryStatus === "pending").length,
    [orders]
  );
  const processingCount = useMemo(
    () => orders.filter((o) => o.deliveryStatus === "processing").length,
    [orders]
  );

  return (
    <div className="p-4">
      {/* ── PAGE HEADER ── */}
      <div className="flex flex-wrap justify-between items-center mb-4 gap-3">
        <h2 className="text-xl font-bold text-gray-800">📦 Placed Orders</h2>
        <button
          onClick={handleExport}
          disabled={sorted.length === 0}
          className="bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white px-4 py-2 rounded-md text-sm"
        >
          Export CSV
        </button>
      </div>

      {loading ? (
        <PlacedOrdersSkeleton />
      ) : (
        <>
          {/* ── STATS BAR ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {[
              { label: "Total Orders", value: orders.length },
              { label: "Pending", value: pendingCount, color: "text-yellow-600" },
              { label: "Processing", value: processingCount, color: "text-blue-600" },
              { label: "Total Revenue", value: `₦${totalRevenue.toLocaleString()}` },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                className="bg-gray-50 border border-gray-200 rounded-lg p-3"
              >
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <p className={`text-lg font-semibold ${color || "text-gray-800"}`}>
                  {value}
                </p>
              </div>
            ))}
          </div>

          {/* ── FILTERS ── */}
          <div className="mb-4 flex flex-wrap gap-3 items-center bg-gray-50 border border-gray-200 rounded-lg p-3">
            <input
              type="text"
              placeholder="Search Order ID..."
              value={searchOrderIdRaw} // ✅ raw value for instant input response
              onChange={(e) => setSearchOrderIdRaw(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-40"
            />
            <input
              type="text"
              placeholder="Search buyer..."
              value={searchBuyerRaw} // ✅ raw value
              onChange={(e) => setSearchBuyerRaw(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-40"
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="delivered">Delivered</option>
            </select>
            <label className="flex flex-col gap-1 text-xs text-gray-500 sm:flex-row sm:items-end sm:gap-2">
              <span className="flex items-center gap-1 text-gray-500">
                <FaCalendarAlt className="text-gray-400" /> From
              </span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                aria-label="Start date"
                className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </label>
            <span className="text-gray-400 text-sm self-end mt-2 sm:mt-0">to</span>
            <label className="flex flex-col gap-1 text-xs text-gray-500 sm:flex-row sm:items-end sm:gap-2">
              <span className="flex items-center gap-1 text-gray-500">
                <FaCalendarAlt className="text-gray-400" /> To
              </span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                aria-label="End date"
                className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </label>
            {hasFilters && (
              <button
                onClick={resetFilters}
                className="text-xs text-red-500 underline hover:text-red-700"
              >
                Reset filters
              </button>
            )}
            {hasFilters && (
              <span className="text-xs text-gray-500 ml-auto">
                Showing {filtered.length} of {orders.length} · ₦{filteredRevenue.toLocaleString()}
              </span>
            )}
          </div>

          {orders.length > 0 ? (
            <>
              <PlacedOrdersTable
                orders={paginated}
                allOrders={orders}
                updateDeliveryStatus={updateDeliveryStatus}
                deleteOrder={handleDeleteOrder}
                updatingId={updatingId} // ✅ pass specific row id instead of boolean
                sortField={sortField}
                sortDir={sortDir}
                onSort={handleSort}
                currentPage={currentPage}
                pageSize={PAGE_SIZE}
              />

              {/* ── PAGINATION ── */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-3 mt-5">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded border border-gray-300 text-sm disabled:opacity-40 hover:bg-gray-100"
                  >
                    ← Prev
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages} · {sorted.length} orders
                  </span>
                  <button
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 rounded border border-gray-300 text-sm disabled:opacity-40 hover:bg-gray-100"
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          ) : (
            <p className="text-gray-500 text-center py-8">No orders found</p>
          )}
        </>
      )}
    </div>
  );
};

export default PlacedOrders;