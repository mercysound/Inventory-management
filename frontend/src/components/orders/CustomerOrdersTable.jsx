import React from "react";

const CustomerOrdersTable = ({ orders }) => {
  if (orders.length === 0) {
    return <div className="text-center py-4 text-gray-500">No records</div>;
  }

  return (
    <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
      <table className="min-w-full border-collapse text-sm sm:text-base">
        <thead className="bg-gray-200 text-gray-700">
          <tr>
            <th className="border border-gray-300 p-2">S/N</th>
            <th className="border border-gray-300 p-2">Product</th>
            <th className="border border-gray-300 p-2">Category</th>
            <th className="border border-gray-300 p-2">Qty</th>
            <th className="border border-gray-300 p-2">Total</th>
            <th className="border border-gray-300 p-2 hidden sm:table-cell">
              Description
            </th>
            <th className="border border-gray-300 p-2">Date</th>
            {/* <th className="border border-gray-300 p-2">Transaction By</th> */}
          </tr>
        </thead>

        <tbody>
          {orders.map((order, index) => (
            <tr
              key={order._id}
              className="hover:bg-gray-50 even:bg-gray-100 transition-colors"
            >
              <td className="border border-gray-300 p-2 text-center">
                {index + 1}
              </td>

              <td className="border border-gray-300 p-2 whitespace-nowrap">
                {order.product?.name}
              </td>

              <td className="border border-gray-300 p-2 whitespace-nowrap">
                {order.product?.categoryId?.name}
              </td>

              <td className="border border-gray-300 p-2 text-center">
                {order.quantity}
              </td>

              <td className="border border-gray-300 p-2 whitespace-nowrap">
                ₦{order.totalPrice.toLocaleString()}
              </td>

              {/* Hide description on very small screens */}
              <td className="border border-gray-300 p-2 hidden sm:table-cell truncate max-w-[200px]">
                {order.product?.description}
              </td>

              <td className="border border-gray-300 p-2 text-xs sm:text-sm whitespace-nowrap text-center">
                <div className="flex flex-col items-center">
                  <span>{new Date(order.orderDate).toLocaleDateString()}</span>
                  <span className="text-gray-500">
                    {new Date(order.orderDate).toLocaleTimeString()}
                  </span>
                </div>
              </td>

              {/* <td className="border border-gray-300 p-2 text-xs sm:text-sm">
                <p className="font-medium">{order.userOrdering?.name}</p>
                <p className="text-gray-500 italic">
                  {order.userOrdering?.role}
                </p>
              </td> */}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CustomerOrdersTable;
