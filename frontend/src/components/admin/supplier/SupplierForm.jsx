import React from "react";
import { motion } from "framer-motion";

const SupplierForm = ({
  formData,
  setFormData,
  editSupplier,
  handleSubmit,
  closeModal,
}) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center px-4 z-50">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md relative"
      >
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
          {editSupplier ? "Edit Supplier" : "Add Supplier"}
        </h1>
        <button
          className="absolute top-4 right-4 font-bold text-gray-500 text-2xl hover:text-red-500"
          onClick={closeModal}
        >
          ×
        </button>

        <form className="flex flex-col gap-3 mt-4" onSubmit={handleSubmit}>
          {["name", "email", "number", "address"].map((field) => (
            <input
              key={field}
              required
              type={field === "number" ? "number" : "text"}
              placeholder={`Supplier ${field.charAt(0).toUpperCase() + field.slice(1)}`}
              name={field}
              value={formData[field]}
              onChange={handleChange}
              className="border p-3 bg-gray-50 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
            />
          ))}

          <div className="flex flex-col sm:flex-row gap-2 mt-4">
            <button
              className="w-full rounded-md bg-green-500 text-white p-3 hover:bg-green-600 transition"
              type="submit"
            >
              {editSupplier ? "Save Changes" : "Add Supplier"}
            </button>
            <button
              type="button"
              className="w-full rounded-md bg-red-500 text-white p-3 hover:bg-red-600 transition"
              onClick={closeModal}
            >
              Cancel
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default SupplierForm;
