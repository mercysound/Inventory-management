import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
  categoryName : {type: String, require: true},
  categoryDescription: {type: String, required:true},
});

const CategoryModel = mongoose.model("Category", categorySchema);


export default CategoryModel; 