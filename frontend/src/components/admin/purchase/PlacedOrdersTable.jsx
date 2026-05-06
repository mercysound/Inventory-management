import React, { useState } from "react";
import {
  FaTrashAlt, FaSortUp, FaSortDown,
  FaSort, FaChevronDown, FaChevronUp,
} from "react-icons/fa";

const StatusBadge = ({ status }) => {
  const map = {
    pending: "bg-yellow-100 text-yellow-800",
    processing: "bg-blue-100 text-blue-800",
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

const SortIcon = ({ field, sortField, sortDir }) => {
  if (sortField !== field)
    return <FaSort className="inline ml-1 text-gray-400 text-xs" />;
  return sortDir === "asc"
    ? <FaSortUp className="inline ml-1 text-indigo-500 text-xs" />
    : <FaSortDown className="inline ml-1 text-indigo-500 text-xs" />;
};

const PlacedOrdersTable = ({
  orders,
  allOrders,
  updateDeliveryStatus,
  deleteOrder,
  updatingId, // ✅ specific row id instead of boolean flag
  sortField,
  sortDir,
  onSort,
  currentPage,
  pageSize,
}) => {
  const [expandedRows, setExpandedRows] = useState({});

  const grandTotal = (allOrders || orders).reduce(
    (sum, o) => sum + (o.totalPrice || 0), 0
  );

  const toggleExpand = (id) =>
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="w-full bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold text-lg flex justify-between items-center">
        <span>Placed Orders</span>
        <span className="text-sm font-normal opacity-90">
          Grand Total: ₦{grandTotal.toLocaleString()}
        </span>
      </div>

      {/* ── DESKTOP TABLE ── */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full text-sm text-gray-700 border-collapse">
          <thead className="bg-gray-100 uppercase font-semibold text-gray-600 text-xs">
            <tr>
              <th className="p-3 text-left">#</th>
              <th className="p-3 text-left">Order ID</th>
              <th
                className="p-3 text-left cursor-pointer hover:bg-gray-200"
                onClick={() => onSort("buyerName")}
              >
                Buyer{" "}
                <SortIcon field="buyerName" sortField={sortField} sortDir={sortDir} />
              </th>
              <th className="p-3 text-left">User</th>
              <th className="p-3 text-left">Products</th>
              <th
                className="p-3 text-left cursor-pointer hover:bg-gray-200"
                onClick={() => onSort("totalPrice")}
              >
                Total{" "}
                <SortIcon field="totalPrice" sortField={sortField} sortDir={sortDir} />
              </th>
              <th className="p-3 text-left">Payment</th>
              <th className="p-3 text-left">Status</th>
              <th
                className="p-3 text-left cursor-pointer hover:bg-gray-200"
                onClick={() => onSort("createdAt")}
              >
                Date{" "}
                <SortIcon field="createdAt" sortField={sortField} sortDir={sortDir} />
              </th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>

          <tbody>
            {orders.map((order, i) => (
              <React.Fragment key={order._id}>
                <tr
                  className="border-t hover:bg-gray-50 transition duration-150 align-top cursor-pointer"
                  onClick={() => toggleExpand(order._id)}
                >
                  <td className="p-3 text-gray-500">
                    {(currentPage - 1) * pageSize + i + 1}
                  </td>

                  {/* Order ID */}
                  <td className="p-3 font-mono text-xs text-gray-400">
                    ...{String(order._id).slice(-8).toUpperCase()}
                  </td>

                  {/* Buyer */}
                  <td className="p-3 font-medium text-gray-800">
                    {order.buyerName || "Unknown"}
                  </td>

                  {/* User role */}
                  <td className="p-3">
                    <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                      {order.userOrdering?.role || "Unknown"}
                    </span>
                  </td>

                  {/* Products — collapsed summary */}
                  <td className="p-3">
                    <span className="text-xs text-gray-500">
                      {order.productList?.length || 0} item(s)
                    </span>
                    <button
                      className="text-blue-500 underline text-xs ml-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(order._id);
                      }}
                    >
                      {expandedRows[order._id] ? "hide" : "view"}
                    </button>
                  </td>

                  <td className="p-3 font-semibold text-green-700">
                    ₦{order.totalPrice?.toLocaleString() || 0}
                  </td>
                  <td className="p-3">{order.paymentMethod}</td>
                  <td className="p-3">
                    <StatusBadge status={order.deliveryStatus} />
                  </td>
                  <td className="p-3 text-gray-600 text-xs">
                    <div>{new Date(order.createdAt).toLocaleDateString()}</div>
                    <div className="text-gray-400">
                      {new Date(order.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </td>

                  {/* Actions */}
                  <td
                    className="p-3 relative"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* ✅ Ping indicator on the updating row only */}
                    {updatingId === order._id && (
                      <span className="absolute top-2 right-2 w-2 h-2 bg-indigo-400 rounded-full animate-ping" />
                    )}
                    <div className="flex flex-col gap-2">
                      <select
                        value={order.deliveryStatus}
                        onChange={(e) =>
                          updateDeliveryStatus(order._id, e.target.value)
                        }
                        className="border border-gray-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        // ✅ no disabled — optimistic update makes it feel instant
                      >
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="delivered">Delivered</option>
                      </select>
                      <button
                        onClick={() => deleteOrder(order._id)}
                        className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded flex items-center gap-1 text-xs justify-center"
                      >
                        <FaTrashAlt /> Delete
                      </button>
                    </div>
                  </td>
                </tr>

                {/* ── EXPANDED ROW ── */}
                {expandedRows[order._id] && (
                  <tr className="bg-indigo-50 border-t">
                    <td colSpan={10} className="px-6 py-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                        Full Order ID:{" "}
                        <span className="font-mono">{String(order._id)}</span>
                      </p>
                      <ul className="space-y-2">
                        {order.productList?.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-3 text-sm">
                            <span className="bg-indigo-100 text-indigo-800 text-xs px-2 py-0.5 rounded-full font-semibold">
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
                                ₦{item.price?.toLocaleString()} each · Total: ₦
                                {item.totalPrice?.toLocaleString()}
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
      <div className="md:hidden p-3 space-y-4">
        {orders.map((order, i) => (
          <div
            key={order._id}
            className="border border-gray-200 rounded-xl shadow-sm p-4 bg-white relative"
          >
            {/* ✅ Ping indicator on mobile too */}
            {updatingId === order._id && (
              <span className="absolute top-3 right-3 w-2 h-2 bg-indigo-400 rounded-full animate-ping" />
            )}

            <div className="flex justify-between items-start mb-1">
              <h3 className="font-semibold text-gray-800">
                #{(currentPage - 1) * pageSize + i + 1} — {order.buyerName}
              </h3>
              <StatusBadge status={order.deliveryStatus} />
            </div>

            <p className="text-xs text-gray-400 font-mono mb-1">
              ID: ...{String(order._id).slice(-8).toUpperCase()}
            </p>

            <p className="text-xs mb-2">
              <span className="font-semibold">User:</span>{" "}
              <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full text-xs">
                {order.userOrdering?.role || "Unknown"}
              </span>
            </p>

            {/* Expand toggle */}
            <button
              className="text-xs text-blue-500 underline mb-2 flex items-center gap-1"
              onClick={() => toggleExpand(order._id)}
            >
              {expandedRows[order._id] ? <FaChevronUp /> : <FaChevronDown />}
              {expandedRows[order._id] ? "Hide" : "Show"}{" "}
              {order.productList?.length} item(s)
            </button>

            {expandedRows[order._id] && (
              <ul className="space-y-2 mb-2 pl-2 border-l-2 border-indigo-100">
                {order.productList?.map((item, idx) => (
                  <li key={idx} className="text-sm">
                    <span className="font-medium text-gray-800">
                      {item.productId?.name || "Unnamed"}
                    </span>
                    <span className="text-gray-400 text-xs ml-1">
                      ({item.productId?.categoryId?.name || "—"})
                    </span>
                    <span className="ml-1 text-xs">×{item.quantity}</span>
                    {item.productId?.description && (
                      <p className="text-gray-400 text-xs italic">
                        {item.productId.description}
                      </p>
                    )}
                    <p className="text-green-700 text-xs">
                      ₦{item.price?.toLocaleString()} each · ₦
                      {item.totalPrice?.toLocaleString()} total
                    </p>
                  </li>
                ))}
              </ul>
            )}

            <div className="text-sm text-gray-700 space-y-1">
              <p>
                <span className="font-semibold">Payment:</span>{" "}
                {order.paymentMethod}
              </p>
              <p>
                <span className="font-semibold">Total:</span>{" "}
                <span className="text-green-700 font-semibold">
                  ₦{order.totalPrice?.toLocaleString()}
                </span>
              </p>
              <p className="text-xs text-gray-400">
                {new Date(order.createdAt).toLocaleDateString()}
                <span className="mx-1">·</span>
                {new Date(order.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>

            <div className="mt-3 space-y-2">
              <select
                value={order.deliveryStatus}
                onChange={(e) =>
                  updateDeliveryStatus(order._id, e.target.value)
                }
                className="border border-gray-300 rounded-lg px-2 py-1 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-400"
                // ✅ no disabled — optimistic update handles it
              >
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="delivered">Delivered</option>
              </select>
              <button
                onClick={() => deleteOrder(order._id)}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded flex items-center justify-center gap-1 text-sm w-full"
              >
                <FaTrashAlt className="text-xs" /> Delete Order
              </button>
            </div>
          </div>
        ))}

        {orders.length > 0 && (
          <div className="text-center font-bold text-indigo-600 mt-4 text-sm">
            Grand Total (all orders): ₦{grandTotal.toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(PlacedOrdersTable); // ✅ prevents re-renders when props haven't changed