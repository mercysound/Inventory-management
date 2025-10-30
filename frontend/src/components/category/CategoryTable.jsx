import React from "react";
import { Pencil, Trash2 } from "lucide-react";

const CategoryTable = ({ categories, onEdit, onDelete }) => {
  return (
    <div className="lg:w-2/3">
      <div className="bg-white shadow-lg rounded-xl p-4 border border-gray-100 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 text-gray-700 text-left">
              <th className="p-3 text-sm font-semibold">S/N</th>
              <th className="p-3 text-sm font-semibold">Category Name</th>
              <th className="p-3 text-sm font-semibold">Description</th>
              <th className="p-3 text-sm font-semibold text-center">Action</th>
            </tr>
          </thead>

          <tbody>
            {categories.map((category, index) => (
              <tr
                key={category._id}
                className="border-t border-gray-200 hover:bg-gray-50 transition-all"
              >
                <td className="p-3 text-sm">{index + 1}</td>
                <td className="p-3 font-medium text-gray-800">{category.name}</td>
                <td className="p-3 text-gray-600">{category.description}</td>
                <td className="p-3 flex justify-center gap-3">
                  <button
                    onClick={() => onEdit(category)}
                    className="text-blue-600 hover:text-blue-800 hover:scale-110 transition-all"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    onClick={() => onDelete(category._id)}
                    className="text-red-600 hover:text-red-800 hover:scale-110 transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {categories.length === 0 && (
          <div className="text-center text-gray-500 py-6">No categories found.</div>
        )}
      </div>
    </div>
  );
};

export default CategoryTable;
