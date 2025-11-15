import React from "react";
import { motion } from "framer-motion";
import { FiX } from "react-icons/fi";

const PendingOrdersModal = ({ isOpen, onClose, pendingOrders }) => {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-600 hover:text-red-500"
        >
          <FiX size={20} />
        </button>

        <h2 className="text-xl font-semibold mb-4 text-gray-800">
          Pending / In Transit Orders
        </h2>

        {pendingOrders.length === 0 ? (
          <p className="text-gray-600 text-center py-8">
            No pending or in-transit orders.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-100 text-gray-700 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Qty</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {pendingOrders.map((order) => (
                  <tr
                    key={order._id}
                    className="border-t hover:bg-gray-50 transition"
                  >
                    <td className="px-4 py-3">{order?.product?.name}</td>
                    <td className="px-4 py-3">{order?.quantity}</td>
                    <td className="px-4 py-3">₦{order?.price?.toLocaleString()}</td>
                    <td className="px-4 py-3 font-semibold">
                      ₦{order?.total?.toLocaleString()}
                    </td>
                    <td
                      className={`px-4 py-3 font-medium ${
                        order.status === "in_transit"
                          ? "text-yellow-600"
                          : order.status === "pending"
                          ? "text-orange-500"
                          : "text-green-600"
                      }`}
                    >
                      {order.status}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default PendingOrdersModal;
