import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import axiosInstance from "../../../utils/axiosInstance";
import CustomerOrderTable from "./CustomerOrderTable";
import PaystackButton from "./PaystackButton";
import { useAuth } from "../../../context/AuthContext";

const CustomerOrderPortal = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchOrders = async () => {
    try {
      const res = await axiosInstance.get("/orders");
      const data = res.data.orders || [];
      // Ensure total is calculated
      const updated = data.map((o) => ({
        ...o,
        total: o.total || o.quantity * o.price,
      }));
      setOrders(updated);
    } catch (error) {
      console.error(error);
      toast.error("Failed to fetch your orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleIncreaseQty = async (orderId) => {
    try {
      const res = await axiosInstance.post(`/orders/increase/${orderId}`);
      if (res.data.success) {
        // toast.success("Quantity increased");
        fetchOrders();
      }
    } catch {
      toast.error("Failed to increase quantity");
    }
  };

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
        // toast.info("Quantity reduced");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to reduce quantity");
    }
  };

  const handleDeleteOrder = async (orderId) => {
    try {
      const res = await axiosInstance.delete(`/orders/remove/${orderId}`);
      if (res.data.success) {
        setOrders((prev) => prev.filter((o) => o._id !== orderId));
        toast.success("Order removed");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to remove order");
    }
  };

  const grandTotal = orders.reduce(
    (acc, o) => acc + (o.total || o.quantity * o.price),
    0
  );

  const handlePaymentSuccess = async () => {
  toast.success("Payment successful! Finalizing your order...");

  try {
    // ✅ Step 1: Confirm payment & update stock
    const res = await axiosInstance.post("/orders/payment", {
      paymentMethod: "Paystack",
      buyerName: user?.name || "Unknown",
      // deliveryStatus: "Paid",
    });

    if (res.data.success) {
      toast.success("Order marked as paid and stock updated!");
    } else {
      toast.warn(res.data.message || "Payment processed, but something is off.");
    }

    // ✅ Step 2: Generate and download invoice automatically
    const query = new URLSearchParams({
      format: "pdf",
      customerName: user?.name || "Customer",
      paymentMethod: "Paystack",
    }).toString();

    const invoiceResponse = await axiosInstance.get(`/orders/invoice?${query}`, {
      responseType: "blob",
    });

    const blob = new Blob([invoiceResponse.data], { type: "application/pdf" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Invoice_${user?.name || "Customer"}.pdf`;
    link.click();

    // ✅ Step 3: Clear cart and refresh orders
    await axiosInstance.delete("/orders/clear");
    setOrders([]);
    toast.info("Your cart has been cleared.");
  } catch (error) {
    console.error("Payment completion error:", error);
    const msg = error.response?.data?.message || "Something went wrong after payment";
    toast.error(msg);
  }
};


  return (
    <div className="p-4 md:p-6">
      <h2 className="text-2xl font-semibold mb-4">My Orders</h2>

      {loading ? (
        <p>Loading...</p>
      ) : orders.length === 0 ? (
        <p className="text-gray-500">You have no orders yet.</p>
      ) : (
        <>
          <CustomerOrderTable
            orders={orders}
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
    </div>
  );
};

export default CustomerOrderPortal;
