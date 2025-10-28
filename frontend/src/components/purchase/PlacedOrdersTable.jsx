import React from "react";
import { FaTrashAlt } from "react-icons/fa";

const PlacedOrdersTable = ({ orders, updateDeliveryStatus, deleteOrder, updating }) => {
  return (
    <div className="w-full bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold text-lg">
        Placed Orders
      </div>

      {/* Desktop / Tablet View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full text-sm text-gray-700">
          <thead className="bg-gray-100 uppercase font-semibold text-gray-600">
            <tr>
              <th className="p-3 text-left">#</th>
              <th className="p-3 text-left">Buyer</th>
              <th className="p-3 text-left">USER</th>
              <th className="p-3 text-left">Products</th>
              <th className="p-3 text-left">Total</th>
              <th className="p-3 text-left">Payment</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order, i) => (
              <tr
                key={order._id}
                className="border-t hover:bg-gray-50 transition duration-200"
              >
                <td className="p-3">{i + 1}</td>
                <td className="p-3">{order.buyerName}</td>
                <td className="p-3">{order.userOrdering?.name || "Unknown"}</td>
                <td className="p-3 truncate max-w-[250px]">
                  {order.productList.join(", ")}
                </td>
                <td className="p-3 font-semibold text-gray-800">
                  ₦{order.totalPrice.toLocaleString()}
                </td>
                <td className="p-3">{order.paymentMethod}</td>
                <td className="p-3">
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
                </td>
                <td className="p-3 flex items-center gap-2">
                  <select
                    value={order.deliveryStatus}
                    onChange={(e) =>
                      updateDeliveryStatus(order._id, e.target.value)
                    }
                    disabled={updating}
                    className="border border-gray-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    <option value="pending">Pending</option>
                    <option value="in transit">In Transit</option>
                    <option value="delivered">Delivered</option>
                  </select>

                  <button
                    onClick={() => deleteOrder(order._id)}
                    disabled={updating}
                    className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg transition"
                    title="Delete Order"
                  >
                    <FaTrashAlt className="text-xs" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile View (Cards) */}
      <div className="md:hidden p-3 space-y-4">
        {orders.map((order, i) => (
          <div
            key={order._id}
            className="border border-gray-200 rounded-xl shadow-sm p-4 bg-white"
          >
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

            <div className="text-sm text-gray-700 space-y-1">
              <p>
                <span className="font-semibold">Staff:</span>{" "}
                {order.userOrdering?.name || "Unknown"}
              </p>
              <p>
                <span className="font-semibold">Products:</span>{" "}
                {order.productList.join(", ")}
              </p>
              <p>
                <span className="font-semibold">Payment:</span>{" "}
                {order.paymentMethod}
              </p>
              <p>
                <span className="font-semibold">Total:</span>{" "}
                ₦{order.totalPrice.toLocaleString()}
              </p>
            </div>

            <div className="mt-3 flex justify-between items-center">
              <select
                value={order.deliveryStatus}
                onChange={(e) =>
                  updateDeliveryStatus(order._id, e.target.value)
                }
                disabled={updating}
                className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="pending">Pending</option>
                <option value="in transit">In Transit</option>
                <option value="delivered">Delivered</option>
              </select>

              <button
                onClick={() => deleteOrder(order._id)}
                disabled={updating}
                className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg transition"
              >
                <FaTrashAlt className="text-xs" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {orders.length === 0 && (
        <div className="text-center text-gray-500 py-10">
          <p className="text-base sm:text-lg">No orders found 😕</p>
        </div>
      )}
    </div>
  );
};

export default PlacedOrdersTable;
