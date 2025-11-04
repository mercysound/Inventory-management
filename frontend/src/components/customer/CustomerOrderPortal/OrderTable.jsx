// src/components/customer/OrderTable.jsx
import React from "react";

const OrderTable = ({ orders }) => (
  <div className="overflow-x-auto rounded-lg shadow-md bg-white dark:bg-gray-900">
    <table className="w-full border-collapse text-sm md:text-base">
      <thead>
        <tr className="bg-gray-800 text-white">
          <th className="p-3 text-left">Product</th>
          <th className="p-3">Description</th>
          <th className="p-3">Quantity</th>
          <th className="p-3">Price</th>
          <th className="p-3">Total</th>
          <th className="p-3">Status</th>
        </tr>
      </thead>
      <tbody>
        {orders.map((o) => (
          <tr
            key={o._id}
            className="border-b hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <td className="p-3">{o.product?.name}</td>
            <td className="p-3 truncate max-w-[200px]">{o.product?.description}</td>
            <td className="p-3 text-center">{o.quantity}</td>
            <td className="p-3 text-center">₦{o.price.toLocaleString()}</td>
            <td className="p-3 text-center">
              ₦{o.totalPrice.toLocaleString()}
            </td>
            <td className="p-3 text-center">
              {o.paymentStatus || "Pending"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default OrderTable;
