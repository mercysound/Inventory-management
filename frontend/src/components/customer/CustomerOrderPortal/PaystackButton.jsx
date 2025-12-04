import { useEffect, useState } from "react";

const PaystackButton = ({ email, amount, name, reference, onSuccess, onCancel }) => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Check if script already exists
    const scriptId = "paystack-script";
    const existingScript = document.getElementById(scriptId);

    if (!existingScript) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://js.paystack.co/v1/inline.js";
      script.onload = () => setIsLoaded(true);
      script.onerror = () => console.error("Paystack script failed to load");
      document.body.appendChild(script);
    } else {
      setIsLoaded(true);
    }
  }, []);

  const payNow = () => {
    if (!isLoaded) {
      alert("Payment script not loaded yet...");
      return;
    }

    const handler = window.PaystackPop.setup({
      key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY, // Your public key
      email,
      amount: amount * 100, // Convert to kobo
      ref: reference || `ps_${Date.now()}`,
      metadata: {
        custom_fields: [
          {
            display_name: "Customer Name",
            variable_name: "customer_name",
            value: name,
          },
        ],
      },
      callback: function (response) {
        console.log("Payment success:", response);
        if (onSuccess) onSuccess(response);
      },
      onClose: function () {
        console.log("Payment cancelled");
        if (onCancel) onCancel();
      },
    });

    handler.openIframe();
  };

  return (
    <button
      onClick={payNow}
      disabled={!isLoaded}
      className="bg-green-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
    >
      {isLoaded ? "Pay with Paystack" : "Loading..."}
    </button>
  );
};

export default PaystackButton;
