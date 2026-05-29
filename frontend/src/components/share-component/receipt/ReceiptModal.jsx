import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import axiosInstance from "../../../utils/axiosInstance";
import useEscapeToClose from "./useEscapeToClose";

// ─────────────────────────────────────────────────────────────────────────────
// ReceiptModal
//
// Fetches the invoice HTML via axiosInstance (auth handled automatically)
// and injects it as a blob URL into the iframe.
//
// This approach:
//   ✅ No URL/React Router interception issues
//   ✅ No auth token in query string
//   ✅ Works on all devices and browsers
//   ✅ No buildInvoiceUrl helper needed
//
// Props:
//   open          — boolean
//   onClose       — function
//   invoiceParams — object: the query params sent to /orders/invoice
//                   e.g. { mode, customerName, paymentMethod, orderId, ... }
//   mode          — "preview" | "final"  (for header label only)
//   role          — "customer" | "staff" | "admin"
//   storeAccount  — { bankName, accountName, accountNumber } for staff preview
// ─────────────────────────────────────────────────────────────────────────────
const ReceiptModal = ({
  open,
  onClose,
  invoiceParams,
  previewUrl, // legacy: direct PDF URL created from blob
  blob,       // legacy: PDF blob
  mode = "final",
  role = "customer",
  storeAccount,
  onDownload, // optional custom download handler
}) => {
  const modalRef            = useRef(null);
  const [html, setHtml]     = useState("");
  const [fetching, setFetching] = useState(false);
  const [blobUrl, setBlobUrl] = useState("");
  const [contentUrl, setContentUrl] = useState("");

  useEscapeToClose(open, onClose);

  useEffect(() => {
    if (open && modalRef.current) modalRef.current.focus();
  }, [open]);

  // ── Fetch the HTML receipt via axios whenever the modal opens ─────────────
  // axios automatically attaches the Authorization header from localStorage,
  // so no token-in-URL trick is needed. The response is a plain HTML string
  // which we wrap in a blob URL and render inside the iframe.
  useEffect(() => {
    // Reset state
    setHtml("");
    setFetching(false);

    // Cleanup any object URL created from blob or HTML content
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        setBlobUrl("");
      }
      if (contentUrl) {
        URL.revokeObjectURL(contentUrl);
        setContentUrl("");
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;

    // Priority: invoiceParams (fetch HTML) > previewUrl (direct PDF URL) > blob (PDF blob)
    if (invoiceParams) {
      let cancelled = false;
      setHtml("");
      setFetching(true);

      axiosInstance
        .get("/orders/invoice", { params: invoiceParams })
        .then((res) => {
          if (!cancelled) {
            setHtml(res.data); // res.data is the HTML string
            try {
              const url = URL.createObjectURL(
                new Blob([res.data], { type: "text/html" })
              );
              setContentUrl(url);
            } catch (err) {
              console.error("Failed to create HTML content URL", err);
            }
          }
        })
        .catch((err) => {
          if (!cancelled) {
            console.error("Receipt fetch error:", err);
            toast.error("Failed to load receipt. Please try again.");
          }
        })
        .finally(() => {
          if (!cancelled) setFetching(false);
        });

      return () => { cancelled = true; };
    }

    if (previewUrl) {
      // nothing to fetch — iframe will point to previewUrl
      setHtml("");
      setFetching(false);
      return;
    }

    if (blob) {
      try {
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
        setFetching(false);
      } catch (err) {
        console.error("Failed to create blob URL", err);
        toast.error("Failed to load receipt. Please try again.");
      }
      return;
    }
  }, [open, JSON.stringify(invoiceParams), previewUrl, blob]);

  // ── Download PDF ──────────────────────────────────────────────────────────
  // Re-fetches with download=true which returns a PDF blob.
  // axios handles auth — no URL building needed.
  const handleDownload = async () => {
    // If parent provided a custom download handler, use it
    if (typeof onDownload === "function") return onDownload();

    // If invoiceParams available, re-fetch PDF blob from server
    if (invoiceParams) {
      try {
        const res = await axiosInstance.get("/orders/invoice", {
          params: { ...invoiceParams, download: "true" },
          responseType: "blob",
        });
        const url  = URL.createObjectURL(res.data);
        const a    = document.createElement("a");
        a.href     = url;
        a.download = "receipt.pdf";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch {
        toast.error("Failed to download PDF. Please try again.");
      }
      return;
    }

    // If a blob URL or previewUrl exists, download from that
    const src = blobUrl || previewUrl;
    if (src) {
      try {
        const a = document.createElement("a");
        a.href = src;
        a.download = "receipt.pdf";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch {
        toast.error("Failed to download PDF. Please try again.");
      }
      return;
    }

    toast.error("Receipt not available for download");
  };

  // ── Print ─────────────────────────────────────────────────────────────────
  // Prints the iframe content directly.
  const handlePrint = () => {
    const iframe = document.getElementById("receipt-iframe");
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          ref={modalRef}
          tabIndex={-1}
          initial={{ scale: 0.95, y: 30 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white w-full max-w-2xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden outline-none"
        >
          {/* ── HEADER ── */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">
                {mode === "preview" ? (
                  <>Invoice Preview <span className="text-orange-500 text-base">(Unpaid)</span></>
                ) : (
                  <>Receipt <span className="text-green-600 text-base">(Paid)</span></>
                )}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Use the buttons below to download or print.
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition flex-shrink-0"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* ── BODY ── */}
          <div className="flex-1 overflow-hidden bg-gray-100">
            {fetching ? (
              // Loading spinner while HTML is being fetched
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-3 text-gray-400">
                  <div className="w-8 h-8 border-2 border-gray-200 border-t-indigo-400 rounded-full animate-spin" />
                  <p className="text-sm">Loading receipt...</p>
                </div>
              </div>
            ) : contentUrl || previewUrl || blobUrl ? (
              // Render provided content URL or PDF URL
              <iframe
                id="receipt-iframe"
                key={JSON.stringify(invoiceParams)}
                src={contentUrl || previewUrl || blobUrl}
                title="Receipt"
                className="w-full h-full border-0"
                sandbox="allow-modals allow-scripts"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-gray-400">Receipt not available.</p>
              </div>
            )}
          </div>

          {/* ── STAFF PAYMENT INFO ── */}
          {role === "staff" && mode === "preview" && storeAccount && (
            <div className="mx-4 mb-3 p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-sm flex-shrink-0">
              <h4 className="font-semibold mb-2 text-indigo-700">Payment Instructions</h4>
              <p><strong>Bank:</strong> {storeAccount.bankName}</p>
              <p><strong>Account Name:</strong> {storeAccount.accountName}</p>
              <p><strong>Account Number:</strong> {storeAccount.accountNumber}</p>
            </div>
          )}

          {/* ── FOOTER — buttons in React, no CSP/iframe issues ── */}
          <div className="flex justify-between items-center px-5 py-4 border-t border-gray-100 bg-white flex-shrink-0 gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium transition"
            >
              Close
            </button>
            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                disabled={!(html || previewUrl || blobUrl) || fetching}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium transition disabled:opacity-40"
              >
                🖨 Print
              </button>
              <button
                onClick={handleDownload}
                disabled={!(invoiceParams || previewUrl || blobUrl || typeof onDownload === 'function') || fetching}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow transition disabled:opacity-40"
              >
                ⬇ Download PDF
              </button>
            </div>
          </div>

        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ReceiptModal;