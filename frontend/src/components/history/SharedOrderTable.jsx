import React from "react";
import { FaTrashAlt } from "react-icons/fa";

const SharedOrderTable = ({ orders, role, onDelete }) => {
  if (orders.length === 0)
    return (
      <p className="text-gray-500 text-center py-10">
        No completed orders found
      </p>
    );

  // COLUMN RULES
  const showBuyer = role === "admin" || role === "staff"; // customer won't see "Buyer Name"
  const showUser = role === "admin"; // only admin sees user column
  const showActions = true;

  return (
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
            <th className="p-3 border">Date</th>

            {showActions && <th className="p-3 border">Actions</th>}
          </tr>
        </thead>

        <tbody className="text-sm">
          {orders.map((order, i) => (
            <tr
              key={order._id}
              className="border-t hover:bg-gray-100 transition"
            >
              <td className="p-3">{i + 1}</td>

              {showBuyer && (
                <td className="p-3 font-medium">
                  {order.buyerName || "Unknown Buyer"}
                </td>
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

              <td className="p-3">
                <ul className="space-y-1">
                  {order.productList?.map((item, idx) => (
                    <li key={idx}>
                      <span className="font-medium">
                        {item.productId?.name || "Unnamed"}
                      </span>{" "}
                      (
                      {item.productId?.categoryId?.name || "No Category"}) ×{" "}
                      {item.quantity || 1}
                    </li>
                  ))}
                </ul>
              </td>

              <td className="p-3 font-semibold text-green-700">
                ₦{order.totalPrice?.toLocaleString()}
              </td>

              <td className="p-3">{order.paymentMethod}</td>

              <td className="p-3 text-gray-600">
                {new Date(order.createdAt).toLocaleDateString()}
              </td>

              <td className="p-3">
                <button
                  onClick={() => onDelete(order._id)}
                  className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded flex items-center gap-1"
                >
                  <FaTrashAlt className="text-xs" /> Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SharedOrderTable;
