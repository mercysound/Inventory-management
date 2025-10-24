import React from "react";

const CustomerTable = ({ orders }) => {
  if (!orders || orders.length === 0)
    return <p className="text-center text-gray-500">No orders available.</p>;

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm text-gray-700">
        <thead className="bg-indigo-50 text-indigo-700 font-semibold">
          <tr>
            <th className="px-4 py-2 text-left">#</th>
            <th className="px-4 py-2 text-left">Product</th>
            <th className="px-4 py-2 text-left">Category</th>
            <th className="px-4 py-2 text-right">Quantity</th>
            <th className="px-4 py-2 text-right">Unit Price (₦)</th>
            <th className="px-4 py-2 text-right">Total (₦)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {orders.map((order, idx) => (
            <tr key={order._id || idx} className="hover:bg-gray-50">
              <td className="px-4 py-2">{idx + 1}</td>
              <td className="px-4 py-2">{order.product?.name || "—"}</td>
              <td className="px-4 py-2">
                {order.product?.categoryId?.name || "—"}
              </td>
              <td className="px-4 py-2 text-right">{order.quantity}</td>
              <td className="px-4 py-2 text-right">{order.price?.toLocaleString()}</td>
              <td className="px-4 py-2 text-right">
                {order.totalPrice?.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CustomerTable;
