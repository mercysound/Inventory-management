import React from 'react';
import { motion } from 'framer-motion';

const ConfirmDialog = ({ open, title, message, onConfirm, onCancel, dangerText = 'Delete', cancelText = 'Cancel' }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-md rounded-xl bg-slate-900 p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="mt-2 text-sm text-slate-400">{message}</p>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onCancel} className="rounded-md px-4 py-2 text-sm bg-slate-700 text-slate-200 hover:bg-slate-600">
            {cancelText}
          </button>
          <button onClick={onConfirm} className="rounded-md px-4 py-2 text-sm bg-rose-600 text-white hover:bg-rose-500">
            {dangerText}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ConfirmDialog;
