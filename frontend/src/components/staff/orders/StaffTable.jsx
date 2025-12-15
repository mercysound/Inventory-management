import React from "react";
import { FaPlus, FaMinus, FaTrash } from "react-icons/fa";

const StaffTable = ({
  orders,
  loading,
  onIncreaseQty,
  onReduceQty,
  onDeleteOrder,
}) => {
  if (loading) {
    return (
      <div className="p-6 text-center text-gray-500">Loading orders...</div>
    );
  }

  if (!orders.length) {
    return (
      <div className="p-6 text-center text-gray-500">No orders found.</div>
    );
  }

  return (
    <div className="overflow-x-auto border rounded-xl shadow-sm bg-white">
      <table className="min-w-full text-sm md:text-base">
        <thead className="bg-indigo-600 text-white">
          <tr>
            <th className="p-3 text-left">#</th>
            <th className="p-3 text-left">Product</th>
            <th className="p-3 text-left">Description</th>
            <th className="p-3 text-center">Qty</th>
            <th className="p-3 text-left">Price</th>
            <th className="p-3 text-left">Total</th>
            <th className="p-3 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o, i) => (
            <tr
              key={o._id}
              className={`${
                i % 2 === 0 ? "bg-gray-50" : "bg-white"
              } hover:bg-indigo-50 transition`}
            >
              <td className="p-3">{i + 1}</td>
              <td className="p-3 font-medium">{o.product?.name}</td>
              <td className="p-3">{o.product?.description || "—"}</td>
              <td className="p-3 text-center">{o.quantity}</td>
              <td className="p-3">₦{o.price.toLocaleString()}</td>
              <td className="p-3 font-semibold">
                ₦{(o.totalPrice || o.quantity * o.price).toLocaleString()}
              </td>
              <td className="p-3 text-center space-x-1">
                <button
                  onClick={() => onReduceQty(o._id)}
                  className="p-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-full text-xs md:text-sm"
                >
                  <FaMinus />
                </button>
                <button
                  onClick={() => onIncreaseQty(o._id)}
                  className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-full text-xs md:text-sm"
                >
                  <FaPlus />
                </button>
                <button
                  onClick={() => onDeleteOrder(o._id)}
                  className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-full text-xs md:text-sm"
                >
                  <FaTrash />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default StaffTable;
