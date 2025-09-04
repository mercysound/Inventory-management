const addCategory = async (req, res) => {
  try {
    const { categoryName, categoryDescription } = req.body
    //check if the category already exists
    const existingCategory = await Category.findOne({ name: categoryName });
    if (existingCategory) {
      return res.status(400).json({success: false, message: 'Category already exists'})
    }
    // Create a new category
    const newCategory = new Category({
      name: categoryName,
      description: categoryDescription,
    });

    await newCategory.save();
    return res.status(201).json({success: true, message: 'category added succesfully', data: newCategory})
  } catch (error) {
    console.error("Error adding category", error);
    return res.status(500).json({success: false, message: "server error"})
  }
}

export {addCategory}
