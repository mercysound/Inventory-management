// src/components/customer/CustomerOrderPortal.jsx
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "../../../context/AuthContext";
import axiosInstance from "../../../utils/axiosInstance";
import PaystackButton from "./PaystackButton";
import OrderTable from "./OrderTable";
// import CompletedOrdersModal from "./CompletedOrdersModal";
import { Clock } from "lucide-react";
import { History } from "lucide-react";
import CompletedOrders from "./CompletedOrdersModal";

const CustomerOrderPortal = () => {
  const [orders, setOrders] = useState([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showCompletedModal, setShowCompletedModal] = useState(false);
  const { user } = useAuth();

  const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
  const businessEmail = import.meta.env.VITE_ADMIN_EMAIL;

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/orders");
      if (res.data.success) {
        setOrders(res.data.orders || []);
        const total = res.data.orders.reduce(
          (sum, o) => sum + (o.totalPrice || 0),
          0
        );
        setTotalPrice(total);
      }
    } catch {
      toast.error("Failed to fetch your orders");
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessPayment = async () => {
    try {
      const allQuantity = orders.reduce((sum, o) => sum + (o.quantity || 0), 0);
      const totalPrice = orders.reduce(
        (sum, o) => sum + (o.totalPrice ?? o.quantity * o.price),
        0
      );
      const productList = orders.map((o) => ({
        productId: o.product?._id,
        quantity: o.quantity,
        price: o.price,
        totalPrice: o.totalPrice,
      }));

      const res = await axiosInstance.post("/orders/payment", {
        paymentMethod: "Online (Paystack)",
        buyerName: user?.name || "Guest Customer",
        deliveryStatus: "Pending",
        totalPrice,
        allQuantity,
        productList,
      });

      if (res.data.success) {
        toast.success("Payment successful! Order completed.");
        await axiosInstance.delete("/orders/clear");
        fetchOrders();
      }
    } catch {
      toast.error("Failed to complete order after payment");
    }
  };

  return (
    <div className="p-4 md:p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 min-h-screen rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-6">
  <h2 className="text-2xl font-semibold">Your Orders</h2>

  <button
    onClick={() => setShowCompletedModal(true)}
    className="flex items-center space-x-2 bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg transition-all"
  >
    <History size={18} />
    <span>Completed Orders</span>
  </button>
</div>

      {loading ? (
        <p>Loading orders...</p>
      ) : orders.length === 0 ? (
        <p>No active orders found.</p>
      ) : (
        <>
          <OrderTable orders={orders} />

          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              Total: ₦{totalPrice.toLocaleString()}
            </h3>

            <PaystackButton
              email={user?.email || businessEmail}
              amount={totalPrice * 100}
              name={user?.name || "Guest Customer"}
              onSuccess={handleSuccessPayment}
            />
          </div>
        </>
      )}

      {/* ✅ Completed Orders Modal */}
      <CompletedOrders
  isOpen={showCompletedModal}
  onClose={() => setShowCompletedModal(false)}
/>
    </div>
  );
};

export default CustomerOrderPortal;
