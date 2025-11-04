import React from "react";

const PlacedOrdersTable = ({ orders, updateDeliveryStatus, updating }) => {
  // Calculate grand total
  const grandTotal = orders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);

  return (
    <div className="w-full bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold text-lg">
        Placed Orders
      </div>

      {/* Desktop View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full text-sm text-gray-700 border-collapse">
          <thead className="bg-gray-100 uppercase font-semibold text-gray-600">
            <tr>
              <th className="p-3 text-left">#</th>
              <th className="p-3 text-left">Buyer</th>
              <th className="p-3 text-left">Staff</th>
              <th className="p-3 text-left">Products</th>
              <th className="p-3 text-left">Total</th>
              <th className="p-3 text-left">Payment</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Date & Time</th>
              <th className="p-3 text-left">Action</th>
            </tr>
          </thead>

          <tbody>
            {orders.map((order, i) => (
              <tr
                key={order._id}
                className="border-t hover:bg-gray-50 transition duration-200 align-top"
              >
                <td className="p-3">{i + 1}</td>
                <td className="p-3 font-medium text-gray-800">{order.buyerName}</td>
                <td className="p-3">{order.userOrdering?.name || "Unknown"}</td>

                {/* Products */}
                <td className="p-3">
                  <ul className="space-y-3">
                    {order.productList?.map((item, idx) => (
                      <li key={idx} className="border-b border-gray-100 pb-2 last:border-none">
                        <p className="font-semibold text-gray-800">
                          {item?.productId?.name || "Unnamed"}{" "}
                          <span className="text-gray-500 text-sm">
                            ({item?.productId?.categoryId?.name || "No Category"})
                          </span>{" "}
                          ×{item?.quantity || 1}
                        </p>
                        {item?.productId?.description && (
                          <p className="text-gray-500 text-sm pl-3 italic">
                            {item.productId.description}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </td>

                <td className="p-3 font-semibold text-gray-800">
                  ₦{order.totalPrice?.toLocaleString() || 0}
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
                <td className="p-3 text-gray-600">
                  {new Date(order.createdAt).toLocaleDateString()}{" "}
                  <span className="text-xs text-gray-400">
                    {new Date(order.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </td>

                {/* Status dropdown only */}
                <td className="p-3">
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
                </td>
              </tr>
            ))}

            {/* Footer total */}
            <tr className="bg-gray-50 font-bold text-gray-800 border-t">
              <td colSpan="4" className="p-3 text-right">
                Grand Total:
              </td>
              <td className="p-3 text-indigo-600">₦{grandTotal.toLocaleString()}</td>
              <td colSpan="4"></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Mobile View */}
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

              <p className="font-semibold">Products:</p>
              <ul className="ml-3 space-y-2">
                {order.productList?.map((item, idx) => (
                  <li key={idx}>
                    <p className="font-medium text-gray-800">
                      {item?.productId?.name || "Unnamed"}{" "}
                      <span className="text-gray-500 text-xs">
                        ({item?.productId?.categoryId?.name || "No Category"})
                      </span>{" "}
                      ×{item?.quantity || 1}
                    </p>
                    {item?.productId?.description && (
                      <p className="text-gray-500 text-xs pl-3 italic">
                        {item.productId.description}
                      </p>
                    )}
                  </li>
                ))}
              </ul>

              <p>
                <span className="font-semibold">Payment:</span>{" "}
                {order.paymentMethod}
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

            <div className="mt-3">
              {updating && <span className="text-sm text-gray-500 ml-2">Updating...</span>}
              <select
                value={order.deliveryStatus}
                onChange={(e) =>
                  updateDeliveryStatus(order._id, e.target.value)
                }
                disabled={updating}
                className="border border-gray-300 rounded-lg px-2 py-1 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="pending">Pending</option>
                <option value="in transit">In Transit</option>
                <option value="delivered">Delivered</option>
              </select>
            </div>
          </div>
        ))}

        {/* Mobile grand total */}
        {orders.length > 0 && (
          <div className="text-center font-bold text-indigo-600 mt-4">
            Total of all orders: ₦{grandTotal.toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlacedOrdersTable;
