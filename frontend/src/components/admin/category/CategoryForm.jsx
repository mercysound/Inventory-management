import React from "react";
import { motion } from "framer-motion";
import { Pencil, PlusCircle } from "lucide-react";
import FormInput from "../../share-component/FormInput";
import LoadingButton from "../../share-component/LoadingButton";

const CategoryForm = ({
  categoryName,
  categoryDescription,
  editCategory,
  onSubmit,
  onCancel,
  onChangeName,
  onChangeDescription,
  submitting,
}) => {
  return (
    <motion.div
      className="w-full lg:w-1/3"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="bg-white shadow-lg rounded-xl p-5 border border-gray-100">
        <h2 className="text-lg md:text-xl font-semibold mb-4 text-center text-gray-700">
          {editCategory ? "✏️ Edit Category" : "➕ Add New Category"}
        </h2>
        <form className="space-y-4" onSubmit={onSubmit}>
          <FormInput
            label="Category Name"
            name="categoryName"
            placeholder="Category Name"
            value={categoryName}
            onChange={onChangeName}
            required
          />

          <FormInput
            label="Category Description"
            name="categoryDescription"
            placeholder="Category Description"
            value={categoryDescription}
            onChange={onChangeDescription}
            required
          />

          <div className="flex gap-2">
            <LoadingButton
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white p-3 rounded-md hover:bg-blue-700 transition-all duration-200 font-medium"
              type="submit"
              loading={!!submitting}
            >
              {editCategory ? <Pencil size={18} /> : <PlusCircle size={18} />}
              <span className="hidden sm:inline">{editCategory ? "Save Changes" : "Add Category"}</span>
              <span className="sm:hidden">{editCategory ? "Save" : "Add"}</span>
            </LoadingButton>

            {editCategory && (
              <button
                type="button"
                className="flex-1 bg-gray-500 text-white p-3 rounded-md hover:bg-gray-600 transition-all duration-200 font-medium"
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
