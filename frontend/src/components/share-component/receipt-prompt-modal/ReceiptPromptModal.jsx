import { motion } from "framer-motion";

const ReceiptPromptModal = ({ open, onClose, previewBlobUrl, onDownload }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-xl w-[95%] max-w-3xl h-[90vh] flex flex-col"
      >
        {/* HEADER */}
        <div className="p-4 border-b">
          <h2 className="text-lg font-bold">🧾 Receipt Preview</h2>
          <p className="text-sm text-gray-500">
            Confirm before downloading
          </p>
        </div>

        {/* PREVIEW */}
        <div className="flex-1 bg-gray-100">
          {previewBlobUrl ? (
            <iframe
              src={previewBlobUrl}
              title="Receipt Preview"
              className="w-full h-full"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              Loading receipt…
            </div>
          )}
        </div>

        {/* ACTIONS */}
        <div className="p-4 border-t flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-200"
          >
            Close
          </button>

          <button
            onClick={onDownload}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white"
          >
            Download Receipt
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ReceiptPromptModal;
