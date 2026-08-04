// CategoryForm.jsx — portal modal for Add / Edit category
import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Tag, FileText, Loader2, Pencil, FolderPlus } from "lucide-react";

const CategoryForm = ({
  open,
  categoryName,
  categoryDescription,
  editCategory,
  onSubmit,
  onCancel,
  onChangeName,
  onChangeDescription,
  loading = false,
}) => {
  const nameRef = useRef(null);

  // Auto-focus the name input when modal opens
  useEffect(() => {
    if (open) {
      setTimeout(() => nameRef.current?.focus(), 80);
    }
  }, [open]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(15,23,42,0.6)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "16px",
          }}
          onMouseDown={onCancel}
        >
          <motion.div
            initial={{ scale: 0.93, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.93, opacity: 0, y: 16 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            onMouseDown={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
            style={{ width: "100%", maxWidth: "440px", maxHeight: "calc(100dvh - 32px)" }}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-sm
                  ${editCategory ? "bg-indigo-600" : "bg-green-600"}`}>
                  {editCategory
                    ? <Pencil size={15} className="text-white" />
                    : <FolderPlus size={15} className="text-white" />}
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                    {editCategory ? "Edit Category" : "Add New Category"}
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {editCategory ? "Update the category details below" : "Fill in the details for the new category"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onCancel}
                className="w-8 h-8 flex items-center justify-center rounded-full
                  bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300
                  hover:bg-gray-200 dark:hover:bg-gray-600 transition flex-shrink-0"
                aria-label="Close"
              >
                <X size={15} />
              </button>
            </div>

            {/* ── Form body ── */}
            <form onSubmit={onSubmit} className="px-6 py-5 space-y-4 overflow-y-auto flex-1">

              {/* Name field */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400
                  uppercase tracking-wide flex items-center gap-1.5">
                  <Tag size={10} /> Category Name <span className="text-red-400">*</span>
                </label>
                <input
                  ref={nameRef}
                  type="text"
                  placeholder="e.g. Electronics, Beverages, Clothing…"
                  value={categoryName}
                  onChange={onChangeName}
                  required
                  maxLength={80}
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3
                    text-sm text-gray-800 dark:text-gray-100
                    bg-gray-50 dark:bg-gray-800
                    placeholder:text-gray-400 dark:placeholder:text-gray-500
                    focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent
                    transition-all"
                />
                {categoryName.length > 0 && (
                  <p className="text-[10px] text-gray-400 text-right">
                    {categoryName.length}/80
                  </p>
                )}
              </div>

              {/* Description field */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400
                  uppercase tracking-wide flex items-center gap-1.5">
                  <FileText size={10} /> Description <span className="text-red-400">*</span>
                </label>
                <textarea
                  placeholder="Briefly describe what products belong in this category…"
                  value={categoryDescription}
                  onChange={onChangeDescription}
                  required
                  maxLength={200}
                  rows={3}
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3
                    text-sm text-gray-800 dark:text-gray-100
                    bg-gray-50 dark:bg-gray-800
                    placeholder:text-gray-400 dark:placeholder:text-gray-500
                    focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent
                    transition-all resize-none"
                />
                {categoryDescription.length > 0 && (
                  <p className="text-[10px] text-gray-400 text-right">
                    {categoryDescription.length}/200
                  </p>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-1 pb-2">
                <motion.button
                  type="submit"
                  disabled={loading || !categoryName.trim() || !categoryDescription.trim()}
                  whileTap={{ scale: 0.97 }}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl
                    font-semibold text-sm text-white shadow-sm transition
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${editCategory
                      ? "bg-indigo-600 hover:bg-indigo-700"
                      : "bg-green-600 hover:bg-green-700"}`}
                >
                  {loading ? (
                    <><Loader2 size={15} className="animate-spin" /> Saving…</>
                  ) : editCategory ? (
                    <><Pencil size={15} /> Save Changes</>
                  ) : (
                    <><FolderPlus size={15} /> Add Category</>
                  )}
                </motion.button>
                <button
                  type="button"
                  onClick={onCancel}
                  className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-600
                    text-sm font-semibold text-gray-600 dark:text-gray-300
                    hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default CategoryForm;
