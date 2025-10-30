import React from "react";
import { motion } from "framer-motion";
import { FaEdit, FaTrash } from "react-icons/fa";

const SupplierTable = ({ suppliers, handleEdit, handleDelete }) => {
  if (suppliers.length === 0)
    return (
      <div className="text-center py-6 text-gray-600 bg-gray-50 rounded-lg shadow-sm">
        No suppliers found 😔
      </div>
    );

  return (
    <div className="mt-4">
      {/* TABLE VIEW (Desktop) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full border-collapse border border-gray-200 rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-blue-600 text-white text-left">
              <th className="p-3">S/N</th>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Phone</th>
              <th className="p-3">Address</th>
              <th className="p-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((supplier, index) => (
              <motion.tr
                key={supplier._id}
                className="border-t hover:bg-gray-50 transition-colors duration-150"
                whileHover={{ scale: 1.01 }}
              >
                <td className="p-3 text-gray-700">{index + 1}</td>
                <td className="p-3 font-semibold text-gray-800">{supplier.name}</td>
                <td className="p-3 text-gray-700">{supplier.email}</td>
                <td className="p-3 text-gray-700">{supplier.number}</td>
                <td className="p-3 text-gray-700">{supplier.address}</td>
                <td className="p-3 text-center">
                  <div className="flex justify-center gap-3">
                    <button
                      className="flex items-center gap-1 px-3 py-1.5 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
                      onClick={() => handleEdit(supplier)}
                    >
                      <FaEdit /> Edit
                    </button>
                    <button
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white rounded-md hover:bg-red-600"
                      onClick={() => handleDelete(supplier._id)}
                    >
                      <FaTrash /> Delete
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CARD VIEW (Mobile) */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {suppliers.map((supplier, index) => (
          <motion.div
            key={supplier._id}
            className="p-4 bg-white rounded-lg shadow-md border border-gray-100"
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold text-gray-800 text-lg">
                {supplier.name}
              </h3>
              <span className="text-sm text-gray-400">#{index + 1}</span>
            </div>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Email:</span> {supplier.email}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Phone:</span> {supplier.number}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Address:</span> {supplier.address}
            </p>

            <div className="flex gap-2 mt-3">
              <button
                className="flex-1 px-2 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                onClick={() => handleEdit(supplier)}
              >
                Edit
              </button>
              <button
                className="flex-1 px-2 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                onClick={() => handleDelete(supplier._id)}
              >
                Delete
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default SupplierTable;
