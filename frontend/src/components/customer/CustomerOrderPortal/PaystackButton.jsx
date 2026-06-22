import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Loader2, CreditCard, AlertCircle } from "lucide-react";

/**
 * PaystackButton
 *
 * Props:
 *  email, amount, name, reference  — Paystack payment details
 *  onSuccess   — called with full Paystack response on success
 *  onCancel    — called when user closes the popup
 *  onPreCheck  — async fn called BEFORE opening popup; return true to proceed
 *  disabled    — externally disable (e.g. empty cart)
 *  triggerRef  — optional ref; parent calls triggerRef.current.open() to
 *                open Paystack directly, bypassing onPreCheck
 */
const PaystackButton = ({
  email,
  amount,
  name,
  reference,
  onSuccess,
  onCancel,
  onPreCheck,
  disabled  = false,
  className = "",
  triggerRef = null,
}) => {
  const [scriptStatus, setScriptStatus] = useState("idle");
  const [paying,    setPaying]    = useState(false);
  const [checking,  setChecking]  = useState(false);

  // Keep all latest props in a ref so closures always read current values
  const propsRef = useRef({});
  propsRef.current = { email, amount, name, reference, onSuccess, onCancel, onPreCheck, disabled };

  // ── Load Paystack inline script once ─────────────────────────────────────
  useEffect(() => {
    const SCRIPT_ID = "paystack-inline-script";
    if (document.getElementById(SCRIPT_ID)) { setScriptStatus("ready"); return; }
    setScriptStatus("loading");
    const script = document.createElement("script");
    script.id      = SCRIPT_ID;
    script.src     = "https://js.paystack.co/v1/inline.js";
    script.async   = true;
    script.onload  = () => setScriptStatus("ready");
    script.onerror = () => setScriptStatus("error");
    document.body.appendChild(script);
  }, []);

  // ── Core open function — reads from propsRef, never stale ────────────────
  const openPaystack = () => {
    const { email: e, amount: a, name: n, reference: r,
            onSuccess: s, onCancel: c } = propsRef.current;

    const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
    if (!publicKey) { console.error("VITE_PAYSTACK_PUBLIC_KEY is not set"); return; }
    if (!window.PaystackPop) { console.error("Paystack script not loaded"); return; }

    setPaying(true);
    const handler = window.PaystackPop.setup({
      key:      publicKey,
      email:    e,
      amount:   Math.round(a * 100),
      ref:      r || `ps_${Date.now()}`,
      currency: "NGN",
      metadata: {
        custom_fields: [{ display_name: "Customer Name", variable_name: "customer_name", value: n || e }],
      },
      callback: (response) => { setPaying(false); s?.(response); },
      onClose:  () => { setPaying(false); c?.(); },
    });
    handler.openIframe();
  };

  // ── Expose openPaystack via triggerRef — bypasses onPreCheck ─────────────
  // Parent (CustomerOrderPortal) calls triggerRef.current.open() AFTER
  // the fulfillment modal confirms. onPreCheck is NOT called in this path
  // because stock was already verified before the modal opened.
  useEffect(() => {
    if (!triggerRef) return;
    triggerRef.current = {
      open: () => {
        if (scriptStatus !== "ready") return;
        openPaystack();
      },
    };
  }); // no deps — always keep ref fresh

  // ── Normal button click — runs onPreCheck first ───────────────────────────
  const handlePay = async () => {
    const { disabled: dis, onPreCheck: pre } = propsRef.current;
    if (scriptStatus !== "ready" || paying || checking || dis) return;

    if (pre) {
      setChecking(true);
      try {
        const canProceed = await pre();
        if (!canProceed) return; // pre-check blocked (opened modal etc.)
      } finally {
        setChecking(false);
      }
    }

    openPaystack();
  };

  // ── UI state ──────────────────────────────────────────────────────────────
  const isInteractive = scriptStatus === "ready" && !paying && !checking && !disabled && !!email && amount > 0;

  const label = checking ? "Checking stock..."
    : paying ? "Processing..."
    : `Pay ₦${Number(amount).toLocaleString()}`;
  const icon = (checking || paying || scriptStatus === "loading")
    ? <Loader2 size={16} className="animate-spin" />
    : scriptStatus === "error" ? <AlertCircle size={16} />
    : <CreditCard size={16} />;
  const btnLabel = scriptStatus === "idle" ? "Initialising..."
    : scriptStatus === "loading" ? "Loading payment..."
    : scriptStatus === "error" ? "Payment unavailable"
    : label;

  return (
    <div className={`flex flex-col items-end gap-2 ${className}`}>
      <motion.button
        onClick={handlePay}
        disabled={!isInteractive}
        whileHover={isInteractive ? { scale: 1.02 } : {}}
        whileTap={isInteractive ? { scale: 0.97 } : {}}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        className={`relative overflow-hidden flex items-center gap-2.5 px-6 py-3 rounded-xl
          font-semibold text-sm transition-all duration-200 shadow-sm
          ${isInteractive
            ? "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-emerald-200"
            : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
        aria-label="Pay with Paystack"
      >
        <AnimatePresence mode="wait">
          <motion.span key={scriptStatus + String(paying) + String(checking)}
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}
            className="flex items-center gap-2">
            {icon}{btnLabel}
          </motion.span>
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {scriptStatus === "ready" && !paying && !checking && (
          <motion.span initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-1.5 text-xs text-gray-400">
            <ShieldCheck size={12} className="text-emerald-500" />
            Secured by Paystack
          </motion.span>
        )}
      </AnimatePresence>

      {scriptStatus === "error" && (
        <p className="text-xs text-red-500 mt-1">Could not load Paystack. Please refresh and try again.</p>
      )}
    </div>
  );
};

export default PaystackButton;
