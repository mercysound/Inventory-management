import React, { useEffect, useState } from "react";
import axiosInstance from "../../utils/axiosInstance";
import CustomerOrdersTable from "./CustomerOrdersTable";
import CustomerOrdersSkeleton from "./CustomerOrdersSkeleton";

const CustomerOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      const response = await axiosInstance.get("/orders", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("pos-token")}`,
        },
      });

      if (response.data.success) {
        setOrders(response.data.orders);
        console.log(response.data);
      } else {
        console.error("Error fetching orders:", response.data.message);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  return (
    <div className="w-full h-full flex flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold">Customer Orders</h1>
      {loading ? <CustomerOrdersSkeleton /> : <CustomerOrdersTable orders={orders} />}
    </div>
  );
};

export default CustomerOrders;
