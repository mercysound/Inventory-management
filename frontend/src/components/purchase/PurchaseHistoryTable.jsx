import React from "react";

const PurchaseHistoryTable = ({ history, onClearDate }) => {
  return (
    <div className="flex flex-col gap-6">
      {history.map((day) => (
        <div
          key={day._id}
          className="bg-white rounded-xl shadow-md p-4 border border-gray-100"
        >
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold text-lg">
              {day._id} — {day.totalOrders} orders • ₦
              {day.totalRevenue.toLocaleString()}
            </h2>
            <button
              onClick={() => onClearDate(day._id)}
              className="text-red-600 border border-red-500 px-3 py-1 text-xs rounded-md hover:bg-red-50"
            >
              Clear Day
            </button>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border">Product</th>
                  <th className="p-2 border">Category</th>
                  <th className="p-2 border">Qty</th>
                  <th className="p-2 border">Total</th>
                  <th className="p-2 border">By</th>
                </tr>
              </thead>
              <tbody>
                {day.orders.map((o) => (
                  <tr key={o._id} className="text-center hover:bg-gray-50">
                    <td className="p-2 border">{o.product}</td>
                    <td className="p-2 border">{o.category}</td>
                    <td className="p-2 border">{o.quantity}</td>
                    <td className="p-2 border">₦{o.totalPrice}</td>
                    <td className="p-2 border">{o.orderedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="grid gap-3 md:hidden">
            {day.orders.map((o) => (
              <div
                key={o._id}
                className="border rounded-lg p-3 shadow-sm bg-gray-50"
              >
                <div className="flex justify-between text-sm font-semibold">
                  <span>{o.product}</span>
                  <span>₦{o.totalPrice}</span>
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  <p>Qty: {o.quantity}</p>
                  <p>Category: {o.category}</p>
                  <p>By: {o.orderedBy}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default PurchaseHistoryTable;
