import CategoryModel from '../models/CategoryModel.js'
import ProductModel from '../models/ProductModel.js';
import { sendResponse, sendError } from '../utils/apiResponse.js';
import { getPaginationParams, getPaginationMeta, applyPaginationAndSorting } from '../utils/pagination.js';

const addCategory = async (req, res) => {
  try {
    const { categoryName, categoryDescription } = req.body;

    // Check if the category already exists
    const existingCategory = await CategoryModel.findOne({
      name: { $regex: new RegExp(`^${categoryName}$`, 'i') }
    });

    if (existingCategory) {
      return sendError(res, 409, 'Category with this name already exists');
    }

    // Create a new category
    const newCategory = new CategoryModel({
      name: categoryName,
      description: categoryDescription
    });

    const savedCategory = await newCategory.save();
    return sendResponse(res, 201, savedCategory, 'Category added successfully');
  } catch (error) {
    console.error("Error adding category:", error);
    return sendError(res, 500, 'Failed to add category');
  }
}

const getCategories = async (req, res) => {
  try {
    const { skip, limit, page, sort } = getPaginationParams(req);

    // Get total count for pagination
    const total = await CategoryModel.countDocuments();

    // Get paginated results
    const categories = await CategoryModel.find()
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select('name description createdAt updatedAt');

    const meta = getPaginationMeta(total, limit, page);

    return sendResponse(res, 200, { categories }, 'Categories retrieved successfully', meta);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return sendError(res, 500, 'Failed to fetch categories');
  }
}

const updateCategory = async (req, res)=>{
  try {
    const {id} = req.params;
    const {categoryName, categoryDescription} = req.body;

    // check if the category exists
    const existingCategory = await CategoryModel.findById(id);
    if (!existingCategory) {
      return sendError(res, 404, 'Category not found');
    }

    const updatedCategory = await CategoryModel.findByIdAndUpdate(
      id,
      {name:categoryName, description:categoryDescription},
      {new: true}
    );
    return sendResponse(res, 200, updatedCategory, 'Category updated successfully');
  } catch (error) {
    console.error('Error updating category:', error);
    return sendError(res, 500, 'Failed to update category');
  }
}

const deleteCategory = async (req, res)=>{
  try{
    const {id} = req.params;

    const productCount = await ProductModel.countDocuments({categoryId:id})

    if (productCount > 0) {
      return sendError(res, 400, 'Cannot delete category associated with products');
    }

    //check if the category exists
    const existingCategory = await CategoryModel.findById(id);
    if (!existingCategory) {
      return sendError(res, 404, 'Category not found');
    }

    await CategoryModel.findByIdAndDelete(id);
    return sendResponse(res, 200, null, 'Category deleted successfully');
  }catch(error){
    console.error('Error deleting category', error);
    return sendError(res, 500, 'Failed to delete category');
  }
}
export { addCategory, getCategories, updateCategory, deleteCategory}
