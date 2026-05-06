import React, { useEffect, useState, useMemo } from "react";
import axiosInstance from "../../../utils/axiosInstance";
import { toast } from "react-toastify";
import PlacedOrdersTable from "./PlacedOrdersTable";
import PlacedOrdersSkeleton from "./PlacedOrdersSkeleton";

const PlacedOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // filters
  const [searchOrderId, setSearchOrderId] = useState("");
  const [searchBuyer, setSearchBuyer] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // sort
  const [sortField, setSortField] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");

  // pagination
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/placed-orders");
      if (res.data.success) setOrders(res.data.orders || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  const updateDeliveryStatus = async (orderId, newStatus) => {
    if (newStatus === "delivered") {
      const confirmDelivery = window.confirm(
        "Are you sure this order has been delivered? Once confirmed, it will move to history."
      );
      if (!confirmDelivery) return;
    }
    try {
      setUpdating(true);
      const res = await axiosInstance.put(`/placed-orders/${orderId}/status`, {
        deliveryStatus: newStatus,
      });
      if (res.data.success) {
        toast.success("Delivery status updated!");
        fetchOrders();
      } else {
        toast.error(res.data.message || "Failed to update status");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error updating delivery status");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteOrder = async (id) => {
    if (!window.confirm("Are you sure you want to delete this order?")) return;
    try {
      const res = await axiosInstance.delete(`/placed-orders/${id}`);
      if (res.data.success) {
        toast.success("Order deleted!");
        setOrders((prev) => prev.filter((order) => order._id !== id));
      } else {
        toast.error(res.data.message || "Failed to delete order");
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Error deleting order");
    }
  };

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
      if (sortField === "createdAt") { aVal = new Date(a.createdAt); bVal = new Date(b.createdAt); }
      else if (sortField === "totalPrice") { aVal = a.totalPrice || 0; bVal = b.totalPrice || 0; }
      else if (sortField === "buyerName") { aVal = (a.buyerName || "").toLowerCase(); bVal = (b.buyerName || "").toLowerCase(); }
      else { aVal = a[sortField]; bVal = b[sortField]; }
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortField, sortDir]);

  // ── PAGINATE ──
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // ── CSV EXPORT ──
  const handleExport = () => {
    const headers = ["Order ID", "Buyer", "User Role", "Products", "Total", "Payment", "Status", "Date"];
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
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `placed-orders-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetFilters = () => {
    setSearchOrderId("");
    setSearchBuyer("");
    setFilterStatus("");
    setDateFrom("");
    setDateTo("");
    setCurrentPage(1);
  };

  const hasFilters = searchOrderId || searchBuyer || filterStatus || dateFrom || dateTo;

  useEffect(() => { fetchOrders(); }, []);
  useEffect(() => { setCurrentPage(1); }, [searchOrderId, searchBuyer, filterStatus, dateFrom, dateTo]);

  // ── STATS ──
  const totalRevenue = orders.reduce((s, o) => s + (o.totalPrice || 0), 0);
  const filteredRevenue = filtered.reduce((s, o) => s + (o.totalPrice || 0), 0);
  const pendingCount = orders.filter((o) => o.deliveryStatus === "pending").length;
  const processingCount = orders.filter((o) => o.deliveryStatus === "processing").length;

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
              <div key={label} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <p className={`text-lg font-semibold ${color || "text-gray-800"}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* ── FILTERS ── */}
          <div className="mb-4 flex flex-wrap gap-3 items-center bg-gray-50 border border-gray-200 rounded-lg p-3">
            <input
              type="text"
              placeholder="Search Order ID..."
              value={searchOrderId}
              onChange={(e) => setSearchOrderId(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-40"
            />
            <input
              type="text"
              placeholder="Search buyer..."
              value={searchBuyer}
              onChange={(e) => setSearchBuyer(e.target.value)}
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
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <span className="text-gray-400 text-sm">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
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
                updating={updating}
                sortField={sortField}
                sortDir={sortDir}
                onSort={(field) => {
                  if (sortField === field) setSortDir((d) => d === "asc" ? "desc" : "asc");
                  else { setSortField(field); setSortDir("asc"); }
                }}
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
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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