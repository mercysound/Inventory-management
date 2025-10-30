import React from "react";
import { motion } from "framer-motion";

const CategoryTable = ({ categories, onEdit, onDelete }) => {
  return (
    <motion.div
      className="lg:w-2/3 w-full"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 uppercase text-sm">
              <th className="p-3 border-b">S/N</th>
              <th className="p-3 border-b">Category Name</th>
              <th className="p-3 border-b">Description</th>
              <th className="p-3 border-b text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category, index) => (
              <motion.tr
                key={category._id}
                className="hover:bg-gray-50 transition"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <td className="p-3 border-b text-gray-700">{index + 1}</td>
                <td className="p-3 border-b font-medium text-gray-800">
                  {category.name}
                </td>
                <td className="p-3 border-b text-gray-600">
                  {category.description}
                </td>
                <td className="p-3 border-b text-center">
                  <button
                    onClick={() => onEdit(category)}
                    className="bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1 rounded-lg mr-2 transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(category._id)}
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg transition"
                  >
                    Delete
                  </button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>

        {categories.length === 0 && (
          <p className="text-center text-gray-500 py-6">No categories found.</p>
        )}
      </div>
    </motion.div>
  );
};

export default CategoryTable;
