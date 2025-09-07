import Category from '../models/Category.js'

const addCategory = async (req, res) => {
  try {
    const { categoryName, categoryDescription } = req.body
    //check if the category already exists
    const existingCategory = await Category.findOne({ categoryName });
    if (existingCategory) {
      return res.status(400).json({ success: false, message: 'Category already exists' })
    }
    // Create a new category
    const newCategory = new Category({
      categoryName,
      categoryDescription
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
    const categories = await Category.find();
    return res.status(200).json({ success: true, categories })
  } catch (error) {
    return res.status(500).json({success:false, message: "Server error in categories"})
  } 
}

export { addCategory, getCategories }
