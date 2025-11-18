import React from "react";

const ProductForm = ({
  open,
  editProduct,
  formData,
  setFormData,
  categories,
  suppliers,
  onSubmit,
  onClose,
}) => {
  const handleChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  if (!open) return null;

  return (
    <div className="fixed top-0 left-0 w-full h-full bg-black/50 flex justify-center items-center">
      <div className="bg-white p-4 rounded shadow-md w-1/3 relative">
        <h1 className="text-xl font-bold">
          {editProduct ? "Edit Product" : "Add Product"}
        </h1>
        <button
          className="absolute top-4 right-4 font-bold text-lg cursor-pointer"
          onClick={onClose}
        >
          X
        </button>

        <form className="flex flex-col gap-4 mt-4" onSubmit={onSubmit}>
          <input
            required
            type="text"
            placeholder="Product Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="border p-1 bg-white rounded px-4"
          />
          <input
            required
            type="text"
            placeholder="Description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="border p-1 bg-white rounded px-4"
          />
          <input
            required
            type="number"
            placeholder="Enter price"
            name="price"
            value={formData.price}
            onChange={handleChange}
            className="border p-1 bg-white rounded px-4"
          />
          <input
            required
            type="number"
            placeholder="Enter stock"
            name="stock"
            min="0"
            value={formData.stock}
            onChange={handleChange}
            className="border p-1 bg-white rounded px-4"
          />

          <select
            required
            name="categoryId"
            className="border p-2 rounded"
            value={formData.categoryId}
            onChange={handleChange}
          >
            <option value="">Select Category</option>
            {categories?.map((cat) => (
              <option key={cat._id} value={cat._id}>
                {cat.name}
              </option>
            ))}
          </select>

          <select
            required
            name="supplierId"
            className="border p-2 rounded"
            value={formData.supplierId}
            onChange={handleChange}
          >
            <option value="">Select Supplier</option>
            {suppliers?.map((sup) => (
              <option key={sup._id} value={sup._id}>
                {sup.name}
              </option>
            ))}
          </select>

          <div className="flex space-x-2">
            <button
              type="submit"
              className="w-full mt-2 rounded-md bg-green-500 text-white p-3 cursor-pointer hover:bg-green-600"
            >
              {editProduct ? "Save Changes" : "Add Product"}
            </button>
            <button
              type="button"
              className="w-full mt-2 rounded-md bg-red-500 text-white p-3 cursor-pointer hover:bg-red-600"
              onClick={onClose}
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
