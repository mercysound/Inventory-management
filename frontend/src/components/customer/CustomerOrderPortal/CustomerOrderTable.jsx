import React from "react";
import { FiPlus, FiMinus, FiTrash2 } from "react-icons/fi";

const CustomerOrderTable = ({ orders, onIncrease, onReduce, onDelete }) => {
  return (
    <div className="overflow-x-auto bg-white shadow-md rounded-lg">
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
  );
};

export default CustomerOrderTable;
