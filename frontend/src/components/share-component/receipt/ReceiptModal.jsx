import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import useEscapeToClose from "./useEscapeToClose";

const ReceiptModal = ({
  open,
  onClose,
  blob,
  html,
  previewUrl,
  downloadUrl,
  mode = "final",
  role = "customer",
  onDownload,
  storeAccount,
}) => {
  const modalRef = useRef(null);
  const iframeRef = useRef(null);
  const [objectUrl, setObjectUrl] = useState(null);

  // ✅ ESC KEY (GLOBAL)
  useEscapeToClose(open, onClose);

  // ✅ FORCE FOCUS (THIS FIXES TOAST ISSUE)
  useEffect(() => {
    if (open && modalRef.current) {
      modalRef.current.focus();
    }
  }, [open]);

  // ✅ HANDLE BLOB PREVIEW
  useEffect(() => {
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    setObjectUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [blob]);

  if (!open) return null;

  const iframeProps = html
    ? { srcDoc: html }
    : { src: previewUrl || objectUrl };

  const handlePrint = () => {
    if (iframeRef.current?.contentWindow?.print) {
      iframeRef.current.contentWindow.print();
      return;
    }
    window.print();
  };

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
      return;
    }
    if (!downloadUrl) return;

    const link = document.createElement("a");
    link.href = downloadUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          ref={modalRef}
          tabIndex={-1} // ⭐ REQUIRED FOR PROGRAMMATIC FOCUS
          initial={{ scale: 0.95, y: 30 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 30 }}
          className="bg-white w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden outline-none"
        >
          {/* ================= HEADER ================= */}
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <h3 className="text-lg sm:text-xl font-semibold">
              {mode === "preview" ? (
                <>
                  Invoice Preview <span className="text-orange-500">(UNPAID)</span>
                </>
              ) : (
                <>
                  Receipt <span className="text-green-600">(PAID)</span>
                </>
              )}
            </h3>

            <button
              onClick={onClose}
              className="text-gray-400 hover:text-black text-xl"
            >
              ✕
            </button>
          </div>

          {/* ================= BODY ================= */}
          <div className="flex-1 bg-gray-50 p-2 sm:p-4">
            {(html || previewUrl || objectUrl) ? (
              <iframe
                ref={iframeRef}
                {...iframeProps}
                title="Receipt Preview"
                className="w-full h-full rounded-lg border bg-white"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                Loading receipt...
              </div>
            )}
          </div>

          {/* ================= STAFF PAYMENT INFO ================= */}
          {role === "staff" && mode === "preview" && storeAccount && (
            <div className="mx-4 mb-3 p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-sm">
              <h4 className="font-semibold mb-2 text-indigo-700">
                Payment Instructions
              </h4>
              <p><strong>Bank:</strong> {storeAccount.bankName}</p>
              <p><strong>Account Name:</strong> {storeAccount.accountName}</p>
              <p><strong>Account Number:</strong> {storeAccount.accountNumber}</p>
            </div>
          )}

          {/* ================= FOOTER ================= */}
          <div className="flex justify-between items-center px-5 py-4 border-t bg-white">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100"
            >
              Close
            </button>

            <div className="flex gap-3">
              <button
                onClick={handlePrint}
                className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100"
              >
                Print
              </button>

              <button
                onClick={handleDownload}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow"
              >
                Download
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ReceiptModal;
