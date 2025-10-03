import CategoryModel from '../models/CategoryModel.js'
import ProductModel from '../models/ProductModel.js';

const addCategory = async (req, res) => {
  try {
    const { categoryName, categoryDescription } = req.body;
    
    //check if the category already exists
    const existingCategory = await CategoryModel.findOne({ categoryName });
    if (existingCategory) {
      return res.status(400).json({ success: false, message: 'Category already exists' })
    }
    // Create a new category
    const newCategory = new CategoryModel({
      name: categoryName,
      description: categoryDescription
    });

    await newCategory.save();
    return res.status(201).json({ success: true, message: 'category added succesfully' })
  } catch (error) {
    console.error("Error adding category", error);
    return res.status(500).json({ success: false, message: "server error" })
  }
}

const getCategories = async (req, res) => {
  try {
    const categories = await CategoryModel.find();
    return res.status(200).json({ success: true, categories })
  } catch (error) {
    return res.status(500).json({success:false, message: "Server error in categories"})
  } 
}

const updateCategory = async (req, res)=>{
  try {
    const {id} = req.params;
    const {categoryName, categoryDescription} = req.body;

    // check if the category exists
    const existingCategory = await CategoryModel.findById(id);
    if (!existingCategory) {
      return res.status(404).json({success: false, message:'Category not found'})
    }

    const updatedCategory = await CategoryModel.findByIdAndUpdate(
      id,
      {name:categoryName, description:categoryDescription},
      {new: true}
    );
    return res.status(200).json({success: true, message: 'Category updated successfully'});
  } catch (error) {
    console.error('Error updating category:', error);
    return res.status(500).json({success: false, message:'Server error'})
  }
}

const deleteCategory = async (req, res)=>{
  try{
    const {id} = req.params;

    const productCount = await ProductModel.countDocuments({categoryId:id})

    if (productCount > 0) {
      return res.status(400).json({success: false, message: "Can not delete category associated with products"})
    }


    //check if the category exists
    const existingCategory = await CategoryModel.findById(id);
    if (!existingCategory) {
      return res.status(404).json({success: false, message: 'Category not found'})
    }

    await CategoryModel.findByIdAndDelete(id);
    return res.status(200).json({success: true, message: 'Category deleted successfully'})
  }catch(error){
    console.error('Error deleting category', error);
    return res.status(500).json({success: false, message: 'Server error'})
  }
}
export { addCategory, getCategories, updateCategory, deleteCategory}
