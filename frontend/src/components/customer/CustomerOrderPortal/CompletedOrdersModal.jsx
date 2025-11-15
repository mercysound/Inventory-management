import React, { useEffect, useState } from "react";
import axiosInstance from "../../../utils/axiosInstance";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import SkeletonLoader from "../../common/SkeletonLoader";

const CompletedOrdersModal = ({ isOpen, onClose }) => {
  const [completedOrders, setCompletedOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) fetchCompletedOrders();
  }, [isOpen]);

  const fetchCompletedOrders = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/placed-orders");
      if (res.data.success) {
        setCompletedOrders(res.data.orders || []);
      }
    } catch {
      toast.error("Failed to fetch completed orders");
    } finally {
      setLoading(false);
    }
  };

  const grandTotal = completedOrders.reduce(
    (sum, o) => sum + (o.totalPrice || 0),
    0
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center z-50 
                     bg-gradient-to-br from-black/30 via-gray-800/30 to-gray-900/30 
                     backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto 
                       bg-white/25 backdrop-blur-2xl border border-white/30
                       rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.3)] p-7"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-5 right-5 bg-white/30 hover:bg-white/50 
                         p-2 rounded-full transition shadow-sm"
            >
              <X size={20} className="text-gray-700" />
            </button>

            {/* Title */}
            <div className="flex justify-between items-center mb-6 border-b border-white/30 pb-3 pr-10">
              <h3 className="text-2xl font-bold text-white tracking-wide">
                Completed Orders
              </h3>
              <div className="text-sm text-gray-100 bg-white/15 px-4 py-1.5 rounded-lg border border-white/20 shadow-sm ml-3">
                Total Orders: {completedOrders.length}
              </div>
            </div>

            {/* Loader or table */}
            {loading ? (
              <SkeletonLoader rows={6} />
            ) : completedOrders.length === 0 ? (
              <p className="text-center text-gray-200 py-10 text-lg">
                No completed/delivered orders yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-gray-100 border-collapse">
                  <thead className="bg-white/10 text-gray-200 uppercase text-xs">
                    <tr>
                      <th className="p-3 text-left">#</th>
                      <th className="p-3 text-left">User</th>
                      <th className="p-3 text-left">Products</th>
                      <th className="p-3 text-left">Total</th>
                      <th className="p-3 text-left">Payment</th>
                      <th className="p-3 text-left">Status</th>
                      <th className="p-3 text-left">Date & Time</th>
                    </tr>
                  </thead>

                  <tbody>
                    {completedOrders.map((order, i) => (
                      <tr
                        key={order._id}
                        className="border-t border-white/20 hover:bg-white/10 transition duration-200"
                      >
                        <td className="p-3">{i + 1}</td>
                        <td className="p-3">
                          {order.userOrdering?.name || "Unknown"}
                        </td>

                        {/* Products */}
                        <td className="p-3">
                          <ul className="space-y-2">
                            {order.productList?.map((item, idx) => (
                              <li
                                key={idx}
                                className="border-b border-white/10 pb-2 last:border-none"
                              >
                                <p className="font-medium text-gray-100">
                                  {item?.productId?.name || "Unnamed"}{" "}
                                  <span className="text-gray-300 text-xs">
                                    ({item?.productId?.categoryId?.name ||
                                      "No Category"}
                                    )
                                  </span>{" "}
                                  ×{item?.quantity || 1}
                                </p>
                                {item?.productId?.description && (
                                  <p className="text-gray-400 text-xs italic pl-3">
                                    {item.productId.description}
                                  </p>
                                )}
                              </li>
                            ))}
                          </ul>
                        </td>

                        <td className="p-3 font-bold text-indigo-200">
                          ₦{order.totalPrice?.toLocaleString() || 0}
                        </td>
                        <td className="p-3">{order.paymentMethod}</td>

                        <td className="p-3">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              order.deliveryStatus === "pending"
                                ? "bg-yellow-100/30 text-yellow-200"
                                : order.deliveryStatus === "in transit"
                                ? "bg-blue-100/30 text-blue-200"
                                : "bg-green-100/30 text-green-200"
                            }`}
                          >
                            {order.deliveryStatus}
                          </span>
                        </td>

                        <td className="p-3 text-gray-300">
                          {new Date(order.createdAt).toLocaleDateString()}{" "}
                          <span className="text-xs text-gray-400">
                            {new Date(order.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </td>
                      </tr>
                    ))}

                    {/* Footer total */}
                    <tr className="bg-white/10 font-bold text-indigo-100 border-t border-white/20">
                      <td colSpan="4" className="p-3 text-right">
                        Grand Total:
                      </td>
                      <td className="p-3 text-indigo-200 text-lg">
                        ₦{grandTotal.toLocaleString()}
                      </td>
                      <td colSpan="3"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CompletedOrdersModal;
