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
    }
  }, [editProduct, formData]);

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

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-5 rounded-md shadow w-full sm:w-3/4 md:w-1/2 lg:w-1/3 max-h-[90vh] overflow-y-auto relative">
        <h2 className="text-xl font-bold mb-4">
          {editProduct ? "Edit Product" : "Add Product"}
        </h2>

        <button
          className="absolute top-3 right-4 font-bold text-lg"
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
          <input
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Product Name"
            className="border p-2 rounded w-full"
            required
          />

          <input
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Description"
            className="border p-2 rounded w-full"
            required
          />

          <input
            type="number"
            name="price"
            value={formData.price}
            onChange={handleChange}
            placeholder="Price"
            className="border p-2 rounded w-full"
            required
          />

          <input
            type="number"
            name="stock"
            value={formData.stock}
            onChange={handleChange}
            placeholder="Stock"
            className="border p-2 rounded w-full"
            required
          />

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

          {/* IMAGE PREVIEW */}
          {preview && (
            <div className="w-24 h-24 sm:w-28 sm:h-28 border rounded overflow-hidden">
              <img
                src={preview}
                alt="Product preview"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="border p-2 rounded"
          />

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 mt-2">
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 p-3 rounded text-white ${
                loading ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
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
              className="flex-1 p-3 rounded bg-red-500 text-white hover:bg-red-600"
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
