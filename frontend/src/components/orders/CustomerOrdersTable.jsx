import React from "react";

const CustomerOrdersTable = ({ orders }) => {
  return (
    <div className="overflow-x-auto">
      {orders.length === 0 ? (
        <div className="text-center py-4 text-gray-500">No records</div>
      ) : (
        <table className="w-full border-collapse border border-gray-200">
          <thead>
            <tr className="bg-gray-200">
              <th className="border border-gray-300 p-2">S/N</th>
              <th className="border border-gray-300 p-2">Product Name</th>
              <th className="border border-gray-300 p-2">Category Name</th>
              <th className="border border-gray-300 p-2">Quantity</th>
              <th className="border border-gray-300 p-2">Total Price</th>
              <th className="border border-gray-300 p-2">Description</th>
              <th className="border border-gray-300 p-2">Date</th>
              <th className="border border-gray-300 p-2">Time</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order, index) => (
              <tr key={order._id}>
                <td className="border border-gray-300 p-2">{index + 1}</td>
                <td className="border border-gray-300 p-2">
                  {order.product?.name}
                </td>
                <td className="border border-gray-300 p-2">
                  {order.product?.categoryId?.name}
                </td>
                <td className="border border-gray-300 p-2">{order.quantity}</td>
                <td className="border border-gray-300 p-2">
                  ₦{order.totalPrice}
                </td>
                <td className="border border-gray-300 p-2">
                  {order.product?.description}
                </td>
                <td className="border border-gray-300 p-2">
                  {new Date(order.orderDate).toLocaleDateString()}
                </td>
                <td className="border border-gray-300 p-2">
                  {new Date(order.orderDate).toLocaleTimeString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default CustomerOrdersTable;
