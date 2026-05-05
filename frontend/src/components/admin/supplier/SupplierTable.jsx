import React from "react";
import { motion } from "framer-motion";

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
      <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full table-fixed text-sm">
          <thead>
            <tr className="bg-blue-600 text-white text-left">
              <th className="p-3 w-12">S/N</th>
              <th className="p-3 w-1/6">Name</th>
              <th className="p-3 w-1/5">Email</th>
              <th className="p-3 w-1/6">Phone</th>
              <th className="p-3 w-1/4">Address</th>
              <th className="p-3 w-40 text-center">Action</th>
            </tr>
          </thead>

          <tbody>
            {suppliers.map((supplier, index) => (
              <motion.tr
                key={supplier._id}
                className="border-t transition-colors hover:bg-gray-50 h-14"
                whileHover={{ backgroundColor: "#f9fafb" }} // no scale → no jumping
              >
                <td className="p-3 text-gray-700 align-middle">
                  {index + 1}
                </td>

                <td className="p-3 font-semibold text-gray-800 overflow-hidden whitespace-nowrap text-ellipsis align-middle">
                  {supplier.name}
                </td>

                <td className="p-3 text-gray-700 overflow-hidden whitespace-nowrap text-ellipsis align-middle">
                  {supplier.email}
                </td>

                <td className="p-3 text-gray-700 overflow-hidden whitespace-nowrap text-ellipsis align-middle">
                  {supplier.phone}
                </td>

                <td className="p-3 text-gray-700 overflow-hidden whitespace-nowrap text-ellipsis align-middle">
                  {supplier.address}
                </td>

                <td className="p-3 text-center align-middle">
                  <div className="flex justify-center gap-2 whitespace-nowrap">
                    <button
                      className="px-3 py-1.5 bg-yellow-500 text-white text-sm rounded hover:bg-yellow-600 transition"
                      onClick={() => handleEdit(supplier)}
                    >
                      Edit
                    </button>

                    <button
                      className="px-3 py-1.5 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition"
                      onClick={() => handleDelete(supplier._id)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CARD VIEW (Mobile) */}
      <div className="grid grid-cols-1 gap-4 p-4 md:hidden">
        {suppliers.map((supplier, index) => (
          <motion.div
            key={supplier._id}
            className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-gray-800 text-lg">
                {supplier.name}
              </h3>
              <span className="text-sm text-gray-400">#{index + 1}</span>
            </div>

            <p className="text-sm text-gray-600 mb-2">
              <span className="font-medium">Email:</span> {supplier.email}
            </p>

            <p className="text-sm text-gray-600 mb-2">
              <span className="font-medium">Phone:</span> {supplier.phone}
            </p>

            <p className="text-sm text-gray-600 mb-4">
              <span className="font-medium">Address:</span> {supplier.address}
            </p>

            <div className="flex gap-2">
              <button
                className="flex-1 px-2 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition"
                onClick={() => handleEdit(supplier)}
              >
                Edit
              </button>

              <button
                className="flex-1 px-2 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
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