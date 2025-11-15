// src/components/history/StaffCompletedHistory.jsx
import React, { useEffect, useState } from "react";
import axiosInstance from "../../utils/axiosInstance";
import { toast } from "react-toastify";
import SharedOrderTable from "./SharedOrderTable";

const StaffCompletedHistory = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/completed-history");
      if (res.data.success) setOrders(res.data.orders || []);
    } catch (err) {
      toast.error("Failed to fetch staff orders");
    } finally {
      setLoading(false);
    }
  };

  const deleteOrder = async (id) => {
    if (!window.confirm("Remove this order from your view?")) return;
    try {
      const res = await axiosInstance.delete(`/completed-history/${id}`);
      if (res.data.success) {
        toast.success("Order removed from your view");
        setOrders((prev) => prev.filter((o) => o._id !== id));
      }
    } catch {
      toast.error("Error deleting order");
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  if (loading) return <p className="text-center py-10">Loading...</p>;

  return (
    <div className="p-5">
      <h2 className="text-2xl font-bold mb-3">📜 Staff Completed Orders</h2>
      <SharedOrderTable orders={orders} role="staff" onDelete={deleteOrder} />
    </div>
  );
};

export default StaffCompletedHistory;
