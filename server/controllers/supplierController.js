import ProductModel from '../models/ProductModel.js';
import Supplier from '../models/SupplierModel.js';
import SettingsModel from '../models/SettingsModel.js';
import { sendResponse, sendError } from '../utils/apiResponse.js';

const addSupplier = async (req, res) => {
  // console.log("📦 Supplier body received:", req.body); // ← add this
  try {
    const { name, email, phone, address, contactPerson, notes } = req.body;

    const trimmedName = name.trim();

    const existingSupplier = await Supplier.findOne({
      name: { $regex: `^${trimmedName}$`, $options: "i" }
    });

    if (existingSupplier) {
      return sendError(res, 409, `Supplier "${trimmedName}" already exists`);
    }

    const newSupplier = new Supplier({
      name: trimmedName,
      email: email?.trim() || "",
      phone: phone?.trim() || "",
      address: address?.trim() || "",
      contactPerson: contactPerson?.trim() || "",
      notes: notes?.trim() || "",
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
    const suppliers = await Supplier.find().sort({ createdAt: -1 });

    // Read the admin-configured low stock threshold (default 10)
    const settings = await SettingsModel.findOne({}).sort({ createdAt: 1 });
    const lowStockThreshold = settings?.lowStockThreshold ?? 10;

    // ✅ Attach product count, low stock count, out of stock count to each supplier
    const suppliersWithStats = await Promise.all(
      suppliers.map(async (s) => {
        const [productCount, lowStockCount, outOfStockCount] = await Promise.all([
          ProductModel.countDocuments({ supplierId: s._id, isDeleted: false }),
          ProductModel.countDocuments({
            supplierId: s._id,
            isDeleted:  false,
            stock: { $gt: 0, $lte: lowStockThreshold },
          }),
          ProductModel.countDocuments({ supplierId: s._id, isDeleted: false, stock: 0 }),
        ]);
        return {
          ...s.toObject(),
          productCount,
          lowStockCount,
          outOfStockCount,
        };
      })
    );

    return sendResponse(res, 200, { suppliers: suppliersWithStats }, "Suppliers retrieved successfully");
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    return sendError(res, 500, "Failed to fetch suppliers");
  }
};

const updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, address, contactPerson, notes } = req.body;

    const existingSupplier = await Supplier.findById(id);
    if (!existingSupplier) {
      return sendError(res, 404, 'Supplier not found');
    }

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
        email: email !== undefined ? email.trim() : existingSupplier.email,
        phone: phone !== undefined ? phone.trim() : existingSupplier.phone,
        address: address !== undefined ? address.trim() : existingSupplier.address,
        contactPerson: contactPerson !== undefined ? contactPerson.trim() : existingSupplier.contactPerson,
        notes: notes !== undefined ? notes.trim() : existingSupplier.notes,
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
};

const deleteSupplier = async (req, res) => {
  try {
    const { id } = req.params;

    const productCount = await ProductModel.countDocuments({
      supplierId: id,
      isDeleted: false,
    });

    if (productCount > 0) {
      return sendError(
        res, 400,
        `Cannot delete — this supplier is linked to ${productCount} product(s). Reassign or delete those products first.`
      );
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
};

export { addSupplier, getSupplier, updateSupplier, deleteSupplier };