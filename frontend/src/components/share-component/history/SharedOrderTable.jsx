import React, { useState, useEffect, useMemo } from "react";
import { FaTrashAlt, FaChevronDown, FaChevronUp, FaSort, FaSortUp, FaSortDown, FaCalendarAlt } from "react-icons/fa";

const SharedOrderTable = ({ orders, role, onDelete, onClearAll, onViewReceipt }) => {
  const [searchDate, setSearchDate] = useState("");
  const [searchDateTo, setSearchDateTo] = useState("");
  const [searchRole, setSearchRole] = useState("");
  const [searchOrderId, setSearchOrderId] = useState("");
  const [sortField, setSortField] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");
  const [expandedRows, setExpandedRows] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  // reset page on filter change
  useEffect(() => { setCurrentPage(1); }, [searchDate, searchDateTo, searchRole, searchOrderId]);

  if (!orders.length)
    return <p className="text-gray-500 text-center py-10">No completed orders found</p>;

  const showBuyer = role === "admin" || role === "staff";
  const showUser = role === "admin";

  // ── STATS ──
  const totalRevenue = orders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);

  // ── FILTER ──
  const filtered = useMemo(() => {
    return orders.filter((order) => {
      const roleMatch = searchRole ? order.userOrdering?.role === searchRole : true;
      const dateStr = new Date(order.createdAt).toISOString().slice(0, 10);
      const dateFromMatch = searchDate ? dateStr >= searchDate : true;
      const dateToMatch = searchDateTo ? dateStr <= searchDateTo : true;
      const idMatch = searchOrderId
        ? String(order._id).toLowerCase().includes(searchOrderId.toLowerCase())
        : true;
      return roleMatch && dateFromMatch && dateToMatch && idMatch;
    });
  }, [orders, searchDate, searchDateTo, searchRole, searchOrderId]);

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
  const paginated = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // ── SORT HANDLER ──
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <FaSort className="inline ml-1 text-gray-400" />;
    return sortDir === "asc"
      ? <FaSortUp className="inline ml-1 text-blue-500" />
      : <FaSortDown className="inline ml-1 text-blue-500" />;
  };

  // ── EXPAND TOGGLE ──
  const toggleExpand = (id) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // ── CSV EXPORT ──
  const handleExport = () => {
    const headers = ["Order ID", "Buyer", "Products", "Total", "Payment", "Status", "Date"];
    const rows = sorted.map((o) => [
      String(o._id),
      o.buyerName || "Unknown",
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
    a.download = `orders-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── STATUS BADGE ──
  const StatusBadge = ({ status }) => {
    const map = {
      pending: "bg-yellow-100 text-yellow-800",
      processing: "bg-blue-100 text-blue-800",
      shipped: "bg-indigo-100 text-indigo-800",
      "in transit": "bg-blue-100 text-blue-700",
      delivered: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-700",
    };
    const cls = map[status?.toLowerCase()] || "bg-gray-100 text-gray-700";
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${cls}`}>
        {status?.toUpperCase() || "—"}
      </span>
    );
  };

  return (
    <div>
      {/* ── STATS BAR ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total Orders", value: orders.length },
          { label: "Filtered Orders", value: filtered.length },
          { label: "Total Revenue", value: `₦${totalRevenue.toLocaleString()}` },
          {
            label: "Filtered Revenue",
            value: `₦${filtered.reduce((s, o) => s + (o.totalPrice || 0), 0).toLocaleString()}`,
          },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className="text-lg font-semibold text-gray-800">{value}</p>
          </div>
        ))}
      </div>

      {/* ── FILTERS ── */}
      <div className="mb-4 flex flex-wrap gap-3 items-center">
        {/* Order ID search */}
        <input
          type="text"
          placeholder="Search by Order ID..."
          value={searchOrderId}
          onChange={(e) => setSearchOrderId(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-44"
        />

        {/* Date range */}
        {(role === "admin" || role === "staff") && (
          <>
            <label className="flex flex-col gap-1 text-xs text-gray-500 sm:flex-row sm:items-end sm:gap-2">
              <span className="flex items-center gap-1 text-gray-500">
                <FaCalendarAlt className="text-gray-400" /> From
              </span>
              <input
                type="date"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                aria-label="Start date"
                className="border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </label>
            <span className="text-gray-400 text-sm self-end mt-2 sm:mt-0">to</span>
            <label className="flex flex-col gap-1 text-xs text-gray-500 sm:flex-row sm:items-end sm:gap-2">
              <span className="flex items-center gap-1 text-gray-500">
                <FaCalendarAlt className="text-gray-400" /> To
              </span>
              <input
                type="date"
                value={searchDateTo}
                onChange={(e) => setSearchDateTo(e.target.value)}
                aria-label="End date"
                className="border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </label>
          </>
        )}

        {/* Role filter */}
        {role === "admin" && (
          <select
            value={searchRole}
            onChange={(e) => setSearchRole(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">All Roles</option>
            <option value="staff">Staff</option>
            <option value="customer">Customer</option>
          </select>
        )}

        {/* Reset filters */}
        {(searchDate || searchDateTo || searchRole || searchOrderId) && (
          <button
            onClick={() => {
              setSearchDate("");
              setSearchDateTo("");
              setSearchRole("");
              setSearchOrderId("");
            }}
            className="text-xs text-red-500 underline hover:text-red-700"
          >
            Reset filters
          </button>
        )}

        <div className="ml-auto flex gap-2">
          {/* Export CSV */}
          <button
            onClick={handleExport}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-1 rounded text-sm"
          >
            Export CSV
          </button>

          {/* Clear all */}
          {onClearAll && (
            <button
              onClick={onClearAll}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-1 rounded text-sm"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* ── DESKTOP TABLE ── */}
      <div className="overflow-x-auto rounded-lg shadow-md border hidden md:block">
        <table className="min-w-full text-left border-collapse text-sm">
          <thead className="bg-gray-200 text-gray-700 uppercase text-xs">
            <tr>
              <th className="p-3 border">#</th>
              <th className="p-3 border cursor-pointer" onClick={() => handleSort("_id")}>
                Order ID <SortIcon field="_id" />
              </th>
              {showBuyer && (
                <th className="p-3 border cursor-pointer" onClick={() => handleSort("buyerName")}>
                  Buyer <SortIcon field="buyerName" />
                </th>
              )}
              {showUser && <th className="p-3 border">User</th>}
              <th className="p-3 border">Products</th>
              <th className="p-3 border cursor-pointer" onClick={() => handleSort("totalPrice")}>
                Total <SortIcon field="totalPrice" />
              </th>
              <th className="p-3 border">Payment</th>
              <th className="p-3 border">Status</th>
              <th className="p-3 border cursor-pointer" onClick={() => handleSort("createdAt")}>
                Date <SortIcon field="createdAt" />
              </th>
              <th className="p-3 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((order, i) => (
              <React.Fragment key={order._id}>
                <tr
                  className="border-t hover:bg-gray-50 transition align-top cursor-pointer"
                  onClick={() => toggleExpand(order._id)}
                >
                  <td className="p-3 text-gray-500">{(currentPage - 1) * PAGE_SIZE + i + 1}</td>
                  <td className="p-3 font-mono text-xs text-gray-500">
                    ...{String(order._id).slice(-8).toUpperCase()}
                  </td>
                  {showBuyer && (
                    <td className="p-3 font-medium">{order.buyerName || "Unknown"}</td>
                  )}
                  {showUser && (
                    <td className="p-3">
                      {order.userOrdering
                        ? order.userOrdering.role === "staff"
                          ? `${order.userOrdering.name || "Unknown"} (staff)`
                          : order.userOrdering.role
                        : "Unknown"}
                    </td>
                  )}
                  <td className="p-3">
                    <span className="text-xs text-gray-500">
                      {order.productList?.length || 0} item(s) —
                      <button
                        className="text-blue-500 underline ml-1 text-xs"
                        onClick={(e) => { e.stopPropagation(); toggleExpand(order._id); }}
                      >
                        {expandedRows[order._id] ? "hide" : "show"}
                      </button>
                    </span>
                  </td>
                  <td className="p-3 font-semibold text-green-700">
                    ₦{order.totalPrice?.toLocaleString()}
                  </td>
                  <td className="p-3">{order.paymentMethod}</td>
                  <td className="p-3"><StatusBadge status={order.deliveryStatus} /></td>
                  <td className="p-3 text-gray-600 text-xs">
                    <div>{new Date(order.createdAt).toLocaleDateString()}</div>
                    <div className="text-gray-400">
                      {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onDelete(order._id)}
                        className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded flex items-center gap-1 text-xs"
                      >
                        <FaTrashAlt /> Remove
                      </button>
                      {onViewReceipt && (
                        <button
                          onClick={() => onViewReceipt(order._id, order)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs"
                        >
                          Receipt
                        </button>
                      )}
                    </div>
                  </td>
                </tr>

                {/* ── EXPANDED ROW ── */}
                {expandedRows[order._id] && (
                  <tr className="bg-gray-50 border-t">
                    <td colSpan={9} className="px-6 py-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                        Order Details — Full ID: {String(order._id)}
                      </p>
                      <ul className="space-y-2">
                        {order.productList?.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-3 text-sm">
                            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full font-semibold">
                              x{item.quantity}
                            </span>
                            <div>
                              <span className="font-semibold text-gray-800">
                                {item.productId?.name || "Unnamed"}
                              </span>
                              <span className="text-gray-400 text-xs ml-2">
                                ({item.productId?.categoryId?.name || "No Category"})
                              </span>
                              {item.productId?.description && (
                                <p className="text-gray-500 text-xs italic mt-0.5">
                                  {item.productId.description}
                                </p>
                              )}
                              <p className="text-green-700 text-xs font-medium mt-0.5">
                                ₦{item.price?.toLocaleString()} each · Total: ₦{item.totalPrice?.toLocaleString()}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── MOBILE CARDS ── */}
      <div className="md:hidden mt-4 space-y-4">
        {paginated.map((order, i) => (
          <div key={order._id} className="border border-gray-200 rounded-xl shadow-sm p-4 bg-white">
            <div className="flex justify-between items-start mb-1">
              <h3 className="font-semibold text-gray-800">#{(currentPage - 1) * PAGE_SIZE + i + 1} — {order.buyerName}</h3>
              <StatusBadge status={order.deliveryStatus} />
            </div>

            <p className="text-xs text-gray-400 font-mono mb-2">
              ID: ...{String(order._id).slice(-8).toUpperCase()}
            </p>

            {showUser && (
              <p className="text-sm mb-1">
                <span className="font-semibold">User:</span>{" "}
                {order.userOrdering
                  ? order.userOrdering.role === "staff"
                    ? `${order.userOrdering.name} (staff)`
                    : order.userOrdering.role
                  : "Unknown"}
              </p>
            )}

            <button
              className="text-xs text-blue-500 underline mb-2 flex items-center gap-1"
              onClick={() => toggleExpand(order._id)}
            >
              {expandedRows[order._id] ? <FaChevronUp /> : <FaChevronDown />}
              {expandedRows[order._id] ? "Hide" : "Show"} {order.productList?.length} item(s)
            </button>

            {expandedRows[order._id] && (
              <ul className="space-y-2 mb-2 pl-2 border-l-2 border-blue-100">
                {order.productList?.map((item, idx) => (
                  <li key={idx} className="text-sm">
                    <span className="font-medium text-gray-800">{item.productId?.name || "Unnamed"}</span>
                    <span className="text-gray-400 text-xs ml-1">({item.productId?.categoryId?.name || "—"})</span>
                    <span className="ml-1 text-xs">×{item.quantity}</span>
                    {item.productId?.description && (
                      <p className="text-gray-400 text-xs italic">{item.productId.description}</p>
                    )}
                    <p className="text-green-700 text-xs">₦{item.price?.toLocaleString()} each</p>
                  </li>
                ))}
              </ul>
            )}

            <div className="text-sm text-gray-700 space-y-1">
              <p><span className="font-semibold">Payment:</span> {order.paymentMethod}</p>
              <p><span className="font-semibold">Total:</span> <span className="text-green-700 font-semibold">₦{order.totalPrice?.toLocaleString()}</span></p>
              <p className="text-xs text-gray-400">
                {new Date(order.createdAt).toLocaleDateString()} · {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>

            <div className="mt-3 flex gap-2">
              <button
                onClick={() => onDelete(order._id)}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded flex items-center gap-1 text-sm flex-1 justify-center"
              >
                <FaTrashAlt className="text-xs" /> Remove
              </button>
              {onViewReceipt && (
                <button
                  onClick={() => onViewReceipt(order._id, order)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex-1"
                >
                  Receipt
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── PAGINATION ── */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 mt-6">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 rounded border border-gray-300 text-sm disabled:opacity-40 hover:bg-gray-100"
          >
            ← Prev
          </button>
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages} · {filtered.length} orders
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
    </div>
  );
};

export default SharedOrderTable;