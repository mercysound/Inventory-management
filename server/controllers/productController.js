import SupplierModel from '../models/SupplierModel.js';
import CategoryModel from '../models/CategoryModel.js';
import ProductModel from '../models/ProductModel.js';
import cloudinary from '../config/cloudinary.js';



const getProducts = async (req, res) => {
  try {
    const products = await ProductModel
      .find({ isDeleted: false })
      .populate("categoryId")
      .populate("supplierId");

    const suppliers = await SupplierModel.find();
    const categories = await CategoryModel.find();

    res.status(200).json({ success: true, suppliers, categories, products });
  } catch (error) {
    res.status(500).json({ success: false });
  }
};


const addProduct = async (req, res) => {
  try {
    const { name, description, price, stock, categoryId, supplierId } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Image required" });
    }

    const uploadResult = await cloudinary.uploader.upload(req.file.path, {
      resource_type: "image",
    });

    const product = await ProductModel.create({
      name,
      description,
      price,
      stock,
      categoryId,
      supplierId,
      image: uploadResult.secure_url,
    });
    return res.status(201).json({ success: true, message: "Product added successfully", product });

  } catch (error) {
    console.error("Error adding Product", error);
    return res.status(500).json({ success: false, message: "server error" }) // 500 = Internal error
  }
}

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    if (req.file) {
      const uploadResult = await cloudinary.uploader.upload(req.file.path, {
        resource_type: "image",
      });
      updateData.image = uploadResult.secure_url;
    }


    // 🚨 Prevent empty update
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, message: "No update data provided" });
    }

    const product = await ProductModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    // 🚨 Product existence check
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    return res.status(200).json({ success: true, message: "Product updated successfully", product });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const existingProduct = await ProductModel.findById(id);

    if (!existingProduct) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    if (existingProduct.isDeleted) {
      return res.status(400).json({ success: false, message: 'Product already deleted' })
    }
    await ProductModel.findByIdAndUpdate(id, { isDeleted: true }, { new: true })
    return res.status(200).json({ success: true, message: 'Product deleted successfully' })

  } catch (error) {
    console.error('Error deleting Product', error);
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

export { getProducts, addProduct, updateProduct, deleteProduct }

