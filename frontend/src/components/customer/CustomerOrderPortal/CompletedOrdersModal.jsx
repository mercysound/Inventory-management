import React, { useEffect, useState } from "react";
import axiosInstance from "../../../utils/axiosInstance";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2 } from "lucide-react";
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

  const handleDeleteSingle = async (id) => {
    if (!window.confirm("Delete this order?")) return;
    try {
      await axiosInstance.delete(`/allOrdersPlaced/${id}`);
      toast.success("Order deleted successfully");
      fetchCompletedOrders();
    } catch {
      toast.error("Failed to delete order");
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm("Are you sure you want to delete all order history?"))
      return;
    try {
      await axiosInstance.delete("/allOrdersPlaced/clear");
      toast.success("All completed orders cleared");
      fetchCompletedOrders();
    } catch {
      toast.error("Failed to clear all orders");
    }
  };
  const grandTotal = completedOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 backdrop-blur-sm bg-black/20 flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-5 relative"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>

            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold text-gray-800">
                Completed Orders
              </h3>
              {/* <button
                onClick={handleDeleteAll}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm"
              >
                Delete All History
              </button> */}
            </div>

            {loading ? (
              <SkeletonLoader rows={6} />
            ) : completedOrders.length === 0 ? (
              <p className="text-center text-gray-500 py-10">
                No completed/delivered orders yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-gray-700 border-collapse">
          <thead className="bg-gray-100 uppercase font-semibold text-gray-600">
            <tr>
              <th className="p-3 text-left">#</th>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">User</th>
              <th className="p-3 text-left">Products</th>
              <th className="p-3 text-left">Total</th>
              <th className="p-3 text-left">Payment</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Date & Time</th>
              {/* <th className="p-3 text-left">Action</th> */}
            </tr>
          </thead>

          <tbody>
            {completedOrders.map((order, i) => (
              <tr
                key={order._id}
                className="border-t hover:bg-gray-50 transition duration-200 align-top"
              >
                <td className="p-3">{i + 1}</td>
                <td className="p-3 font-medium text-gray-800">{order.buyerName}</td>
                <td className="p-3">{order.userOrdering?.name || "Unknown"}</td>

                {/* Products */}
                <td className="p-3">
                  <ul className="space-y-3">
                    {order.productList?.map((item, idx) => (
                      <li key={idx} className="border-b border-gray-100 pb-2 last:border-none">
                        <p className="font-semibold text-gray-800">
                          {item?.productId?.name || "Unnamed"}{" "}
                          <span className="text-gray-500 text-sm">
                            ({item?.productId?.categoryId?.name || "No Category"})
                          </span>{" "}
                          ×{item?.quantity || 1}
                        </p>
                        {item?.productId?.description && (
                          <p className="text-gray-500 text-sm pl-3 italic">
                            {item.productId.description}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </td>

                <td className="p-3 font-semibold text-gray-800">
                  ₦{order.totalPrice?.toLocaleString() || 0}
                </td>
                <td className="p-3">{order.paymentMethod}</td>
                 <td className="p-3">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      order.deliveryStatus === "pending"
                        ? "bg-yellow-100 text-yellow-800"
                        : order.deliveryStatus === "in transit"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {order.deliveryStatus}
                  </span>
                </td>
                <td className="p-3 text-gray-600">
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
            <tr className="bg-gray-50 font-bold text-gray-800 border-t">
              <td colSpan="4" className="p-3 text-right">
                Grand Total:
              </td>
              <td className="p-3 text-indigo-600">₦{grandTotal.toLocaleString()}</td>
              <td colSpan="4"></td>
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
