// src/components/customer/CustomerOrderPortal.jsx
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import PaystackButton from "../../PaystackButton";
import axiosInstance from "../../../utils/axiosInstance";



const CustomerOrderPortal = () => {
  const [orders, setOrders] = useState([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY; // add this in .env
  const businessEmail = import.meta.env.VITE_ADMIN_EMAIL; // Admin/business email

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
    } catch (err) {
      toast.error("Failed to fetch your orders");
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessPayment = async (reference) => {
    try {
      const res = await axiosInstance.post("/orders/payment", {
        paymentMethod: "Online (Paystack)",
        buyerName: user?.name || "Guest Customer",
        deliveryStatus: "Pending",
        totalPrice,
      });

      if (res.data.success) {
        toast.success("Payment successful! Order completed.");
        await axiosInstance.delete("/orders/clear");
        fetchOrders();
      }
    } catch (err) {
      toast.error("Failed to complete order after payment");
    }
  };

  const componentProps = {
    email: businessEmail,
    amount: totalPrice * 100, // in kobo
    publicKey,
    text: "Pay Now",
    onSuccess: handleSuccessPayment,
    onClose: () => toast.info("Payment cancelled"),
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-6">Your Orders</h2>

      {loading ? (
        <p>Loading orders...</p>
      ) : orders.length === 0 ? (
        <p>No orders found.</p>
      ) : (
        <>
          <table className="w-full border-collapse mb-6">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="p-3 text-left">Product</th>
                <th className="p-3">Quantity</th>
                <th className="p-3">Price</th>
                <th className="p-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o._id} className="border-b">
                  <td className="p-3">{o.product?.name}</td>
                  <td className="p-3 text-center">{o.quantity}</td>
                  <td className="p-3 text-center">₦{o.price.toLocaleString()}</td>
                  <td className="p-3 text-center">
                    ₦{o.totalPrice.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">
              Total: ₦{totalPrice.toLocaleString()}
            </h3>

            {/* ✅ Paystack Button */}
            {/* ✅ Use PaystackButton here */}
        <PaystackButton
          email={user?.email || businessEmail}
          amount={totalPrice}
          name={user?.name || "Guest Customer"}
          onSuccess={handleSuccessPayment}
        />
          </div>
        </>
      )}
    </div>
  );
};

export default CustomerOrderPortal;
