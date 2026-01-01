import { motion, AnimatePresence } from "framer-motion";

const StaffReceiptPromptModal = ({
  show,
  onClose,
  receiptBlob,
  receiptMode,
  onDownload,
  storeAccount,
}) => {
  if (!show || !receiptBlob) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          className="bg-white w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <h3 className="text-lg sm:text-xl font-semibold">
              {receiptMode === "preview" ? (
                <>
                  Invoice Preview <span className="text-orange-500">(UNPAID)</span>
                </>
              ) : (
                <>
                  Final Receipt <span className="text-green-600">(PAID)</span>
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

          {/* PDF Preview */}
          <div className="flex-1 bg-gray-50 p-2 sm:p-4">
            <iframe
              src={URL.createObjectURL(receiptBlob)}
              className="w-full h-full rounded-lg border bg-white"
              title="Invoice Preview"
            />
          </div>

          {/* Payment Instructions */}
          {receiptMode === "preview" && storeAccount && (
            <div className="mx-4 mb-3 p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-sm">
              <h4 className="font-semibold mb-2 text-indigo-700">
                Payment Instructions
              </h4>
              <p><strong>Bank:</strong> {storeAccount.bankName}</p>
              <p><strong>Account Name:</strong> {storeAccount.accountName}</p>
              <p><strong>Account Number:</strong> {storeAccount.accountNumber}</p>
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-between items-center px-5 py-4 border-t bg-white">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100"
            >
              Close
            </button>
            <button
              onClick={onDownload}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow"
            >
              Download
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default StaffReceiptPromptModal;
