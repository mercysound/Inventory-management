import React from "react";
import { motion } from "framer-motion";
import { FiPlus, FiMinus, FiTrash2 } from "react-icons/fi";
import { FaImage } from "react-icons/fa";

const CustomerOrderTable = ({ orders, onIncrease, onReduce, onDelete }) => {
  if (!orders.length) {
    return (
      <div className="p-8 text-center text-gray-500 bg-white rounded-lg border border-dashed">
        Your cart is empty
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Desktop Table View */}
      <div className="hidden lg:block">
        <div className="overflow-hidden rounded-lg shadow-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white">
                <th className="px-4 py-3 text-left">Product Image</th>
                <th className="px-4 py-3 text-left">Product Details</th>
                <th className="px-4 py-3 text-center">Quantity</th>
                <th className="px-4 py-3 text-right">Unit Price</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {orders.map((order) => (
                <motion.tr
                  key={order._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-indigo-50 transition-colors"
                >
                  {/* Product Image */}
                  <td className="px-4 py-3">
                    <div className="w-20 h-20 rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-100 flex items-center justify-center flex-shrink-0 shadow-sm">
                      {order?.product?.image ? (
                        <img
                          src={order.product.image}
                          alt={order?.product?.name}
                          className="w-full h-full object-cover hover:scale-110 transition-transform"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-gray-400 text-xs">
                          <FaImage size={20} className="mb-1" />
                          <span>No Image</span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Product Details */}
                  <td className="px-4 py-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 text-base">
                        {order?.product?.name || "Unnamed Product"}
                      </h3>
                      {order?.product?.description && (
                        <details className="mt-1">
                          <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">
                            View Description
                          </summary>
                          <p className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                            {order.product.description}
                          </p>
                        </details>
                      )}
                    </div>
                  </td>

                  {/* Quantity */}
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full font-semibold">
                      {order.quantity}
                    </span>
                  </td>

                  {/* Unit Price */}
                  <td className="px-4 py-3 text-right font-semibold text-gray-800">
                    ₦{order.price?.toLocaleString()}
                  </td>

                  {/* Total */}
                  <td className="px-4 py-3 text-right font-bold text-indigo-600 text-lg">
                    ₦{(order.total || order.quantity * order.price).toLocaleString()}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <motion.button
                        onClick={() => onReduce(order._id)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        className="p-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-full transition shadow-md"
                        title="Reduce Quantity"
                      >
                        <FiMinus size={14} />
                      </motion.button>

                      <motion.button
                        onClick={() => onIncrease(order._id)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-full transition shadow-md"
                        title="Increase Quantity"
                      >
                        <FiPlus size={14} />
                      </motion.button>

                      <motion.button
                        onClick={() => onDelete(order._id)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-full transition shadow-md"
                        title="Remove Item"
                      >
                        <FiTrash2 size={14} />
                      </motion.button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile & Tablet Card View */}
      <div className="lg:hidden space-y-4">
        {orders.map((order, i) => (
          <motion.div
            key={order._id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg border border-gray-200 shadow-md overflow-hidden hover:shadow-lg transition-shadow"
          >
            {/* Card Header */}
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-gray-200">
              <span className="text-sm font-semibold text-indigo-600 bg-indigo-100 px-3 py-1 rounded-full">
                Item {i + 1}
              </span>
            </div>

            {/* Product Image */}
            <div className="p-4">
              <div className="w-full h-48 rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-100 flex items-center justify-center mb-4">
                {order?.product?.image ? (
                  <img
                    src={order.product.image}
                    alt={order?.product?.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-gray-400">
                    <FaImage size={40} className="mb-2" />
                    <span className="text-sm">No Image</span>
                  </div>
                )}
              </div>

              {/* Product Info */}
              <h3 className="font-bold text-lg text-gray-900 mb-2">
                {order?.product?.name || "Unnamed Product"}
              </h3>

              {order?.product?.description && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {order.product.description}
                </p>
              )}

              {/* Price Info */}
              <div className="bg-gray-50 rounded-lg p-3 mb-3 border border-gray-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Unit Price:</span>
                  <span className="font-semibold text-gray-800">₦{order.price?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-700">Total:</span>
                  <span className="text-lg font-bold text-indigo-600">
                    ₦{(order.total || order.quantity * order.price).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Quantity Controls */}
              <div className="flex items-center justify-between mb-3 bg-indigo-50 p-2 rounded-lg border border-indigo-200">
                <span className="text-sm font-medium text-gray-700">Quantity:</span>
                <div className="flex items-center gap-2">
                  <motion.button
                    onClick={() => onReduce(order._id)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-full transition"
                  >
                    <FiMinus size={12} />
                  </motion.button>
                  <span className="px-4 py-1 bg-white border border-indigo-200 rounded-full font-semibold text-indigo-600">
                    {order.quantity}
                  </span>
                  <motion.button
                    onClick={() => onIncrease(order._id)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-full transition"
                  >
                    <FiPlus size={12} />
                  </motion.button>
                </div>
              </div>

              {/* Delete Button */}
              <motion.button
                onClick={() => onDelete(order._id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full p-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
              >
                <FiTrash2 size={14} />
                Remove Item
              </motion.button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default CustomerOrderTable;
