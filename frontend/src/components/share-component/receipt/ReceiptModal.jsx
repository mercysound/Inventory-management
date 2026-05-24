import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import useEscapeToClose from "./useEscapeToClose";

// ─────────────────────────────────────────────────────────────────────────────
// ReceiptModal
//
// Renders the invoice/receipt inside an <iframe>.
// The iframe src is a direct URL to the /orders/invoice endpoint which now
// returns a full self-contained HTML page. That HTML page has its own
// working buttons: PDF download, Save Image, Print, and Share (image/PDF).
//
// Because all actions live INSIDE the iframe page, this modal only needs:
//   - A close (✕) button in the header
//   - A close button in the footer
//
// Props:
//   open        — boolean, controls visibility
//   onClose     — function, called when modal should close
//   previewUrl  — string, the full invoice URL to load in the iframe
//   mode        — "preview" | "final"  (controls header label only)
//   role        — "customer" | "staff" (controls payment info display)
//   storeAccount — { bankName, accountName, accountNumber } shown for staff preview
// ─────────────────────────────────────────────────────────────────────────────
const ReceiptModal = ({
  open,
  onClose,
  previewUrl,
  mode = "final",
  role = "customer",
  storeAccount,
}) => {
  const modalRef = useRef(null);

  // Close on ESC key
  useEscapeToClose(open, onClose);

  // Move focus into the modal when it opens (fixes toast/focus issues)
  useEffect(() => {
    if (open && modalRef.current) {
      modalRef.current.focus();
    }
  }, [open]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        // Click outside to close
        onClick={onClose}
      >
        <motion.div
          ref={modalRef}
          tabIndex={-1}
          initial={{ scale: 0.95, y: 30 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 30 }}
          // Stop click from bubbling to the backdrop
          onClick={(e) => e.stopPropagation()}
          className="bg-white w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden outline-none"
        >

          {/* ── HEADER ─────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
            <div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800">
                {mode === "preview" ? (
                  <>
                    Invoice Preview{" "}
                    <span className="text-orange-500 text-base">(Unpaid)</span>
                  </>
                ) : (
                  <>
                    Receipt{" "}
                    <span className="text-green-600 text-base">(Paid)</span>
                  </>
                )}
              </h3>
              {/* Hint so users know where the action buttons are */}
              <p className="text-xs text-gray-400 mt-0.5">
                Use the buttons inside the receipt to download, save, print or share.
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

          {/* ── BODY — iframe loads the full HTML receipt page ──────────── */}
          <div className="flex-1 overflow-hidden bg-gray-100">
            {previewUrl ? (
              // The iframe loads the /orders/invoice HTML page.
              // That page contains its own PDF / Save Image / Print / Share buttons
              // which all work independently inside the iframe context.
              // allow="clipboard-write" lets the share fallback copy URLs on desktop.
              <iframe
                key={previewUrl}          // remount if URL changes
                src={previewUrl}
                title="Receipt"
                className="w-full h-full border-0 rounded-b-2xl"
                allow="clipboard-write"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-3 text-gray-400">
                  <div className="w-8 h-8 border-2 border-gray-200 border-t-indigo-400 rounded-full animate-spin" />
                  <p className="text-sm">Loading receipt…</p>
                </div>
              </div>
            )}
          </div>

          {/* ── STAFF PAYMENT INFO ───────────────────────────────────────
               Only shown when a staff member is viewing an unpaid preview
               AND storeAccount details are provided.                      */}
          {role === "staff" && mode === "preview" && storeAccount && (
            <div className="mx-4 mb-3 p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-sm flex-shrink-0">
              <h4 className="font-semibold mb-2 text-indigo-700">
                Payment Instructions
              </h4>
              <p><strong>Bank:</strong> {storeAccount.bankName}</p>
              <p><strong>Account Name:</strong> {storeAccount.accountName}</p>
              <p><strong>Account Number:</strong> {storeAccount.accountNumber}</p>
            </div>
          )}

          {/* ── FOOTER ──────────────────────────────────────────────────── */}
          <div className="flex justify-end items-center px-5 py-4 border-t border-gray-100 bg-white flex-shrink-0">
            {/* Only Close is needed here — all other actions (PDF, image,
                print, share) are handled by the buttons inside the iframe. */}
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium transition"
            >
              Close
            </button>
          </div>

        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ReceiptModal;