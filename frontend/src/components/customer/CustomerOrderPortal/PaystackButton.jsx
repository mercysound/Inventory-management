import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Loader2, CreditCard, AlertCircle } from "lucide-react";

/**
 * PaystackButton
 * Props:
 *  - email       {string}   buyer email
 *  - amount      {number}   amount in NGN (converted to kobo internally)
 *  - name        {string}   customer name
 *  - reference   {string}   unique transaction ref
 *  - onSuccess   {fn}       called with Paystack response on success
 *  - onCancel    {fn}       called when user closes the popup
 *  - disabled    {boolean}  externally disable (e.g. empty cart)
 *  - className   {string}   extra tailwind classes
 */
const PaystackButton = ({
  email,
  amount,
  name,
  reference,
  onSuccess,
  onCancel,
  disabled = false,
  className = "",
}) => {
  const [scriptStatus, setScriptStatus] = useState("idle"); // idle | loading | ready | error
  const [paying, setPaying] = useState(false);

  // ── Load Paystack inline script once ──────────────────────────────────────
  useEffect(() => {
    const SCRIPT_ID = "paystack-inline-script";
    const existing = document.getElementById(SCRIPT_ID);

    if (existing) {
      setScriptStatus("ready");
      return;
    }

    setScriptStatus("loading");
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    script.onload = () => setScriptStatus("ready");
    script.onerror = () => setScriptStatus("error");
    document.body.appendChild(script);
  }, []);

  // ── Guard: ensure all required fields before opening popup ───────────────
  const canPay =
    scriptStatus === "ready" &&
    !paying &&
    !disabled &&
    !!email &&
    amount > 0;

  const handlePay = () => {
    if (!canPay) return;

    const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
    if (!publicKey) {
      console.error("VITE_PAYSTACK_PUBLIC_KEY is not set");
      return;
    }

    setPaying(true);

    const handler = window.PaystackPop.setup({
      key: publicKey,
      email,
      amount: Math.round(amount * 100), // kobo
      ref: reference || `ps_${Date.now()}`,
      currency: "NGN",
      metadata: {
        custom_fields: [
          {
            display_name: "Customer Name",
            variable_name: "customer_name",
            value: name || email,
          },
        ],
      },
      callback: (response) => {
        setPaying(false);
        if (onSuccess) onSuccess(response);
      },
      onClose: () => {
        setPaying(false);
        if (onCancel) onCancel();
      },
    });

    handler.openIframe();
  };

  // ── Derived UI state ──────────────────────────────────────────────────────
  const stateMap = {
    idle: {
      label: "Initialising...",
      icon: <Loader2 size={16} className="animate-spin" />,
    },
    loading: {
      label: "Loading payment...",
      icon: <Loader2 size={16} className="animate-spin" />,
    },
    ready: {
      label: paying
        ? "Processing..."
        : `Pay ₦${Number(amount).toLocaleString()}`,
      icon: paying ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        <CreditCard size={16} />
      ),
    },
    error: {
      label: "Payment unavailable",
      icon: <AlertCircle size={16} />,
    },
  };

  const currentState = stateMap[scriptStatus] ?? stateMap.idle;
  const isInteractive = canPay;

  return (
    <div className={`flex flex-col items-end gap-2 ${className}`}>
      <motion.button
        onClick={handlePay}
        disabled={!isInteractive}
        whileHover={isInteractive ? { scale: 1.02 } : {}}
        whileTap={isInteractive ? { scale: 0.97 } : {}}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        className={`
          relative overflow-hidden flex items-center gap-2.5
          px-6 py-3 rounded-xl font-semibold text-sm
          transition-all duration-200 shadow-sm
          ${
            isInteractive
              ? "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-emerald-200"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }
        `}
        aria-label="Pay with Paystack"
      >
        {/* Shimmer on hover (only when active) */}
        {isInteractive && (
          <motion.span
            className="absolute inset-0 bg-white opacity-0 hover:opacity-5 rounded-xl"
            transition={{ duration: 0.2 }}
          />
        )}

        <AnimatePresence mode="wait">
          <motion.span
            key={scriptStatus + String(paying)}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-2"
          >
            {currentState.icon}
            {currentState.label}
          </motion.span>
        </AnimatePresence>
      </motion.button>

      {/* Trust badge */}
      <AnimatePresence>
        {scriptStatus === "ready" && !paying && (
          <motion.span
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1.5 text-xs text-gray-400"
          >
            <ShieldCheck size={12} className="text-emerald-500" />
            Secured by Paystack
          </motion.span>
        )}
      </AnimatePresence>

      {/* Error fallback message */}
      {scriptStatus === "error" && (
        <p className="text-xs text-red-500 mt-1">
          Could not load Paystack. Please refresh and try again.
        </p>
      )}
    </div>
  );
};

export default PaystackButton;