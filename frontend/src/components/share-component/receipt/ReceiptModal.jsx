import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import useEscapeToClose from "./useEscapeToClose";
import buildInvoiceUrl from "../../../utils/buildInvoiceUrl";

// ─────────────────────────────────────────────────────────────────────────────
// ReceiptModal
//
// Shows the receipt in an iframe (pure HTML, no scripts — CSP safe).
// Download PDF and Print buttons live here in React, outside the iframe,
// so they are never affected by the iframe's Content Security Policy.
// ─────────────────────────────────────────────────────────────────────────────
const ReceiptModal = ({
  open,
  onClose,
  previewUrl,       // the HTML receipt URL loaded in the iframe
  mode = "final",
  role = "customer",
  storeAccount,
}) => {
  const modalRef = useRef(null);

  useEscapeToClose(open, onClose);

  useEffect(() => {
    if (open && modalRef.current) modalRef.current.focus();
  }, [open]);

  // ── Download PDF ──────────────────────────────────────────────────────────
  // Build the download URL by appending ?download=true to the same params.
  // This hits the same endpoint which returns a raw PDF blob when that flag
  // is present — completely outside the iframe, no CSP involvement.
  const handleDownload = () => {
    if (!previewUrl) return;
    // Parse existing params from previewUrl and add download=true
    const urlObj   = new URL(previewUrl);
    urlObj.searchParams.set("download", "true");
    // Trigger download via a hidden <a> tag
    const a        = document.createElement("a");
    a.href         = urlObj.toString();
    a.download     = "receipt.pdf";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // ── Print ─────────────────────────────────────────────────────────────────
  // Open the receipt HTML in a new tab and call window.print() on it.
  // This avoids any iframe print restrictions.
  const handlePrint = () => {
    if (!previewUrl) return;
    const printWindow = window.open(previewUrl, "_blank");
    if (printWindow) {
      printWindow.onload = () => printWindow.print();
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

          {/* ── IFRAME — pure HTML receipt, no scripts ── */}
          <div className="flex-1 overflow-hidden bg-gray-100">
            {previewUrl ? (
              <iframe
                key={previewUrl}
                src={previewUrl}
                title="Receipt"
                className="w-full h-full border-0"
                allow=""
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-3 text-gray-400">
                  <div className="w-8 h-8 border-2 border-gray-200 border-t-indigo-400 rounded-full animate-spin" />
                  <p className="text-sm">Loading receipt...</p>
                </div>
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

          {/* ── FOOTER — buttons live in React, outside iframe, no CSP issues ── */}
          <div className="flex justify-between items-center px-5 py-4 border-t border-gray-100 bg-white flex-shrink-0 gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium transition"
            >
              Close
            </button>

            <div className="flex gap-2">
              {/* Print — opens receipt in new tab and prints */}
              <button
                onClick={handlePrint}
                disabled={!previewUrl}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium transition disabled:opacity-40"
              >
                🖨 Print
              </button>

              {/* Download PDF — fetches ?download=true from backend */}
              <button
                onClick={handleDownload}
                disabled={!previewUrl}
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