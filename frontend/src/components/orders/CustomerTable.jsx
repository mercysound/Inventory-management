import React from "react";
import { FaPlus, FaMinus, FaTrash } from "react-icons/fa";

const CustomerTable = ({
  orders = [],
  onIncreaseQty,
  onReduceQty,
  onRemoveOrder,
  onClearAll,
}) => {
  if (!orders.length)
    return (
      <p className="text-center text-gray-500 italic py-10">
        No orders found.
      </p>
    );

  const grandTotal = orders.reduce(
    (sum, order) => sum + (order.totalPrice ?? order.quantity * order.price),
    0
  );

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white/60 backdrop-blur-sm">
      <table className="min-w-full border-collapse text-sm text-gray-700">
        <thead className="bg-indigo-600 text-white">
          <tr>
            <th className="py-2 px-3 text-left">#</th>
            <th className="py-2 px-3 text-left">Product</th>
            <th className="py-2 px-3 text-left">Description</th>
            <th className="py-2 px-3 text-center">Qty</th>
            <th className="py-2 px-3 text-left">Price</th>
            <th className="py-2 px-3 text-left">Total</th>
            <th className="py-2 px-3 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order, i) => (
            <tr
              key={order._id}
              className={`${
                i % 2 === 0 ? "bg-gray-50" : "bg-white"
              } hover:bg-indigo-50 transition`}
            >
              <td className="py-2 px-3">{i + 1}</td>
              <td className="py-2 px-3 capitalize">
                {order.product?.name || "N/A"}
              </td>
              <td className="py-2 px-3">{order.product?.description || "—"}</td>
              <td className="py-2 px-3 text-center">{order.quantity}</td>
              <td className="py-2 px-3">₦{order.price.toLocaleString()}</td>
              <td className="py-2 px-3 font-semibold">
                ₦{(order.totalPrice ?? order.quantity * order.price).toLocaleString()}
              </td>
              <td className="py-2 px-3 text-center space-x-2">
                <button
                  onClick={() => onReduceQty(order._id)}
                  className="p-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-full text-xs"
                >
                  <FaMinus />
                </button>
                <button
                  onClick={() => onIncreaseQty(order._id)}
                  className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-full text-xs"
                >
                  <FaPlus />
                </button>
                <button
                  onClick={() => onRemoveOrder(order._id)}
                  className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-full text-xs"
                >
                  <FaTrash />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-between items-center bg-gray-100 px-6 py-3 rounded-b-xl">
        <button
          onClick={onClearAll}
          className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-md text-sm"
        >
          Clear All
        </button>
        <div className="flex items-center gap-3">
          <span className="text-gray-800 font-semibold text-base">
            Grand Total:
          </span>
          <span className="text-indigo-700 font-bold text-lg">
            ₦{grandTotal.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
};

export default CustomerTable;
