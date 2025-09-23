import SupplierModel from '../models/SupplierModel.js';
import CategoryModel from '../models/CategoryModel.js';
import ProductModel from '../models/ProductModel.js';



const getProducts = async (req, res) => {
  try {
    const products = await ProductModel.find({ isDeleted: false }).populate('category').populate('supplier');
    
    
    const suppliers = await SupplierModel.find();
    const categories = await CategoryModel.find();
    return res.status(200).json({ success: true, suppliers, categories, products })
  } catch (error) {
    console.error('Error fetching suppliers:', error);

    return res.status(500).json({ success: false, message: "Server error in suppliers" })
  }
}

const addProduct = async (req, res) => {
  try {
    const { name, description, price, stock, categoryId, supplierId, } = req.body;
    // Create a new category
    const newProduct = new ProductModel({
      name,
      description,
      price,
      stock,
      categoryId,
      supplierId,
    });

    await newProduct.save();
    return res.status(201).json({ success: true, message: 'Product  added succesfully' }) // 201 = Created
  } catch (error) {
    console.error("Error adding Product", error);
    return res.status(500).json({ success: false, message: "server error" }) // 500 = Internal error
  }
}

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const { name, description, price, stock, categoryId, supplierId } = req.body;
    // Update the product
    const updateProduct = await ProductModel.findByIdAndUpdate(id, {
      name,
      description,
      price,
      stock,
      categoryId,
      supplierId
    }, { new: true });
    if (!updateProduct) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    return res.status(200).json({ success: true, message: 'Product updated successfully', product: updateProduct });
  } catch (error) {
    console.error('Error updating Product', error);
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}
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
    await ProductModel.findByIdAndUpdate(id, {isDeleted: true}, {new: true})
    return res.status(200).json({ success: true, message: 'Product deleted successfully' })

  } catch (error) {
    console.error('Error deleting Product', error);
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

export { getProducts, addProduct, updateProduct, deleteProduct }