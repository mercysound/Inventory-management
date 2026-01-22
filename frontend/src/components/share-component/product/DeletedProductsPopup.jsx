// Product/DeletedProductsPopup.jsx
import React, { useEffect } from "react";
import DeletedProductsSkeleton from "./DeletedProductsSkeleton";

const DeletedProductsPopup = ({
  open,
  onClose,
  products,
  onRestore,
  onPermanentDelete,
  loading,
}) => {
  // ✅ Close modal with ESC key
  useEffect(() => {
    if (!open) return;

    const handleEsc = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 z-50">
      <div className="bg-white w-full max-w-6xl rounded-md shadow-lg p-4 relative overflow-auto max-h-[90vh]">
        <h2 className="text-xl font-bold mb-4">Deleted Products</h2>

        {/* Close Button */}
        <button
          className="absolute top-3 right-4 font-bold text-lg"
          onClick={onClose}
          aria-label="Close modal"
        >
          ✕
        </button>

        {loading ? (
          <DeletedProductsSkeleton />
        ) : products.length === 0 ? (
          <p className="text-center text-gray-500 italic">
            No deleted products
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm sm:text-base">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="border p-2 text-left">S/N</th>
                  <th className="border p-2 text-left">Image</th>
                  <th className="border p-2 text-left">Name</th>
                  <th className="border p-2 text-left">Description</th>
                  <th className="border p-2 text-left">Category</th>
                  <th className="border p-2 text-left">Price</th>
                  <th className="border p-2 text-left">Actions</th>
                </tr>
              </thead>

              <tbody>
                {products.map((product, index) => (
                  <tr
                    key={product._id}
                    className="hover:bg-gray-50 transition align-top"
                  >
                    <td className="p-2 border">{index + 1}</td>

                    {/* Image */}
                    <td className="p-2 border">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-14 h-14 object-cover rounded border"
                      />
                    </td>

                    <td className="p-2 border font-medium">
                      {product.name}
                    </td>

                    {/* ✅ Wrapped Description (flex + break) */}
                    <td className="p-2 border">
                      <div className="flex flex-wrap break-words whitespace-pre-wrap text-gray-600 max-w-sm">
                        {product.description}
                      </div>
                    </td>

                    <td className="p-2 border">
                      {product.categoryId?.name || "N/A"}
                    </td>

                    <td className="p-2 border text-green-700 font-semibold">
                      ₦{product.price}
                    </td>

                    <td className="p-2 border">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          onClick={() => onRestore(product._id)}
                          className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Restore
                        </button>

                        <button
                          onClick={() => onPermanentDelete(product._id)}
                          className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          Delete Permanently
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
  );
};

export default DeletedProductsPopup;
