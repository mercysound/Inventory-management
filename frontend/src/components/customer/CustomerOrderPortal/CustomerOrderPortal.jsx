import React, { useEffect, useState, useCallback } from "react";
import { toast } from "react-toastify";
import axiosInstance from "../../../utils/axiosInstance";
import CustomerOrderTable from "./CustomerOrderTable";
import PaystackButton from "./PaystackButton";
import { useAuth } from "../../../context/AuthContext";
import CompletedOrdersModal from "./CompletedOrdersModal";

const CustomerOrderPortal = () => {
  const [orders, setOrders] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // ✅ Fetch both orders and pending/in-transit history
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);

      // 1️⃣ Fetch active (cart) orders
      const orderRes = await axiosInstance.get("/orders");
      const data = orderRes.data.orders || [];

      const updatedOrders = data.map((o) => ({
        ...o,
        total: o.total || o.quantity * o.price,
      }));
      setOrders(updatedOrders);

      // 2️⃣ Fetch user's completed history (delivered, pending, in transit)
      const historyRes = await axiosInstance.get("/placed-orders");
      const allHistory = historyRes.data.orders || [];

      // 3️⃣ Filter pending + in-transit only
      const pendingFromHistory = allHistory.filter(
        (o) =>
          o.deliveryStatus?.toLowerCase() === "pending" ||
          o.deliveryStatus?.toLowerCase() === "in transit"
      );
      console.log(pendingFromHistory);   

      setPendingOrders(pendingFromHistory);

    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to fetch your orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // ✅ Increase quantity
  const handleIncreaseQty = async (orderId) => {
    try {
      const res = await axiosInstance.post(`/orders/increase/${orderId}`);
      if (res.data.success) fetchOrders();
      else if (res.data.message?.toLowerCase().includes("stock"))
        toast.warn("Not enough stock available");
      else toast.error("Failed to increase quantity");
    } catch {
      toast.error("Failed to increase quantity");
    }
  };

  // ✅ Reduce quantity
  const handleReduceQty = async (orderId) => {
    const order = orders.find((o) => o._id === orderId);
    if (!order) return;

    if (order.quantity <= 1) {
      await handleDeleteOrder(orderId);
      return;
    }

    try {
      const res = await axiosInstance.post(`/orders/reduce/${orderId}`);
      if (res.data.success) {
        setOrders((prev) =>
          prev.map((o) =>
            o._id === orderId
              ? { ...o, quantity: o.quantity - 1, total: (o.quantity - 1) * o.price }
              : o
          )
        );
      }
    } catch {
      toast.error("Failed to reduce quantity");
    }
  };

  // ✅ Delete order
  const handleDeleteOrder = async (orderId) => {
    try {
      const res = await axiosInstance.delete(`/orders/remove/${orderId}`);
      if (res.data.success) {
        setOrders((prev) => prev.filter((o) => o._id !== orderId));
        toast.success("Order removed");
      }
    } catch {
      toast.error("Failed to remove order");
    }
  };

  // ✅ Calculate total
  const grandTotal = orders.reduce(
    (acc, o) => acc + (o.total || o.quantity * o.price),
    0
  );

  // ✅ Payment success logic
  const handlePaymentSuccess = async () => {
    toast.success("Payment successful! Finalizing your order...");
    try {
      const res = await axiosInstance.post("/orders/payment", {
        paymentMethod: "Paystack",
        buyerName: user?.name || "Unknown",
      });

      if (res.data.success) {
        toast.success("Order confirmed and stock updated!");
      }

      // Auto download invoice
      const query = new URLSearchParams({
        format: "pdf",
        customerName: user?.name || "Customer",
        paymentMethod: "Paystack",
      }).toString();

      const invoiceRes = await axiosInstance.get(`/orders/invoice?${query}`, {
        responseType: "blob",
      });

      const blob = new Blob([invoiceRes.data], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Invoice_${user?.name || "Customer"}.pdf`;
      link.click();

      // Clear cart after success
      await axiosInstance.delete("/orders/clear");
      setOrders([]);
      toast.info("Your cart has been cleared.");
    } catch (error) {
      console.error(error);
      toast.error("Error finalizing your payment.");
    }
  };

  // ✅ Handle ESC to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && showPendingModal) {
        setShowPendingModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showPendingModal]);

  return (
    <div className="p-4 md:p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">My Orders</h2>

        {/* ✅ Pending orders button */}
        <button
          onClick={() => setShowPendingModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          View Pending Orders ({pendingOrders.length})
        </button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : orders.length === 0 ? (
        <p className="text-gray-500">You have no orders yet.</p>
      ) : (
        <>
          <CustomerOrderTable
            orders={orders}
             role={user?.role} 
            onIncrease={handleIncreaseQty}
            onReduce={handleReduceQty}
            onDelete={handleDeleteOrder}
          />

          <div className="flex justify-between items-center mt-6 border-t pt-4">
            <h3 className="text-lg font-semibold">
              Grand Total: ₦{grandTotal.toLocaleString()}
            </h3>

            {user?.role === "customer" && grandTotal > 0 && (
              <PaystackButton
                email={user.email}
                amount={grandTotal}
                name={user.name}
                onSuccess={handlePaymentSuccess}
              />
            )}
          </div>
        </>
      )}

      {/* ✅ Modal for pending orders */}
      <CompletedOrdersModal
        isOpen={showPendingModal}
        onClose={() => setShowPendingModal(false)}
        pendingOrders={pendingOrders}
      />
    </div>
  );
};

export default CustomerOrderPortal;
