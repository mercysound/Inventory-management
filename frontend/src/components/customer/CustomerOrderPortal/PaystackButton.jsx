import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";

const PaystackButton = ({ email, amount, name, onSuccess }) => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Check if the Paystack script is already in the document
    const existingScript = document.querySelector('script[src="https://js.paystack.co/v1/inline.js"]');
    if (existingScript) {
      setIsLoaded(true);
      return;
    }

    // Otherwise, inject it dynamically
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    script.onload = () => setIsLoaded(true);
    script.onerror = () => toast.error("Failed to load Paystack SDK");
    document.body.appendChild(script);
  }, []);

  const handlePay = () => {
    if (!isLoaded || !window.PaystackPop) {
      toast.error("Paystack SDK not ready. Try again in a moment.");
      return;
    }

    try {
      // ✅ Correct Paystack integration (no `new`)
      const handler = window.PaystackPop.setup({
        key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
        email,
        amount, // already multiplied by 100 in parent
        currency: "NGN",
        metadata: {
          custom_fields: [
            {
              display_name: "Customer Name",
              variable_name: "customer_name",
              value: name,
            },
          ],
        },
        callback: (response) => {
          toast.success("Payment successful!");
          onSuccess?.(response);
        },
        onClose: () => toast.info("Payment cancelled."),
      });

      handler.openIframe();
    } catch (error) {
      console.error("Paystack error:", error);
      toast.error("Payment initialization failed.");
    }
  };

  return (
    <button
      onClick={handlePay}
      disabled={!isLoaded}
      className={`px-4 py-2 rounded-lg text-white ${
        isLoaded ? "bg-green-600 hover:bg-green-700" : "bg-gray-400 cursor-not-allowed"
      } transition-all`}
    >
      {isLoaded ? "Pay with Paystack" : "Loading Paystack..."}
    </button>
  );
};

export default PaystackButton;
