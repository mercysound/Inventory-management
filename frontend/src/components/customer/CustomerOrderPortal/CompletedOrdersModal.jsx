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
          bg-gradient-to-br from-purple-200/40 via-blue-200/40 to-pink-200/40
          backdrop-blur-2xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* GLASS CARD */}
          <motion.div
            className="relative w-[95%] md:w-[90%] lg:w-[70%] 
            max-h-[90vh] overflow-y-auto
            bg-white/30 backdrop-blur-xl
            border border-white/40 shadow-xl rounded-3xl p-5 md:p-8"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 bg-white/50 hover:bg-white/70 
              p-2 rounded-full transition shadow-lg"
            >
              <X size={20} className="text-gray-800" />
            </button>

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between md:items-center 
            mb-6 border-b border-white/50 pb-3 pr-10 gap-3">
              <h3 className="text-2xl md:text-3xl font-bold text-gray-800">
                Completed Orders
              </h3>
              <div className="text-sm text-gray-800 bg-white/40 px-4 py-1.5 
              rounded-lg border border-white/60 shadow-sm">
                Total Orders: {completedOrders.length}
              </div>
            </div>

            {/* Content */}
            {loading ? (
              <SkeletonLoader rows={6} />
            ) : completedOrders.length === 0 ? (
              <p className="text-center text-gray-700 py-10 text-lg">
                No completed or delivered orders yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-gray-800 border-separate border-spacing-y-2">
                  <thead className="bg-white/50 text-gray-700 uppercase text-xs rounded-lg">
                    <tr>
                      <th className="p-3 text-left">#</th>
                      <th className="p-3 text-left">User</th>
                      <th className="p-3 text-left">Products</th>
                      <th className="p-3 text-left">Total</th>
                      <th className="p-3 text-left">Payment</th>
                      <th className="p-3 text-left">Status</th>
                      <th className="p-3 text-left">Date</th>
                    </tr>
                  </thead>

                  <tbody>
                    {completedOrders.map((order, i) => (
                      <tr
                        key={order._id}
                        className="bg-white/60 backdrop-blur-md border border-white/60 
                        rounded-xl hover:bg-white/80 transition"
                      >
                        <td className="p-4 font-medium">{i + 1}</td>

                        {/* User */}
                        <td className="p-4 font-semibold">
                          {order.userOrdering?.name || "Unknown"}
                        </td>

                        {/* PRODUCTS WITH DESCRIPTION */}
                        <td className="p-4">
                          <ul className="space-y-2">
                            {order.productList?.map((item, idx) => (
                              <li key={idx} className="pb-2 border-b border-gray-300 last:border-none">
                                <p className="font-semibold">
                                  {item?.productId?.name || "Unnamed"}{" "}
                                  <span className="text-gray-500 text-xs">
                                    ({item?.productId?.categoryId?.name ||
                                      "No Category"})
                                  </span>{" "}
                                  ×{item?.quantity || 1}
                                </p>

                                {/* DESCRIPTION */}
                                {item?.productId?.description && (
                                  <p className="text-xs text-gray-600 italic pl-3">
                                    {item.productId.description}
                                  </p>
                                )}
                              </li>
                            ))}
                          </ul>
                        </td>

                        {/* Total */}
                        <td className="p-4 font-bold text-green-700">
                          ₦{order.totalPrice?.toLocaleString() || 0}
                        </td>

                        {/* Payment */}
                        <td className="p-4">{order.paymentMethod}</td>

                        {/* FIXED STATUS BADGE (NO LINE BREAK) */}
                        <td className="p-4">
                          <span
                            className={`inline-flex items-center whitespace-nowrap 
                              px-4 py-2 rounded-full text-xs font-semibold
                              ${
                                order.deliveryStatus === "pending"
                                  ? "bg-yellow-300/40 text-yellow-800"
                                  : order.deliveryStatus === "in transit"
                                  ? "bg-blue-300/40 text-blue-800"
                                  : "bg-green-300/40 text-green-800"
                              }
                            `}
                          >
                            {order.deliveryStatus}
                          </span>
                        </td>

                        {/* Date & Time */}
                        <td className="p-4">
                          {new Date(order.createdAt).toLocaleDateString()}
                          <br />
                          <span className="text-xs text-gray-500">
                            {new Date(order.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </td>
                      </tr>
                    ))}

                    {/* FOOTER TOTAL */}
                    <tr className="bg-white/70 border border-white/60 rounded-xl">
                      <td colSpan="3"></td>
                      <td className="p-4 text-right font-bold text-gray-800 text-lg">
                        Grand Total: ₦{grandTotal.toLocaleString()}
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
