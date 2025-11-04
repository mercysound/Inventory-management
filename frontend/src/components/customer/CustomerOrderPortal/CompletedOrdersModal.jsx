import React, { useEffect, useState } from "react";
import axiosInstance from "../../../utils/axiosInstance";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2 } from "lucide-react";
import SkeletonLoader from "../../common/SkeletonLoader";

const CompletedOrders = ({ isOpen, onClose }) => {
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
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-green-700 text-white text-sm md:text-base">
                      <th className="p-3 text-left">Customer</th>
                      <th className="p-3 text-left">Products</th>
                      <th className="p-3 text-left">Description</th>
                      <th className="p-3">Total</th>
                      <th className="p-3">Status</th>
                      {/* <th className="p-3">Action</th> */}
                    </tr>
                  </thead>
                  <tbody>
                    {completedOrders.map((order) => (
                      <tr
                        key={order._id}
                        className="border-b hover:bg-gray-50 transition-colors"
                      >
                        <td className="p-3 text-sm md:text-base">
                          {order.buyerName}
                        </td>
                        <td className="p-3 text-sm md:text-base">
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
                        <td className="p-3 text-sm md:text-base">
                          {order.productList
                            .map((p) => p.productId?.name || "Unnamed")
                            .join(", ")}
                        </td>
                        <td className="p-3 text-center text-sm md:text-base">
                          ₦{order.totalPrice.toLocaleString()}
                        </td>
                        <td className="p-3 text-center">
                          <span className="flex items-center justify-center text-green-600 font-medium">
                            <CheckCircle2 size={16} className="mr-1" />
                            {order.deliveryStatus}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleDeleteSingle(order._id)}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md text-sm"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
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

export default CompletedOrders;
