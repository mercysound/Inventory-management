// src/components/Category/CategoryForm.jsx
import React from "react";

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
    <div className="lg:w-1/3">
      <div className="bg-white shadow-md rounded-lg p-4">
        <h2 className="text-center text-xl font-bold mb-4">
          {editCategory ? "Edit Category" : "Add Category"}
        </h2>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <input
              type="text"
              placeholder="Category Name"
              className="border w-full p-2 rounded-md"
              required
              value={categoryName}
              onChange={onChangeName}
            />
          </div>
          <div>
            <input
              type="text"
              placeholder="Category Description"
              className="border w-full p-3 rounded-md"
              required
              value={categoryDescription}
              onChange={onChangeDescription}
            />
          </div>
          <div className="flex space-x-2">
            <button
              className="w-full mt-2 rounded-md bg-green-500 text-white p-3 cursor-pointer hover:bg-green-600"
              type="submit"
            >
              {editCategory ? "Save Changes" : "Add Category"}
            </button>
            {editCategory && (
              <button
                type="button"
                className="w-full mt-2 rounded-md bg-red-500 text-white p-3 cursor-pointer hover:bg-red-600"
                onClick={onCancel}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default CategoryForm;
