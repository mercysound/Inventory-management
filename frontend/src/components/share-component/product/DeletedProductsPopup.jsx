import React, { useEffect, useState, useRef } from "react";
import { RotateCcw, Trash2, X } from "lucide-react";
import DeletedProductsSkeleton from "./DeletedProductsSkeleton";

const DeletedProductsPopup = ({
  open, onClose, products, onRestore, onPermanentDelete,
  onBulkPermanentDelete, loading,
}) => {
  const [selectedIds, setSelectedIds] = useState([]);
  // ── All hooks MUST be called before any early return ──────────────────────
  const selectAllRef = useRef(null);

  // Reset selection whenever popup opens or product list changes
  useEffect(() => { setSelectedIds([]); }, [open, products]);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  // ── Derived values (after all hooks) ─────────────────────────────────────
  const allSelected  = products.length > 0 && selectedIds.length === products.length;
  const someSelected = selectedIds.length > 0 && !allSelected;

  const toggleOne = (id, checked) =>
    setSelectedIds((prev) => checked ? [...prev, id] : prev.filter((x) => x !== id));

  const toggleAll = (checked) =>
    setSelectedIds(checked ? products.map((p) => p._id) : []);

  const handleBulkDelete = () => {
    if (!selectedIds.length) return;
    if (!window.confirm(`Permanently delete ${selectedIds.length} product(s)? This cannot be undone.`)) return;
    onBulkPermanentDelete?.(selectedIds);
    setSelectedIds([]);
  };

  // Early return AFTER all hooks
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white w-full max-w-5xl rounded-xl shadow-xl relative overflow-hidden flex flex-col max-h-[88vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Deleted products</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {products.length} {products.length === 1 ? "product" : "products"} in trash
            </p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition"
            aria-label="Close">
            <X size={15} />
          </button>
        </div>

        {/* Bulk action bar — shown when any items selected */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-3 px-5 py-2.5 bg-red-50 border-b border-red-100">
            <span className="text-sm font-semibold text-red-700">
              {selectedIds.length} selected
            </span>
            <button
              onClick={handleBulkDelete}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition"
            >
              <Trash2 size={12} /> Delete forever
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="ml-auto inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-gray-100 transition border border-gray-200"
            >
              <X size={12} /> Clear
            </button>
          </div>
        )}

        {/* Body */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="p-6"><DeletedProductsSkeleton /></div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <Trash2 size={36} strokeWidth={1.2} className="mb-3 text-gray-300" />
              <p className="text-sm font-medium text-gray-500">No deleted products</p>
              <p className="text-xs mt-1">Items you delete will appear here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead className="sticky top-0 z-10 bg-gray-50 text-gray-500">
                  <tr>
                    {/* Select-all checkbox */}
                    <th className="px-4 py-3 w-8 border-b border-gray-100">
                      <input
                        type="checkbox"
                        ref={(el) => { if (el) el.indeterminate = someSelected; }}
                        checked={allSelected}
                        onChange={(e) => toggleAll(e.target.checked)}
                        className="w-4 h-4 rounded accent-red-600 cursor-pointer"
                        title="Select all"
                      />
                    </th>
                    {["#", "Image", "Name", "Description", "Category", "Price", "Actions"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-[11px] font-medium uppercase tracking-wide border-b border-gray-100">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {products.map((product, index) => (
                    <tr key={product._id}
                      className={`hover:bg-gray-50 transition-colors align-middle border-b border-gray-50 last:border-none
                        ${selectedIds.includes(product._id) ? "bg-red-50/40" : ""}`}>

                      {/* Row checkbox */}
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(product._id)}
                          onChange={(e) => toggleOne(product._id, e.target.checked)}
                          className="w-4 h-4 rounded accent-red-600 cursor-pointer"
                        />
                      </td>

                      <td className="px-4 py-3 text-gray-400 text-xs">{index + 1}</td>

                      <td className="px-4 py-3">
                        <div className="w-10 h-10 rounded-md border border-gray-100 overflow-hidden bg-gray-50 flex items-center justify-center">
                          {product.image ? (
                            <img src={product.image} alt={product.name} className="w-full h-full object-cover opacity-70" />
                          ) : (
                            <span className="text-[9px] text-gray-400 text-center leading-tight px-1">No image</span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">{product.name}</td>

                      <td className="px-4 py-3 max-w-[200px]">
                        <p className="text-gray-400 text-xs line-clamp-2 leading-relaxed">{product.description}</p>
                      </td>

                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-500">
                          {product.categoryId?.name || "N/A"}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-gray-500 font-medium whitespace-nowrap">
                        ₦{Number(product.price).toLocaleString()}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onRestore(product._id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition border border-blue-100"
                          >
                            <RotateCcw size={12} /> Restore
                          </button>
                          <button
                            onClick={() => onPermanentDelete(product._id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition border border-red-100"
                          >
                            <Trash2 size={12} /> Delete forever
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeletedProductsPopup;
