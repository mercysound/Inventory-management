// src/components/Category/CategoryTable.jsx
import React from "react";

const CategoryTable = ({ categories, onEdit, onDelete }) => {
  return (
    <div className="lg:w-2/3">
      <div className="bg-white shadow-md rounded-lg p-4 overflow-x-auto">
        <table className="w-full border-collapse border border-gray-200">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-200 p-2">S/N</th>
              <th className="border border-gray-200 p-2">Category Name</th>
              <th className="border border-gray-200 p-2">Description</th>
              <th className="border border-gray-200 p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category, index) => (
              <tr key={category._id}>
                <td className="border border-gray-200 p-2">{index + 1}</td>
                <td className="border border-gray-200 p-2">{category.name}</td>
                <td className="border border-gray-200 p-2">
                  {category.description}
                </td>
                <td className="border border-gray-200 p-2">
                  <button
                    onClick={() => onEdit(category)}
                    className="bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600 mr-2"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(category._id)}
                    className="bg-red-500 text-white p-2 rounded-md hover:bg-red-600"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CategoryTable;
