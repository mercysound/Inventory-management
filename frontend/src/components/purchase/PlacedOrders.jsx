import React, { useEffect, useState } from "react";
import axiosInstance from "../../utils/axiosInstance";
import { toast } from "react-toastify";
import PlacedOrdersTable from "./PlacedOrdersTable";
import PlacedOrdersSkeleton from "./PlacedOrdersSkeleton";

const PlacedOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/placed-orders");
      if (res.data.success) setOrders(res.data.orders || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  const updateDeliveryStatus = async (orderId, newStatus) => {
    try {
      setUpdating(true);
      const res = await axiosInstance.put(`/placed-orders/${orderId}/status`, {
        deliveryStatus: newStatus,
      });
      if (res.data.success) {
        toast.success("Delivery status updated!");
        fetchOrders();
      } else {
        toast.error(res.data.message || "Failed to update status");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error updating delivery status");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteOrder = async (id) => {
    if (!window.confirm("Are you sure you want to delete this order?")) return;
    try {
      const res = await axiosInstance.delete(`/placed-orders/${id}`);
      if (res.data.success) {
        toast.success("Order deleted!");
        setOrders((prev) => prev.filter((order) => order._id !== id));
      } else {
        toast.error(res.data.message || "Failed to delete order");
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Error deleting order");
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm("Are you sure you want to clear all orders?")) return;
    try {
      const res = await axiosInstance.delete("/placed-orders/clear");
      if (res.data.success) {
        setOrders([]);
        toast.success("All orders cleared.");
      } else {
        toast.error(res.data.message || "Failed to clear orders.");
      }
    } catch (error) {
      console.error("Clear error:", error);
      toast.error("Error clearing orders.");
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-xl font-bold text-gray-800">📦 Placed Orders</h2>
        <button
          onClick={handleClearAll}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md"
          disabled={updating}
        >
          Clear All
        </button>
      </div>

      {loading ? (
        <PlacedOrdersSkeleton />
      ) : orders.length > 0 ? (
        <PlacedOrdersTable
          orders={orders}
          updateDeliveryStatus={updateDeliveryStatus}
          deleteOrder={handleDeleteOrder}
          updating={updating}
        />
      ) : (
        <p className="text-gray-500 text-center py-8">No orders found</p>
      )}
    </div>
  );
};

export default PlacedOrders;
