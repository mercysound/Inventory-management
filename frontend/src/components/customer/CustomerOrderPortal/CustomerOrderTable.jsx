import React from "react";
import { FiPlus, FiMinus, FiTrash2 } from "react-icons/fi";

const CustomerOrderTable = ({ orders, onIncrease, onReduce, onDelete }) => {
  return (
    <div className="bg-white shadow-md rounded-lg">
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="bg-gray-100 text-gray-700 uppercase text-xs">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Quantity</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr
                key={order._id}
                className="border-t hover:bg-gray-50 transition duration-150"
              >
                <td className="px-4 py-3 font-medium text-gray-900">
                  {order?.product?.name || "Unnamed Product"}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {order?.product?.description || "No description"}
                </td>
                <td className="px-4 py-3 text-center">{order.quantity}</td>
                <td className="px-4 py-3">₦{order.price?.toLocaleString()}</td>
                <td className="px-4 py-3 font-semibold text-gray-800">
                  ₦{(order.total || 0).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-center flex justify-center gap-2">
                  <button
                    onClick={() => onReduce(order._id)}
                    className="p-2 bg-gray-200 rounded hover:bg-gray-300 transition"
                  >
                    <FiMinus size={16} />
                  </button>
                  <button
                    onClick={() => onIncrease(order._id)}
                    className="p-2 bg-gray-200 rounded hover:bg-gray-300 transition"
                  >
                    <FiPlus size={16} />
                  </button>
                  <button
                    onClick={() => onDelete(order._id)}
                    className="p-2 bg-red-100 text-red-600 rounded hover:bg-red-200 transition"
                  >
                    <FiTrash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden p-4 space-y-4">
        {orders.map((order) => (
          <div
            key={order._id}
            className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg text-gray-800 truncate">
                  {order?.product?.name || "Unnamed Product"}
                </h3>
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                  {order?.product?.description || "No description"}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm">
                <p className="text-gray-600">Price: ₦{order.price?.toLocaleString()}</p>
                <p className="font-semibold text-gray-800">Total: ₦{(order.total || 0).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onReduce(order._id)}
                  className="p-2 bg-gray-200 rounded hover:bg-gray-300 transition"
                >
                  <FiMinus size={16} />
                </button>
                <span className="px-3 py-1 bg-gray-100 rounded text-sm font-medium">
                  {order.quantity}
                </span>
                <button
                  onClick={() => onIncrease(order._id)}
                  className="p-2 bg-gray-200 rounded hover:bg-gray-300 transition"
                >
                  <FiPlus size={16} />
                </button>
              </div>
            </div>
            <button
              onClick={() => onDelete(order._id)}
              className="w-full flex items-center justify-center gap-2 p-2 bg-red-100 text-red-600 rounded hover:bg-red-200 transition"
            >
              <FiTrash2 size={16} />
              Remove Item
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CustomerOrderTable;
