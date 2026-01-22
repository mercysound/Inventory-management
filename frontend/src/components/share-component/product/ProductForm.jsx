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

  // Handle inputs
  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  // Handle image change
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white p-5 rounded-md shadow w-1/3 relative">
        <h2 className="text-xl font-bold">
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

            if (loading) return; // prevent double submit

            setLoading(true);
            try {
              await onSubmit(); // ✅ parent handles logic
            } finally {
              setLoading(false);
            }
          }}
        >
          <input
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Product Name"
            className="border p-2 rounded"
            required
          />

          <input
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Description"
            className="border p-2 rounded"
            required
          />

          <input
            type="number"
            name="price"
            value={formData.price}
            onChange={handleChange}
            placeholder="Price"
            className="border p-2 rounded"
            required
          />

          <input
            type="number"
            name="stock"
            value={formData.stock}
            onChange={handleChange}
            placeholder="Stock"
            className="border p-2 rounded"
            required
          />

          <select
            name="categoryId"
            value={formData.categoryId}
            onChange={handleChange}
            className="border p-2 rounded"
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
            className="border p-2 rounded"
            required
          >
            <option value="">Select Supplier</option>
            {suppliers?.map((sup) => (
              <option key={sup._id} value={sup._id}>
                {sup.name}
              </option>
            ))}
          </select>

          {/* IMAGE PREVIEW — ALWAYS AUTO LOAD */}
          {preview && (
            <div className="w-28 h-28 border rounded overflow-hidden">
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

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className={`w-full p-3 rounded text-white ${loading
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
              className="w-full p-3 rounded bg-red-500 text-white hover:bg-red-600"
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
