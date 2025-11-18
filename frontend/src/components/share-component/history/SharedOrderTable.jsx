import React, { useState, useEffect } from "react";
import { FaTrashAlt } from "react-icons/fa";

const SharedOrderTable = ({ orders, role, onDelete, onClearAll }) => {
  const [searchDate, setSearchDate] = useState("");
  const [searchRole, setSearchRole] = useState("");
  const [allOrders, setAllOrders] = useState([]);

  useEffect(() => {
    setAllOrders(orders);
  }, [orders]);

  if (!orders.length)
    return (
      <p className="text-gray-500 text-center py-10">
        No completed orders found
      </p>
    );

  // COLUMN RULES
  const showBuyer = role === "admin" || role === "staff";
  const showUser = role === "admin";
  const showActions = true;

  // Filter orders
  const filteredOrders = allOrders.filter((order) => {
    const buyerName = order.buyerName?.toLowerCase() || "";
    const userName = order.userOrdering?.name?.toLowerCase() || "";
    const userRole = order.userOrdering?.role?.toLowerCase() || "";

    const roleMatch = searchRole ? order.userOrdering?.role === searchRole : true;
    const dateMatch = searchDate
      ? new Date(order.createdAt).toISOString().slice(0, 10) === searchDate
      : true;

    return roleMatch && dateMatch;
  });

  return (
    <div>
      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3 justify-end items-center">
        {(role === "admin" || role === "staff") && (
          <input
            type="date"
            value={searchDate}
            placeholder="Search by date"
            className="border border-gray-300 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            onChange={(e) => setSearchDate(e.target.value)}
          />
        )}

        {role === "admin" && (
          <select
            value={searchRole}
            onChange={(e) => setSearchRole(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">All Roles</option>
            <option value="staff">Staff</option>
            <option value="customer">Customer</option>
          </select>
        )}

        {onClearAll && (
          <button
            onClick={onClearAll}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-1 rounded"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg shadow-md border">
        <table className="min-w-full text-left border-collapse">
          <thead className="bg-gray-200 text-gray-700 uppercase text-sm">
            <tr>
              <th className="p-3 border">#</th>
              {showBuyer && <th className="p-3 border">Buyer Name</th>}
              {showUser && <th className="p-3 border">User</th>}
              <th className="p-3 border">Products</th>
              <th className="p-3 border">Total</th>
              <th className="p-3 border">Payment</th>
              <th className="p-3 border">Status</th>
              <th className="p-3 border">Date</th>
              {showActions && <th className="p-3 border">Actions</th>}
            </tr>
          </thead>

          <tbody className="text-sm">
            {filteredOrders.map((order, i) => (
              <tr key={order._id} className="border-t hover:bg-gray-100 transition align-top">
                <td className="p-3">{i + 1}</td>
                {showBuyer && (
                  <td className="p-3 font-medium">{order.buyerName || "Unknown Buyer"}</td>
                )}
                {showUser && (
                  <td className="p-3">
                    {order.userOrdering
                      ? order.userOrdering.role === "staff"
                        ? `${order.userOrdering.name || "Unknown"} (${order.userOrdering.role})`
                        : order.userOrdering.role
                      : "Unknown User"}
                  </td>
                )}
                {/* Products with description */}
                <td className="p-3 align-top">
                  <ul className="space-y-2">
                    {order.productList?.map((item, idx) => (
                      <li key={idx} className="flex flex-col">
                        <span className="font-semibold text-gray-800">
                          {item.productId?.name || "Unnamed"}{" "}
                          <span className="text-gray-500 text-sm">
                            ({item.productId?.categoryId?.name || "No Category"})
                          </span>{" "}
                          ×{item.quantity || 1}
                        </span>
                        {item.productId?.description && (
                          <span className="text-gray-500 text-sm italic">
                            {item.productId.description}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </td>
                <td className="p-3 font-semibold text-green-700">
                  ₦{order.totalPrice?.toLocaleString()}
                </td>
                <td className="p-3">{order.paymentMethod}</td>
                <td className="p-3">
                  <b className="text-green-800">{order.deliveryStatus.toUpperCase()}</b>
                </td>
                <td className="p-3 text-gray-600">
                  {new Date(order.createdAt).toLocaleDateString()}
                </td>
                {showActions && (
                  <td className="p-3">
                    <button
                      onClick={() => onDelete(order._id)}
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded flex items-center gap-1"
                    >
                      <FaTrashAlt className="text-xs" /> Remove
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden mt-4 space-y-4">
        {filteredOrders.map((order, i) => (
          <div key={order._id} className="border border-gray-200 rounded-xl shadow-sm p-4 bg-white">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold text-gray-800">
                #{i + 1} — {order.buyerName}
              </h3>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  order.deliveryStatus === "pending"
                    ? "bg-yellow-100 text-yellow-800"
                    : order.deliveryStatus === "in transit"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-green-100 text-green-700"
                }`}
              >
                {order.deliveryStatus}
              </span>
            </div>

            {showUser && (
              <p>
                <span className="font-semibold">User:</span>{" "}
                {order.userOrdering
                  ? order.userOrdering.role === "staff"
                    ? `${order.userOrdering.name} (${order.userOrdering.role})`
                    : order.userOrdering.role
                  : "Unknown User"}
              </p>
            )}

            <div className="text-sm text-gray-700 space-y-1">
              <p className="font-semibold">Products:</p>
              <ul className="space-y-1">
                {order.productList?.map((item, idx) => (
                  <li key={idx} className="flex flex-col">
                    <span className="font-medium text-gray-800">
                      {item.productId?.name || "Unnamed"}{" "}
                      <span className="text-gray-500 text-xs">
                        ({item.productId?.categoryId?.name || "No Category"})
                      </span>{" "}
                      ×{item.quantity || 1}
                    </span>
                    {item.productId?.description && (
                      <span className="text-gray-500 text-xs italic">
                        {item.productId.description}
                      </span>
                    )}
                  </li>
                ))}
              </ul>

              <p>
                <span className="font-semibold">Payment:</span> {order.paymentMethod}
              </p>
              <p>
                <span className="font-semibold">Total:</span> ₦
                {order.totalPrice?.toLocaleString() || 0}
              </p>
              <p className="text-xs text-gray-400">
                {new Date(order.createdAt).toLocaleDateString()} •{" "}
                {new Date(order.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>

            {showActions && (
              <div className="mt-2">
                <button
                  onClick={() => onDelete(order._id)}
                  className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded flex items-center gap-1 w-full"
                >
                  <FaTrashAlt className="text-xs" /> Remove
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SharedOrderTable;
