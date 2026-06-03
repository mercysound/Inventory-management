import React from "react";
import { Pencil, Trash2 } from "lucide-react";

const CategoryTable = ({ categories, onEdit, onDelete }) => {
  const safeCategories = categories || [];

  return (
    <div className="w-full lg:w-2/3">
      {/* Desktop Table View */}
      <div className="hidden md:block bg-slate-950 shadow-2xl rounded-xl p-4 border border-slate-800 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-900 text-slate-300 text-left border-b border-slate-800">
              <th className="p-3 text-sm font-semibold">S/N</th>
              <th className="p-3 text-sm font-semibold">Category Name</th>
              <th className="p-3 text-sm font-semibold">Description</th>
              <th className="p-3 text-sm font-semibold text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {safeCategories.map((category, index) => (
              <tr
                key={category._id}
                className="border-t border-slate-800 hover:bg-slate-900/70 transition-all"
              >
                <td className="p-3 text-sm text-slate-300">{index + 1}</td>
                <td className="p-3 font-medium text-slate-100">{category.name}</td>
                <td className="p-3 text-slate-400">{category.description}</td>
                <td className="p-3 flex justify-center gap-3">
                  <button
                    onClick={() => onEdit(category)}
                    className="inline-flex items-center justify-center w-9 h-9 rounded-md bg-slate-800 text-slate-100 hover:bg-slate-700 hover:scale-110 transition-all"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    onClick={() => onDelete(category._id)}
                    className="inline-flex items-center justify-center w-9 h-9 rounded-md bg-slate-800 text-slate-100 hover:bg-slate-700 hover:scale-110 transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {safeCategories.length === 0 && (
          <div className="text-center text-slate-300 py-6">No categories found.</div>
        )}
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {safeCategories.length === 0 ? (
          <div className="text-center text-slate-300 py-6">No categories found.</div>
        ) : (
          safeCategories.map((category, index) => (
            <div
              key={category._id}
              className="bg-slate-950 shadow-2xl rounded-xl p-4 border border-slate-800"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-lg text-slate-100">{category.name}</h3>
                  <p className="text-sm text-slate-400 mt-1">{category.description}</p>
                </div>
                <span className="text-sm text-slate-400">#{index + 1}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onEdit(category)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 text-slate-100 rounded-md hover:bg-slate-700 transition-all"
                >
                  <Pencil size={16} />
                  Edit
                </button>
                <button
                  onClick={() => onDelete(category._id)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 text-slate-100 rounded-md hover:bg-slate-700 transition-all"
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CategoryTable;
