import React, { memo, useState, useEffect, useMemo, useCallback } from "react";
import {
  FaTrashAlt, FaChevronDown, FaChevronUp,
  FaSort, FaSortUp, FaSortDown, FaCheckSquare, FaSquare,
} from "react-icons/fa";
import { Trash2 } from "lucide-react";

// ── Labeled date input ────────────────────────────────────────────────────────
// Shows a visible label above the input so mobile/production browsers always
// display context even when placeholder is hidden.
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

// ── Status badge ──────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const map = {
    pending:      "bg-yellow-100 text-yellow-800",
    processing:   "bg-blue-100 text-blue-800",
    shipped:      "bg-indigo-100 text-indigo-800",
    "in transit": "bg-blue-100 text-blue-700",
    delivered:    "bg-green-100 text-green-800",
    cancelled:    "bg-red-100 text-red-700",
    refunded:     "bg-purple-100 text-purple-700",
  };
  const cls = map[status?.toLowerCase()] || "bg-gray-100 text-gray-700";
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${cls}`}>
      {status?.toUpperCase() || "—"}
    </span>
  );
};

const SharedOrderTable = memo(({
  orders,
  role,
  onDelete,
  onClearAll,
  onViewReceipt,
  onMarkRefund,
  refundingId,
}) => {
  const [searchDate,    setSearchDate]    = useState("");
  const [searchDateTo,  setSearchDateTo]  = useState("");
  const [searchRole,    setSearchRole]    = useState("");
  const [searchOrderId, setSearchOrderId] = useState("");
  const [sortField,     setSortField]     = useState("createdAt");
  const [sortDir,       setSortDir]       = useState("desc");
  const [expandedRows,  setExpandedRows]  = useState({});
  const [currentPage,   setCurrentPage]   = useState(1);

  // ── Bulk select state ────────────────────────────────────────────────────
  const [selectedIds,   setSelectedIds]   = useState(new Set());
  const [deleting,      setDeleting]      = useState(false);

  const PAGE_SIZE = 10;

  useEffect(() => { setCurrentPage(1); }, [searchDate, searchDateTo, searchRole, searchOrderId]);
  // Clear selection when page or filters change
  useEffect(() => { setSelectedIds(new Set()); }, [currentPage, searchDate, searchDateTo, searchRole, searchOrderId]);

  if (!orders.length)
    return <p className="text-gray-500 text-center py-10">No completed orders found</p>;

  const showBuyer = role === "admin" || role === "staff";
  const showUser  = role === "admin";

  // Revenue excludes refunded orders
  const netRevenue = orders
    .filter((o) => !o.refundExcludeFromRevenue)
    .reduce((sum, o) => sum + (o.totalPrice || 0), 0);

  // ── Filter ───────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return orders.filter((order) => {
      const roleMatch    = searchRole ? order.userOrdering?.role === searchRole : true;
      const dateStr      = new Date(order.createdAt).toISOString().slice(0, 10);
      const fromMatch    = searchDate    ? dateStr >= searchDate    : true;
      const toMatch      = searchDateTo  ? dateStr <= searchDateTo  : true;
      const idMatch      = searchOrderId
        ? String(order._id).toLowerCase().includes(searchOrderId.toLowerCase())
        : true;
      return roleMatch && fromMatch && toMatch && idMatch;
    });
  }, [orders, searchDate, searchDateTo, searchRole, searchOrderId]);

  // Revenue of filtered set (for admin role-filter revenue display)
  const filteredRevenue = filtered
    .filter((o) => !o.refundExcludeFromRevenue)
    .reduce((sum, o) => sum + (o.totalPrice || 0), 0);

  // ── Sort ─────────────────────────────────────────────────────────────────
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

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <FaSort className="inline ml-1 text-gray-400" />;
    return sortDir === "asc"
      ? <FaSortUp className="inline ml-1 text-blue-500" />
      : <FaSortDown className="inline ml-1 text-blue-500" />;
  };

  const toggleExpand = useCallback((id) => setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] })), []);

  // ── Bulk select helpers ───────────────────────────────────────────────────
  const pageIds        = paginated.map((o) => o._id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const someSelected    = selectedIds.size > 0;

  const toggleSelectAll = useCallback(() => {
    if (allPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        pageIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        pageIds.forEach((id) => next.add(id));
        return next;
      });
    }
  }, [allPageSelected, pageIds]);

  const toggleSelect = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleDeleteSelected = async () => {
    if (!selectedIds.size) return;
    const confirmed = window.confirm(
      `Delete ${selectedIds.size} selected order${selectedIds.size !== 1 ? "s" : ""}? This cannot be undone.`
    );
    if (!confirmed) return;
    setDeleting(true);
    // Delete one by one — onDelete handles optimistic update
    for (const id of selectedIds) {
      await onDelete(id);
    }
    setSelectedIds(new Set());
    setDeleting(false);
  };

  // ── CSV Export ────────────────────────────────────────────────────────────
  const handleExport = () => {
    const headers = ["Order ID", "Buyer", "Products", "Total", "Payment", "Status", "Cancelled", "Refunded", "Date"];
    const rows = sorted.map((o) => [
      String(o._id),
      o.buyerName || "Unknown",
      o.productList?.map((i) => `${i.productId?.name} x${i.quantity}`).join(" | ") || "",
      o.totalPrice || 0,
      o.paymentMethod || "",
      o.deliveryStatus || "",
      o.cancelled  ? "Yes" : "No",
      o.refundMade ? "Yes" : "No",
      new Date(o.createdAt).toLocaleDateString(),
    ]);
    const csv  = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `orders-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const resetFilters = () => {
    setSearchDate(""); setSearchDateTo(""); setSearchRole(""); setSearchOrderId("");
  };
  const hasFilters = searchDate || searchDateTo || searchRole || searchOrderId;

  return (
    <div>
      {/* ── STATS BAR ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {[
          { label: "Total Orders",    value: orders.length },
          { label: "Filtered Orders", value: filtered.length },
          { label: "Net Revenue",     value: `₦${netRevenue.toLocaleString()}` },
          { label: searchRole ? `${searchRole} Revenue` : "Filtered Revenue",
            value: `₦${filteredRevenue.toLocaleString()}` },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className="text-lg font-semibold text-gray-800">{value}</p>
          </div>
        ))}
      </div>

      {/* Revenue note */}
      {role === "admin" && orders.some((o) => o.refundExcludeFromRevenue) && (
        <p className="text-xs text-purple-600 bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 mb-3">
          💡 Refunded orders are excluded from Net Revenue.
        </p>
      )}

      {/* ── FILTERS ── */}
      <div className="mb-4 flex flex-wrap gap-3 items-end">
        {/* Order ID */}
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide pl-0.5">
            Order ID
          </label>
          <input
            type="text" placeholder="Search..." value={searchOrderId}
            onChange={(e) => setSearchOrderId(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-40"
          />
        </div>

        {/* Date range — labeled inputs */}
        {(role === "admin" || role === "staff") && (
          <>
            <DateInput label="From date" value={searchDate}   onChange={(e) => setSearchDate(e.target.value)} />
            <DateInput label="To date"   value={searchDateTo} onChange={(e) => setSearchDateTo(e.target.value)} />
          </>
        )}

        {/* ✅ Role filter — admin only, includes wholesale */}
        {role === "admin" && (
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide pl-0.5">
              Filter by role
            </label>
            <select
              value={searchRole}
              onChange={(e) => setSearchRole(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="">All Roles</option>
              <option value="staff">Staff</option>
              <option value="customer">Customer</option>
              <option value="wholesale">Wholesale</option>
            </select>
          </div>
        )}

        {hasFilters && (
          <button onClick={resetFilters}
            className="text-xs text-red-500 underline hover:text-red-700 self-end pb-1.5">
            Reset filters
          </button>
        )}

        <div className="ml-auto flex gap-2 self-end">
          <button onClick={handleExport}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded text-sm">
            Export CSV
          </button>
          {onClearAll && (
            <button onClick={onClearAll}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded text-sm">
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* ── BULK DELETE TOOLBAR ── */}
      {someSelected && (
        <div className="mb-3 flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-2.5">
          <span className="text-sm text-indigo-700 font-semibold">
            {selectedIds.size} order{selectedIds.size !== 1 ? "s" : ""} selected
          </span>
          <button
            onClick={handleDeleteSelected}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
          >
            <Trash2 size={13} />
            {deleting ? "Deleting..." : "Delete selected"}
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-indigo-500 hover:underline ml-auto"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* ── DESKTOP TABLE ── */}
      <div className="overflow-x-auto rounded-lg shadow-md border hidden md:block">
        <table className="min-w-full text-left border-collapse text-sm">
          <thead className="bg-gray-200 text-gray-700 uppercase text-xs">
            <tr>
              {/* ✅ Select all checkbox */}
              <th className="p-3 border w-10">
                <button onClick={toggleSelectAll} className="text-gray-500 hover:text-indigo-600 transition">
                  {allPageSelected
                    ? <FaCheckSquare className="text-indigo-600" size={15} />
                    : <FaSquare size={15} />}
                </button>
              </th>
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
                  className={`border-t hover:bg-gray-50 transition align-top cursor-pointer
                    ${order.cancelled ? "bg-red-50/30" : ""}
                    ${selectedIds.has(order._id) ? "bg-indigo-50/60" : ""}`}
                  onClick={() => toggleExpand(order._id)}
                >
                  {/* Row checkbox */}
                  <td className="p-3 border" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => toggleSelect(order._id)} className="text-gray-400 hover:text-indigo-600 transition">
                      {selectedIds.has(order._id)
                        ? <FaCheckSquare className="text-indigo-600" size={14} />
                        : <FaSquare size={14} />}
                    </button>
                  </td>

                  <td className="p-3 text-gray-500">{(currentPage - 1) * PAGE_SIZE + i + 1}</td>
                  <td className="p-3 font-mono text-xs text-gray-500">
                    ...{String(order._id).slice(-8).toUpperCase()}
                  </td>
                  {showBuyer && <td className="p-3 font-medium">{order.buyerName || "Unknown"}</td>}
                  {showUser && (
                    <td className="p-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        order.userOrdering?.role === "wholesale"
                          ? "bg-amber-50 text-amber-700"
                          : order.userOrdering?.role === "staff"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-green-50 text-green-700"
                      }`}>
                        {order.userOrdering?.role === "staff"
                          ? `${order.userOrdering?.name || "Unknown"} (staff)`
                          : order.userOrdering?.role || "Unknown"}
                      </span>
                    </td>
                  )}
                  <td className="p-3">
                    <span className="text-xs text-gray-500">{order.productList?.length || 0} item(s) —</span>
                    <button className="text-blue-500 underline ml-1 text-xs"
                      onClick={(e) => { e.stopPropagation(); toggleExpand(order._id); }}>
                      {expandedRows[order._id] ? "hide" : "show"}
                    </button>
                  </td>
                  <td className={`p-3 font-semibold ${order.refundExcludeFromRevenue ? "line-through text-gray-400" : "text-green-700"}`}>
                    ₦{order.totalPrice?.toLocaleString()}
                    {order.refundExcludeFromRevenue && (
                      <span className="ml-1 text-purple-500 no-underline text-xs font-normal">(refunded)</span>
                    )}
                  </td>
                  <td className="p-3">{order.paymentMethod}</td>
                  <td className="p-3"><StatusBadge status={order.deliveryStatus} /></td>
                  <td className="p-3 text-gray-600 text-xs">
                    <div>{new Date(order.createdAt).toLocaleDateString()}</div>
                    <div className="text-gray-400">
                      {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    {order.cancelledAt && (
                      <div className="text-red-400 text-[10px] mt-0.5">
                        Cancelled: {new Date(order.cancelledAt).toLocaleDateString()}
                      </div>
                    )}
                    {order.refundMadeAt && (
                      <div className="text-purple-400 text-[10px]">
                        Refunded: {new Date(order.refundMadeAt).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex flex-col gap-2">
                      {/* Refund button — cancelled orders, admin only */}
                      {role === "admin" && order.cancelled && !order.refundMade && (
                        <button
                          onClick={() => onMarkRefund?.(order._id)}
                          disabled={refundingId === order._id}
                          className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-2 py-1 rounded text-xs font-semibold"
                          title="Mark refund as completed — irreversible"
                        >
                          {refundingId === order._id ? "..." : "💳 Mark Refund"}
                        </button>
                      )}
                      {role === "admin" && order.cancelled && order.refundMade && (
                        <span className="text-[11px] bg-purple-100 text-purple-700 border border-purple-200 rounded-full px-2 py-0.5 font-semibold">
                          ✅ Refund done
                        </span>
                      )}
                      <div className="flex gap-1">
                        {/* ✅ Individual delete */}
                        <button onClick={() => onDelete(order._id)}
                          className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded flex items-center gap-1 text-xs">
                          <FaTrashAlt /> Remove
                        </button>
                        {onViewReceipt && (
                          <button onClick={() => onViewReceipt(order._id, order)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs">
                            Receipt
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>

                {/* Expanded product list */}
                {expandedRows[order._id] && (
                  <tr className="bg-gray-50 border-t">
                    <td colSpan={12} className="px-6 py-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                        Full ID: {String(order._id)}
                      </p>
                      <ul className="space-y-2">
                        {order.productList?.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-3 text-sm">
                            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full font-semibold">
                              x{item.quantity}
                            </span>
                            <div>
                              <span className="font-semibold text-gray-800">{item.productId?.name || "Unnamed"}</span>
                              <span className="text-gray-400 text-xs ml-2">
                                ({item.productId?.categoryId?.name || "No Category"})
                              </span>
                              {item.productId?.description && (
                                <p className="text-gray-500 text-xs italic mt-0.5">{item.productId.description}</p>
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
        {/* Mobile select all bar */}
        {paginated.length > 0 && (
          <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-2">
            <button onClick={toggleSelectAll} className="flex items-center gap-2 text-sm text-gray-600">
              {allPageSelected
                ? <FaCheckSquare className="text-indigo-600" size={15} />
                : <FaSquare size={15} />}
              Select all on this page
            </button>
            {someSelected && (
              <button onClick={handleDeleteSelected} disabled={deleting}
                className="text-xs bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-3 py-1 rounded-lg font-semibold flex items-center gap-1">
                <Trash2 size={11} />
                {deleting ? "..." : `Delete (${selectedIds.size})`}
              </button>
            )}
          </div>
        )}

        {paginated.map((order, i) => (
          <div key={order._id}
            className={`border rounded-xl shadow-sm p-4 bg-white transition
              ${order.cancelled ? "border-red-200 bg-red-50/20" : "border-gray-200"}
              ${selectedIds.has(order._id) ? "ring-2 ring-indigo-300" : ""}`}>

            {/* Card top row — checkbox + name + status */}
            <div className="flex items-start justify-between mb-2 gap-2">
              <div className="flex items-start gap-2">
                <button onClick={() => toggleSelect(order._id)} className="mt-0.5 text-gray-400 hover:text-indigo-600 flex-shrink-0">
                  {selectedIds.has(order._id)
                    ? <FaCheckSquare className="text-indigo-600" size={15} />
                    : <FaSquare size={15} />}
                </button>
                <div>
                  <h3 className="font-semibold text-gray-800 text-sm">
                    #{(currentPage - 1) * PAGE_SIZE + i + 1} — {order.buyerName}
                  </h3>
                  <p className="text-xs text-gray-400 font-mono">
                    ...{String(order._id).slice(-8).toUpperCase()}
                  </p>
                </div>
              </div>
              <StatusBadge status={order.deliveryStatus} />
            </div>

            {showUser && (
              <p className="text-sm mb-2">
                <span className="font-semibold">User: </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  order.userOrdering?.role === "wholesale"
                    ? "bg-amber-50 text-amber-700"
                    : order.userOrdering?.role === "staff"
                    ? "bg-blue-50 text-blue-700"
                    : "bg-green-50 text-green-700"
                }`}>
                  {order.userOrdering?.role || "Unknown"}
                </span>
              </p>
            )}

            <button className="text-xs text-blue-500 underline mb-2 flex items-center gap-1"
              onClick={() => toggleExpand(order._id)}>
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
                    <p className="text-green-700 text-xs">₦{item.price?.toLocaleString()} each</p>
                  </li>
                ))}
              </ul>
            )}

            <div className="text-sm text-gray-700 space-y-0.5">
              <p><span className="font-semibold">Payment:</span> {order.paymentMethod}</p>
              <p>
                <span className="font-semibold">Total: </span>
                <span className={order.refundExcludeFromRevenue ? "line-through text-gray-400" : "text-green-700 font-semibold"}>
                  ₦{order.totalPrice?.toLocaleString()}
                </span>
                {order.refundExcludeFromRevenue && (
                  <span className="ml-1 text-purple-500 text-xs">(refunded)</span>
                )}
              </p>
              <p className="text-xs text-gray-400">
                {new Date(order.createdAt).toLocaleDateString()} ·{" "}
                {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>

            {/* Mobile actions */}
            <div className="mt-3 flex flex-col gap-2">
              {role === "admin" && order.cancelled && !order.refundMade && (
                <button onClick={() => onMarkRefund?.(order._id)} disabled={refundingId === order._id}
                  className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-3 py-2 rounded-lg font-semibold text-sm w-full">
                  {refundingId === order._id ? "Processing..." : "💳 Mark Refund as Done"}
                </button>
              )}
              {role === "admin" && order.cancelled && order.refundMade && (
                <span className="text-center text-sm bg-purple-100 text-purple-700 border border-purple-200 rounded-lg px-3 py-1.5 font-semibold">
                  ✅ Refund Completed
                </span>
              )}
              <div className="flex gap-2">
                <button onClick={() => onDelete(order._id)}
                  className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded flex items-center gap-1 text-sm flex-1 justify-center">
                  <FaTrashAlt className="text-xs" /> Remove
                </button>
                {onViewReceipt && (
                  <button onClick={() => onViewReceipt(order._id, order)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex-1">
                    Receipt
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── PAGINATION ── */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 mt-6">
          <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}
            className="px-3 py-1 rounded border border-gray-300 text-sm disabled:opacity-40 hover:bg-gray-100">
            ← Prev
          </button>
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages} · {filtered.length} orders
          </span>
          <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
            className="px-3 py-1 rounded border border-gray-300 text-sm disabled:opacity-40 hover:bg-gray-100">
            Next →
          </button>
        </div>
      )}
    </div>
  );
});

export default SharedOrderTable;
