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

  useEffect(() => {
    if (editProduct && formData?.image) {
      setPreview(formData.image);
    } else if (!editProduct) {
      setPreview("");
    }
  }, [editProduct, formData?.image]);

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

  const handleRemoveImage = () => {
    setPreview("");
    setImage(null);
    setFormData((prev) => ({
      ...prev,
      image: "",
      removeImage: true,
    }));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded-xl shadow-xl w-full sm:w-3/4 md:w-[520px] max-h-[90vh] overflow-y-auto relative">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {editProduct ? "Edit product" : "Add product"}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {editProduct ? "Update the product details below" : "Fill in the details for the new product"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            ✕
          </button>
        </div>

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
          className="flex flex-col gap-4"
        >
          <div className="grid grid-cols-2 gap-3">

            {/* NAME — full width */}
            <div className="col-span-2">
              <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
                Product name
              </label>
              <input
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Wireless Headset"
                className="border border-gray-200 p-2.5 rounded-lg w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                required
              />
            </div>

            {/* DESCRIPTION — full width */}
            <div className="col-span-2">
              <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Brief product description"
                rows={2}
                className="border border-gray-200 p-2.5 rounded-lg w-full text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                required
              />
            </div>

            {/* PRICE */}
            <div>
              <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
                Price (₦)
              </label>
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
                  if (num < 0) return;
                  setFormData((prev) => ({ ...prev, price: num }));
                }}
                placeholder="0"
                min="0"
                className="border border-gray-200 p-2.5 rounded-lg w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                required
              />
            </div>

            {/* STOCK */}
            <div>
              <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
                Stock
              </label>
              <input
                type="number"
                name="stock"
                value={formData.stock}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "") {
                    setFormData((prev) => ({ ...prev, stock: "" }));
                    return;
                  }
                  const num = Number(value);
                  if (num < 0) return;
                  setFormData((prev) => ({ ...prev, stock: num }));
                }}
                placeholder="0"
                min="0"
                className="border border-gray-200 p-2.5 rounded-lg w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                required
              />
            </div>

            {/* CATEGORY */}
            <div>
              <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
                Category
              </label>
              <select
                name="categoryId"
                value={formData.categoryId}
                onChange={handleChange}
                className="border border-gray-200 p-2.5 rounded-lg w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                required
              >
                <option value="">Select category</option>
                {categories?.map((cat) => (
                  <option key={cat._id} value={cat._id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* SUPPLIER */}
            <div>
              <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
                Supplier
              </label>
              <select
                name="supplierId"
                value={formData.supplierId}
                onChange={handleChange}
                className="border border-gray-200 p-2.5 rounded-lg w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
              >
                <option value="">Select supplier</option>
                {suppliers?.map((sup) => (
                  <option key={sup._id} value={sup._id}>
                    {sup.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* IMAGE UPLOAD */}
          <div>
            <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
              Product image
            </label>

            {preview ? (
              <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-200">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full flex items-center justify-center text-[10px] hover:bg-red-600 transition"
                >
                  ✕
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-gray-200 rounded-lg p-6 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition">
                <svg
                  className="w-6 h-6 text-gray-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 5v10M7 10l5-5 5 5"
                  />
                  <rect
                    x="3"
                    y="18"
                    width="18"
                    height="2"
                    rx="1"
                    fill="currentColor"
                    opacity="0.2"
                  />
                </svg>
                <span className="text-xs text-gray-400">Click to upload or drag & drop</span>
                <span className="text-[11px] text-gray-300">PNG, JPG, WEBP up to 5MB</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold text-white transition ${
                loading
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {loading
                ? editProduct ? "Saving..." : "Adding..."
                : editProduct ? "Save changes" : "Add product"}
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
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