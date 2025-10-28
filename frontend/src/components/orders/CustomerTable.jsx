import React from "react";

const CustomerTable = ({
  orders = [],
  onIncreaseQty,
  onReduceQty,
  onRemoveOrder,
  onClearAll,
}) => {
  if (!orders.length)
    return <p className="text-center text-gray-500">No orders found.</p>;

  const grandTotal = orders.reduce(
    (sum, order) => sum + (order.totalPrice ?? order.quantity * order.price),
    0
  );

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full border-collapse text-sm text-gray-700">
        <thead className="bg-indigo-600 text-white">
          <tr>
            <th className="py-2 px-3 text-left">#</th>
            <th className="py-2 px-3 text-left">Product</th>
            <th className="py-2 px-3 text-left">Description</th>
            <th className="py-2 px-3 text-center">Quantity</th>
            <th className="py-2 px-3 text-left">Price</th>
            <th className="py-2 px-3 text-left">Total</th>
            <th className="py-2 px-3 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order, index) => (
            <tr
              key={order._id}
              className={`${index % 2 === 0 ? "bg-gray-50" : "bg-white"} border-b`}
            >
              <td className="py-2 px-3">{index + 1}</td>
              <td className="py-2 px-3 capitalize">
                {order.product?.name || order.productId?.name || "N/A"}
              </td>
              <td className="py-2 px-3 capitalize">
                {order.product?.description || "N/A"}
              </td>
              <td className="py-2 px-3 text-center">{order.quantity}</td>
              <td className="py-2 px-3">₦{order.price.toLocaleString()}</td>
              <td className="py-2 px-3">
                ₦{(order.totalPrice ?? order.quantity * order.price).toLocaleString()}
              </td>
              <td className="py-2 px-3 text-center space-x-2">
                <button
                  onClick={() => onReduceQty(order._id)}
                  className="px-2 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded-md text-xs"
                >
                  −
                </button>
                <button
                  onClick={() => onIncreaseQty(order._id)}
                  className="px-2 py-1 bg-green-500 hover:bg-green-600 text-white rounded-md text-xs"
                >
                  +
                </button>
                <button
                  onClick={() => onRemoveOrder(order._id)}
                  className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-between items-center bg-gray-100 px-6 py-3 border-t border-gray-300">
        <button
          onClick={onClearAll}
          className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-md text-sm"
        >
          Clear All Orders
        </button>
        <div className="flex items-center gap-3">
          <span className="text-gray-800 font-semibold text-base">Grand Total:</span>
          <span className="text-indigo-700 font-bold text-lg">
            ₦{grandTotal.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
};

export default CustomerTable;
