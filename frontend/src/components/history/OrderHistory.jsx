// import React, { useEffect, useState } from "react";
// import axiosInstance from "../../utils/axiosInstance";
// import { toast } from "react-toastify";
// import OrderHistoryTable from "./OrderHistoryTable";

// const OrderHistory = () => {
//   const [orders, setOrders] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [deleting, setDeleting] = useState(false);

//   // Fetch all orders
//   const fetchOrders = async () => {
//     try {
//       setLoading(true);
//       const res = await axiosInstance.get("/placed-orders"); // same API as PlacedOrders
//       if (res.data.success) setOrders(res.data.orders || []);
//     } catch (err) {
//       console.error(err);
//       toast.error("Failed to fetch orders");
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Delete single order from history
//   const handleDeleteOrder = async (id) => {
//     if (!window.confirm("Delete this order from history?")) return;
//     try {
//       setDeleting(true);
//       const res = await axiosInstance.delete(`/placed-orders/${id}`);
//       if (res.data.success) {
//         setOrders((prev) => prev.filter((order) => order._id !== id));
//         toast.success("Order removed from history");
//       } else {
//         toast.error(res.data.message || "Failed to delete order");
//       }
//     } catch (err) {
//       console.error(err);
//       toast.error("Error deleting order");
//     } finally {
//       setDeleting(false);
//     }
//   };

//   useEffect(() => {
//     fetchOrders();
//   }, []);

//   return (
//     <div className="p-4">
//       <h2 className="text-xl font-bold mb-4">🗂️ Completed Orders History</h2>
//       {loading ? (
//         <p>Loading orders...</p>
//       ) : orders.length > 0 ? (
//         <OrderHistoryTable orders={orders} handleDeleteOrder={handleDeleteOrder} deleting={deleting} />
//       ) : (
//         <p className="text-gray-500 text-center py-8">No completed orders found</p>
//       )}
//     </div>
//   );
// };

// export default OrderHistory;
