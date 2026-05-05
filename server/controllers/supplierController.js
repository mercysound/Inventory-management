import ProductModel from '../models/ProductModel.js';
import Supplier from '../models/SupplierModel.js'
import { sendResponse, sendError } from '../utils/apiResponse.js';
import { getPaginationParams, getPaginationMeta } from '../utils/pagination.js';

const addSupplier = async (req, res) => {
  try {
    const { name, email, phone, address } = req.body;
    
    const trimmedName = name.trim();
    console.log("Adding supplier:", trimmedName);

    // Check if supplier already exists by name
    const existingSupplier = await Supplier.findOne({ 
      name: { $regex: `^${trimmedName}$`, $options: "i" } 
    });

    if (existingSupplier) {
      return sendError(res, 409, `Supplier "${trimmedName}" already exists`);
    }
    
    // Create new supplier
    const newSupplier = new Supplier({
      name: trimmedName,
      email: email.trim(),
      phone: phone.trim(),
      address: address.trim()
    });

    await newSupplier.save();
    return sendResponse(res, 201, newSupplier, "Supplier added successfully");
  } catch (error) {
    console.error("Error adding supplier:", error.message);
    
    if (error.name === 'ValidationError') {
      const message = Object.values(error.errors).map(e => e.message).join(', ');
      return sendError(res, 400, message);
    }
    
    return sendError(res, 500, `Error: ${error.message}`);
  }
};
const getSupplier = async (req, res) => {
  try {
    const suppliers = await Supplier.find();
    return sendResponse(res, 200, { suppliers }, "Suppliers retrieved successfully");
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    return sendError(res, 500, "Failed to fetch suppliers");
  }
}

const updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, address } = req.body;
    
    const existingSupplier = await Supplier.findById(id);
    if (!existingSupplier) {
      return sendError(res, 404, 'Supplier not found');
    }

    // Check for duplicate name if name is being updated
    if (name && name.trim() !== existingSupplier.name) {
      const duplicate = await Supplier.findOne({
        _id: { $ne: id },
        name: { $regex: `^${name.trim()}$`, $options: "i" }
      });
      if (duplicate) {
        return sendError(res, 409, `Supplier "${name.trim()}" already exists`);
      }
    }

    const updatedSupplier = await Supplier.findByIdAndUpdate(
      id,
      { 
        name: name ? name.trim() : existingSupplier.name,
        email: email ? email.trim() : existingSupplier.email,
        phone: phone ? phone.trim() : existingSupplier.phone,
        address: address ? address.trim() : existingSupplier.address
      },
      { new: true }
    );
    return sendResponse(res, 200, updatedSupplier, 'Supplier updated successfully');
  } catch (error) {
    console.error('Error updating supplier:', error);
    if (error.name === 'ValidationError') {
      const message = Object.values(error.errors).map(e => e.message).join(', ');
      return sendError(res, 400, message);
    }
    return sendError(res, 500, `Error: ${error.message}`);
  }
}

const deleteSupplier = async (req, res) => {
  try {
    const { id } = req.params;

    const productCount = await ProductModel.countDocuments({ supplierId: id });

    if (productCount > 0) {
      return sendError(res, 400, "Cannot delete supplier associated with products");
    }

    const existingSupplier = await Supplier.findById(id);
    if (!existingSupplier) {
      return sendError(res, 404, 'Supplier not found');
    }

    await Supplier.findByIdAndDelete(id);
    return sendResponse(res, 200, null, 'Supplier deleted successfully');
  } catch (error) {
    console.error('Error deleting supplier', error);
    return sendError(res, 500, 'Failed to delete supplier');
  }
}

export { addSupplier, getSupplier, updateSupplier, deleteSupplier }
