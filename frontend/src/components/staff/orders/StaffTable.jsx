import React from "react";
import { motion } from "framer-motion";
import { FaPlus, FaMinus, FaTrash, FaImage } from "react-icons/fa";

const StaffTable = ({
  orders,
  loading,
  onIncreaseQty,
  onReduceQty,
  onRemoveOrder,
}) => {
  if (loading) {
    return <div className="p-8 text-center text-slate-300">Loading orders...</div>;
  }

  if (!orders.length) {
    return (
      <div className="p-8 text-center text-slate-300 bg-slate-950 rounded-lg border border-dashed border-slate-800">
        No orders in cart yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Desktop View */}
      <div className="hidden lg:block">
        <div className="overflow-hidden rounded-lg shadow-lg border border-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-slate-800 to-slate-900 text-white">
                <th className="p-4 text-left">#</th>
                <th className="p-4 text-left">Product Image</th>
                <th className="p-4 text-left">Product Details</th>
                <th className="p-4 text-center">Quantity</th>
                <th className="p-4 text-right">Unit Price</th>
                <th className="p-4 text-right">Total</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-950">
              {orders.map((o, i) => (
                <motion.tr key={o._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-slate-900 transition-colors">
                  <td className="p-4 font-semibold text-slate-200">{i + 1}</td>

                  <td className="p-4">
                    <div className="w-20 h-20 rounded-lg overflow-hidden border-2 border-slate-700 bg-slate-900 flex items-center justify-center flex-shrink-0 shadow-sm">
                      {o.product?.image ? (
                        <img src={o.product.image} alt={o.product?.name} className="w-full h-full object-cover hover:scale-110 transition-transform" />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-500 text-xs">
                          <FaImage size={24} className="mb-1" />
                          <span>No Image</span>
                        </div>
                      )}
                    </div>
                  </td>

                  <td className="p-4">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-100 text-base">{o.product?.name || "Unknown Product"}</h3>
                      {o.product?.description && (
                        <details className="mt-1">
                          <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-200">View Description</summary>
                          <p className="mt-2 text-xs text-slate-400 bg-slate-900 p-2 rounded">{o.product.description}</p>
                        </details>
                      )}
                    </div>
                  </td>

                  <td className="p-4 text-center">
                    <span className="inline-flex items-center justify-center px-3 py-1 bg-indigo-600 text-white rounded-full font-semibold">
                      {o.quantity}
                    </span>
                  </td>

                  <td className="p-4 text-right font-semibold text-slate-100">₦{o.price?.toLocaleString()}</td>

                  <td className="p-4 text-right font-bold text-indigo-300 text-lg">
                    ₦{(o.totalPrice || o.quantity * o.price).toLocaleString()}
                  </td>

                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      <motion.button onClick={() => onReduceQty(o._id)} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} className="p-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-full transition shadow-md" title="Reduce Quantity">
                        <FaMinus size={14} />
                      </motion.button>
                      <motion.button onClick={() => onIncreaseQty(o._id)} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-full transition shadow-md" title="Increase Quantity">
                        <FaPlus size={14} />
                      </motion.button>
                      <motion.button onClick={() => onRemoveOrder(o._id)} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-full transition shadow-md" title="Remove Item">
                        <FaTrash size={14} />
                      </motion.button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile View */}
      <div className="lg:hidden space-y-4">
        {orders.map((o, i) => (
          <motion.div key={o._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-950 rounded-lg border border-slate-800 shadow-md overflow-hidden hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-800">
              <span className="text-sm font-semibold text-slate-100 bg-slate-900 px-3 py-1 rounded-full">Item {i + 1}</span>
            </div>
            <div className="p-4">
              <div className="w-full h-40 rounded-lg overflow-hidden border-2 border-slate-700 bg-slate-900 flex items-center justify-center mb-4">
                {o.product?.image ? (
                  <img src={o.product.image} alt={o.product?.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-500">
                    <FaImage size={32} className="mb-2" />
                    <span className="text-sm">No Image</span>
                  </div>
                )}
              </div>
              <h3 className="font-bold text-lg text-slate-100 mb-2">{o.product?.name || "Unknown Product"}</h3>
              {o.product?.description && (
                <p className="text-sm text-slate-400 mb-3 line-clamp-2">{o.product.description}</p>
              )}
              <div className="bg-slate-900 rounded-lg p-3 mb-3 border border-slate-800">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-slate-400">Unit Price:</span>
                  <span className="font-semibold text-slate-100">₦{o.price?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-slate-200">Total:</span>
                  <span className="text-lg font-bold text-indigo-300">₦{(o.totalPrice || o.quantity * o.price).toLocaleString()}</span>
                </div>
              </div>
              <div className="flex items-center justify-between mb-3 bg-slate-900 p-2 rounded-lg border border-slate-800">
                <span className="text-sm font-medium text-slate-200">Quantity:</span>
                <div className="flex items-center gap-2">
                  <motion.button onClick={() => onReduceQty(o._id)} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} className="p-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-full transition">
                    <FaMinus size={12} />
                  </motion.button>
                  <span className="px-4 py-1 bg-slate-950 border border-slate-700 rounded-full font-semibold text-indigo-300">{o.quantity}</span>
                  <motion.button onClick={() => onIncreaseQty(o._id)} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-full transition">
                    <FaPlus size={12} />
                  </motion.button>
                </div>
              </div>
              <motion.button onClick={() => onRemoveOrder(o._id)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full p-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition flex items-center justify-center gap-2">
                <FaTrash size={14} />
                Remove Item
              </motion.button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default StaffTable;