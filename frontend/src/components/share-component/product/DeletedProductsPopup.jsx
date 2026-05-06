import React, { useEffect } from "react";
import { RotateCcw, Trash2, X } from "lucide-react";
import DeletedProductsSkeleton from "./DeletedProductsSkeleton";

const DeletedProductsPopup = ({
  open, onClose, products, onRestore, onPermanentDelete, loading,
}) => {
  useEffect(() => {
    if (!open) return;
    const handleEsc = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

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
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition"
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>

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
                    {["#", "Image", "Name", "Description", "Category", "Price", "Actions"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-[11px] font-medium uppercase tracking-wide border-b border-gray-100">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {products.map((product, index) => (
                    <tr key={product._id} className="hover:bg-gray-50 transition-colors align-middle border-b border-gray-50 last:border-none">
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