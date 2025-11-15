// src/components/history/AdminCompletedHistory.jsx
import React, { useEffect, useState } from "react";
import axiosInstance from "../../utils/axiosInstance";
import { toast } from "react-toastify";
import SharedOrderTable from "./SharedOrderTable";

const AdminCompletedHistory = () => {
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
    if (!window.confirm("Delete this order from admin view?")) return;
    try {
      const res = await axiosInstance.delete(`/completed-history/${id}`);
      if (res.data.success) {
        toast.success(res.data.message);
        setOrders((prev) => prev.filter((o) => o._id !== id));
      } else {
        toast.error(res.data.message || "Failed to delete order");
      }
    } catch {
      toast.error("Error deleting order");
    }
  };

  const clearAllOrders = async () => {
    if (!window.confirm("Are you sure you want to clear all completed orders?")) return;
    try {
      const res = await axiosInstance.delete("/completed-history/clear/all");
      if (res.data.success) {
        setOrders([]);
        toast.success(res.data.message);
      }
    } catch {
      toast.error("Error clearing all orders");
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  if (loading) return <p className="text-center py-10">Loading...</p>;

  return (
    <div className="p-5">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-2xl font-bold">📜 Admin Completed Orders</h2>
        <button
          onClick={clearAllOrders}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md"
        >
          Clear All
        </button>
      </div>

      <SharedOrderTable orders={orders} role="admin" onDelete={deleteOrder} />
    </div>
  );
};

export default AdminCompletedHistory;
