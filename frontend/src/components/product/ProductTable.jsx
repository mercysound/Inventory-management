import React from "react";
import { Pencil, Trash2, Plus } from "lucide-react";

const ProductTable = ({ products, onEdit, onDelete, onAddClick }) => {
  return (
    <div className="w-full bg-white shadow-md rounded-lg overflow-hidden">
      <div className="flex justify-between items-center p-4 flex-col sm:flex-row gap-3">
        <h2 className="text-lg font-bold text-gray-800">Product List</h2>
        <button
          onClick={onAddClick}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition"
        >
          <Plus size={18} /> Add Product
        </button>
      </div>

      {/* Responsive Scrollable Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm sm:text-base">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="border border-gray-200 p-2 text-left">S/N</th>
              <th className="border border-gray-200 p-2 text-left">Name</th>
              <th className="border border-gray-200 p-2 text-left">Category</th>
              <th className="border border-gray-200 p-2 text-left">Price</th>
              <th className="border border-gray-200 p-2 text-left">Stock</th>
              <th className="border border-gray-200 p-2 text-left">Description</th>
              <th className="border border-gray-200 p-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products && products.length > 0 ? (
              products.map((product, index) => (
                <tr
                  key={product._id}
                  className="hover:bg-gray-50 transition border-b"
                >
                  <td className="p-2 border border-gray-200">{index + 1}</td>
                  <td className="p-2 border border-gray-200">{product.name}</td>
                  <td className="p-2 border border-gray-200">
                    {product.categoryId?.name || "N/A"}
                  </td>
                  <td className="p-2 border border-gray-200 text-green-700 font-semibold">
                    ₦{product.price}
                  </td>
                  <td className="p-2 border border-gray-200 text-center">
                    {product.stock === 0 ? (
                      <span className="bg-red-100 text-red-600 px-2 py-1 rounded-md text-xs font-semibold">
                        {product.stock}
                      </span>
                    ) : product.stock < 5 ? (
                      <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-md text-xs font-semibold">
                        {product.stock}
                      </span>
                    ) : (
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded-md text-xs font-semibold">
                        {product.stock}
                      </span>
                    )}
                  </td>
                  <td className="p-2 border border-gray-200">
                    {product.description || "—"}
                  </td>
                  <td className="p-2 border border-gray-200 text-center">
                    <div className="flex justify-center items-center gap-3">
                      <button
                        onClick={() => onEdit(product)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Edit Product"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => onDelete(product._id)}
                        className="text-red-600 hover:text-red-800"
                        title="Delete Product"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="7"
                  className="text-center text-gray-500 py-6 italic"
                >
                  No products found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProductTable;
