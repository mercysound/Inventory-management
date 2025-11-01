import React from "react";
import { toast } from "react-toastify";

const PaystackButton = ({ email, amount, name, onSuccess }) => {
  const handlePay = () => {
    if (!window.PaystackPop) {
      toast.error("Paystack SDK not loaded yet.");
      return;
    }

    const paystack = new window.PaystackPop();
    paystack.newTransaction({
      key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY, // from .env
      email,
      amount: amount * 100, // Paystack uses kobo
      metadata: {
        custom_fields: [
          {
            display_name: "Customer Name",
            variable_name: "customer_name",
            value: name,
          },
        ],
      },
      onSuccess: (response) => {
        toast.success("Payment successful!");
        onSuccess(response);
      },
      onCancel: () => {
        toast.info("Payment cancelled.");
      },
    });
  };

  return (
    <button
      onClick={handlePay}
      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
    >
      Pay with Paystack
    </button>
  );
};

export default PaystackButton;
