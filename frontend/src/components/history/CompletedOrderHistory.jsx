import React, { useEffect, useState } from "react";
import axiosInstance from "../../utils/axiosInstance";
import { toast } from "react-toastify";
import { FaTrashAlt } from "react-icons/fa";

const CompletedOrderHistory = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/completed-history");
      if (res.data.success) setOrders(res.data.orders || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch completed orders");
    } finally {
      setLoading(false);
    }
  };

  const deleteOrder = async (id) => {
    if (!window.confirm("Are you sure you want to delete this order?")) return;
    try {
      const res = await axiosInstance.delete(`/completed-history/${id}`);
      if (res.data.success) {
        toast.success("Order deleted from history!");
        setOrders((prev) => prev.filter((o) => o._id !== id));
      } else {
        toast.error(res.data.message || "Failed to delete order");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error deleting order");
    }
  };

  const clearAllOrders = async () => {
    if (!window.confirm("Are you sure you want to clear all completed orders?")) return;
    try {
      const res = await axiosInstance.delete("/completed-history/clear/all");
      if (res.data.success) {
        setOrders([]);
        toast.success("All completed orders cleared!");
      } else {
        toast.error(res.data.message || "Failed to clear orders");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error clearing orders");
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  if (loading) return <p className="text-center py-10">Loading...</p>;

  return (
    <div className="p-5">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-2xl font-bold">📜 Completed Orders History</h2>
        <button
          onClick={clearAllOrders}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md"
        >
          Clear All
        </button>
      </div>

      {orders.length === 0 ? (
        <p className="text-gray-500 text-center py-10">No completed orders found</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left border-collapse border border-gray-200">
            <thead className="bg-gray-100 font-semibold">
              <tr>
                <th className="p-2 border">#</th>
                <th className="p-2 border">Buyer</th>
                <th className="p-2 border">Staff</th>
                <th className="p-2 border">Products</th>
                <th className="p-2 border">Total</th>
                <th className="p-2 border">Payment</th>
                <th className="p-2 border">Date</th>
                <th className="p-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order, i) => (
                <tr key={order._id} className="border-t hover:bg-gray-50">
                  <td className="p-2">{i + 1}</td>
                  <td className="p-2">{order.buyerName}</td>
                  <td className="p-2">{order.userOrdering?.name || "Unknown"}</td>
                  <td className="p-2">
                    <ul className="space-y-1">
                      {order.productList?.map((item, idx) => (
                        <li key={idx}>
                          {item.productId?.name || "Unnamed"} (
                          {item.productId?.categoryId?.name || "No Category"}) ×
                          {item.quantity || 1}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="p-2 font-semibold">₦{order.totalPrice?.toLocaleString()}</td>
                  <td className="p-2">{order.paymentMethod}</td>
                  <td className="p-2 text-gray-600">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-2">
                    <button
                      onClick={() => deleteOrder(order._id)}
                      className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded"
                    >
                      <FaTrashAlt className="text-xs" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CompletedOrderHistory;
