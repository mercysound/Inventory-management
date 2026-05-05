import React, { useEffect, useState } from "react";

const ProductForm = ({
  open,
  editProduct,
  formData,
  setFormData,
  categories,
  suppliers,
  onSubmit,
  onClose,
  setImage,
}) => {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState("");

  // Auto-load image preview when editing
  useEffect(() => {
    if (editProduct && formData?.image) {
      setPreview(formData.image);
    } else if (!editProduct) {
      setPreview(""); // ✅ clear preview when opening for a new product
    }
  }, [editProduct, formData?.image]);

  // ESC key listener
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  // ✅ IMAGE UPLOAD
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  // ❌ REMOVE IMAGE
  const handleRemoveImage = () => {
    setPreview("");
    setImage(null);

    setFormData((prev) => ({
      ...prev,
      image: "",
      removeImage: true, // ✅ IMPORTANT FLAG
    }));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-5 rounded-md shadow w-full sm:w-3/4 md:w-1/2 lg:w-1/3 max-h-[90vh] overflow-y-auto relative">
        <h2 className="text-xl font-bold mb-4">
          {editProduct ? "Edit Product" : "Add Product"}
        </h2>

        {/* CLOSE BUTTON - add disabled */}
        <button
          className="absolute top-3 right-4 font-bold text-lg disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={onClose}
          disabled={loading}
        >
          ✕
        </button>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (loading) return;

            setLoading(true);
            try {
              await onSubmit();
            } finally {
              setLoading(false);
            }
          }}
          className="flex flex-col gap-3"
        >
          {/* NAME */}
          <input
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Product Name"
            className="border p-2 rounded w-full"
            required
          />

          {/* DESCRIPTION */}
          <input
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Description"
            className="border p-2 rounded w-full"
            required
          />

          {/* PRICE */}
          <input
            type="number"
            name="price"
            value={formData.price}
            onChange={(e) => {
              const value = e.target.value;

              if (value === "") {
                setFormData((prev) => ({ ...prev, price: "" }));
                return;
              }

              const num = Number(value);
              if (num < 0) return; // block negatives

              setFormData((prev) => ({ ...prev, price: num }));
            }}
            placeholder="Price"
            className="border p-2 rounded w-full"
            min="0"
            required
          />

          {/* STOCK (NO NEGATIVE) */}
          <input
            type="number"
            name="stock"
            value={formData.stock}
            onChange={(e) => {
              const value = e.target.value;

              // allow empty input (important UX fix)
              if (value === "") {
                setFormData((prev) => ({
                  ...prev,
                  stock: "",
                }));
                return;
              }

              const num = Number(value);

              if (num < 0) return; // block negatives

              setFormData((prev) => ({
                ...prev,
                stock: num,
              }));
            }}
            placeholder="Stock"
            className="border p-2 rounded w-full"
            min="0"
            required
          />

          {/* CATEGORY */}
          <select
            name="categoryId"
            value={formData.categoryId}
            onChange={handleChange}
            className="border p-2 rounded w-full"
            required
          >
            <option value="">Select Category</option>
            {categories?.map((cat) => (
              <option key={cat._id} value={cat._id}>
                {cat.name}
              </option>
            ))}
          </select>

          {/* SUPPLIER */}
          <select
            name="supplierId"
            value={formData.supplierId}
            onChange={handleChange}
            className="border p-2 rounded w-full"
            required
          >
            <option value="">Select Supplier</option>
            {suppliers?.map((sup) => (
              <option key={sup._id} value={sup._id}>
                {sup.name}
              </option>
            ))}
          </select>

          {/* IMAGE PREVIEW WITH REMOVE BUTTON */}
          {preview && (
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 border rounded overflow-hidden">
              <img
                src={preview}
                alt="Product preview"
                className="w-full h-full object-cover"
              />

              {/* ❌ REMOVE IMAGE BUTTON */}
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-1 right-1 bg-black/70 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
              >
                ✕
              </button>
            </div>
          )}

          {/* IMAGE INPUT */}
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="border p-2 rounded"
          />

          {/* ACTION BUTTONS */}
          <div className="flex flex-col sm:flex-row gap-2 mt-2">
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 p-3 rounded text-white ${loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700"
                }`}
            >
              {loading
                ? editProduct
                  ? "Saving..."
                  : "Adding..."
                : editProduct
                  ? "Save Changes"
                  : "Add Product"}
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={loading} 
              className="flex-1 p-3 rounded bg-red-500 text-white hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductForm;