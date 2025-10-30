import React from "react";
import { motion } from "framer-motion";

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
      className="lg:w-1/3 w-full"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
        <h2 className="text-center text-2xl font-semibold mb-4 text-gray-800">
          {editCategory ? "Edit Category" : "Add Category"}
        </h2>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              placeholder="Category Name"
              className="w-full border border-gray-300 focus:border-indigo-500 focus:ring focus:ring-indigo-200 rounded-lg p-3 outline-none transition"
              required
              value={categoryName}
              onChange={onChangeName}
            />
          </div>
          <div>
            <textarea
              placeholder="Category Description"
              className="w-full border border-gray-300 focus:border-indigo-500 focus:ring focus:ring-indigo-200 rounded-lg p-3 outline-none transition"
              rows={3}
              required
              value={categoryDescription}
              onChange={onChangeDescription}
            ></textarea>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="w-full py-3 rounded-lg bg-gradient-to-r from-indigo-500 to-pink-500 text-white font-semibold shadow-md hover:opacity-90 transition"
            >
              {editCategory ? "Save Changes" : "Add Category"}
            </button>

            {editCategory && (
              <button
                type="button"
                onClick={onCancel}
                className="w-full py-3 rounded-lg bg-gray-300 text-gray-800 font-semibold hover:bg-gray-400 transition"
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
