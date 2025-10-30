import React from "react";
import { motion } from "framer-motion";
import { Pencil, PlusCircle } from "lucide-react";

const CategoryForm = ({
  categoryName,
  categoryDescription,
  editCategory,
  onSubmit,
  onCancel,
  onChangeName,
  onChangeDescription,
}) => {
  return (
    <motion.div
      className="lg:w-1/3"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="bg-white shadow-lg rounded-xl p-5 border border-gray-100">
        <h2 className="text-xl font-semibold mb-4 text-center text-gray-700">
          {editCategory ? "✏️ Edit Category" : "➕ Add New Category"}
        </h2>
        <form className="space-y-4" onSubmit={onSubmit}>
          <input
            type="text"
            placeholder="Category Name"
            className="border w-full p-3 rounded-md focus:ring-2 focus:ring-blue-400 outline-none"
            required
            value={categoryName}
            onChange={onChangeName}
          />

          <input
            type="text"
            placeholder="Category Description"
            className="border w-full p-3 rounded-md focus:ring-2 focus:ring-blue-400 outline-none"
            required
            value={categoryDescription}
            onChange={onChangeDescription}
          />

          <div className="flex gap-2">
            <button
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white p-3 rounded-md hover:bg-blue-700 transition-all duration-200"
              type="submit"
            >
              {editCategory ? <Pencil size={18} /> : <PlusCircle size={18} />}
              {editCategory ? "Save Changes" : "Add Category"}
            </button>

            {editCategory && (
              <button
                type="button"
                className="flex-1 bg-gray-500 text-white p-3 rounded-md hover:bg-gray-600 transition-all duration-200"
                onClick={onCancel}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
    </motion.div>
  );
};

export default CategoryForm;
