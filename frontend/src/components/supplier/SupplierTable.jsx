import React from "react";

const SupplierTable = ({ suppliers, handleEdit, handleDelete }) => {
  if (suppliers.length === 0)
    return <div className="text-center py-4 text-gray-600">No record found</div>;

  return (
    <div className="mt-4">
      {/* TABLE VIEW (for md screens and above) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full border-collapse border border-gray-200 text-sm md:text-base">
          <thead>
            <tr className="bg-gray-200 text-left">
              <th className="border border-gray-300 p-2">S/N</th>
              <th className="border border-gray-300 p-2">Name</th>
              <th className="border border-gray-300 p-2">Email</th>
              <th className="border border-gray-300 p-2">Phone</th>
              <th className="border border-gray-300 p-2">Address</th>
              <th className="border border-gray-300 p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((supplier, index) => (
              <tr
                key={supplier._id}
                className="hover:bg-gray-50 transition-colors duration-200"
              >
                <td className="border border-gray-300 p-2">{index + 1}</td>
                <td className="border border-gray-300 p-2">{supplier.name}</td>
                <td className="border border-gray-300 p-2">{supplier.email}</td>
                <td className="border border-gray-300 p-2">{supplier.number}</td>
                <td className="border border-gray-300 p-2">{supplier.address}</td>
                <td className="border border-gray-300 p-2">
                  <div className="flex gap-2 flex-wrap">
                    <button
                      className="px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                      onClick={() => handleEdit(supplier)}
                    >
                      Edit
                    </button>
                    <button
                      className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                      onClick={() => handleDelete(supplier._id)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CARD VIEW (for mobile screens) */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {suppliers.map((supplier, index) => (
          <div
            key={supplier._id}
            className="border border-gray-300 rounded-lg p-3 bg-white shadow-sm"
          >
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold text-base">{supplier.name}</h3>
              <span className="text-xs text-gray-500">#{index + 1}</span>
            </div>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Email:</span> {supplier.email}
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Phone:</span> {supplier.number}
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Address:</span> {supplier.address}
            </p>

            <div className="flex gap-2 mt-3">
              <button
                className="flex-1 px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                onClick={() => handleEdit(supplier)}
              >
                Edit
              </button>
              <button
                className="flex-1 px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                onClick={() => handleDelete(supplier._id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SupplierTable;
