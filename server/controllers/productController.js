import SupplierModel from '../models/SupplierModel.js';
import CategoryModel from '../models/CategoryModel.js';
import ProductModel from '../models/ProductModel.js';
import cloudinary from '../config/cloudinary.js';
import { sendResponse, sendError } from '../utils/apiResponse.js';
import { getPaginationParams, getPaginationMeta } from '../utils/pagination.js';
import ProductDraftModel from '../models/ProductDraftModel.js';

const getProducts = async (req, res) => {
  try {
    const { skip, limit, page, sort } = getPaginationParams(req);

    const total = await ProductModel.countDocuments({ isDeleted: false });

    const products = await ProductModel
      .find({ isDeleted: false })
      .populate("categoryId")
      .populate("supplierId") // ✅ safe — returns null when supplierId is null
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const suppliers = await SupplierModel.find();
    const categories = await CategoryModel.find();

    const meta = getPaginationMeta(total, limit, page);

    return sendResponse(res, 200, {
      products,
      suppliers,
      categories,
    }, "Products retrieved successfully", meta);
  } catch (error) {
    console.error('Error fetching products:', error);
    return sendError(res, 500, "Failed to fetch products");
  }
};

const addProduct = async (req, res) => {
  try {
    const { name, description, price, stock, categoryId, supplierId } = req.body;

    let imageUrl = null;
    if (req.file) {
      const uploadResult = await cloudinary.uploader.upload(req.file.path, {
        resource_type: "image",
      });
      imageUrl = uploadResult.secure_url;
    }

    const product = await ProductModel.create({
      name,
      description,
      price,
      stock,
      categoryId,
      // ✅ empty string, "null", undefined → all become null in DB
      supplierId: supplierId && supplierId.trim() !== "" ? supplierId : null,
      image: imageUrl,
    });

    return sendResponse(res, 201, product, "Product added successfully");
  } catch (error) {
    console.error("Error adding product:", error);
    return sendError(res, 500, "Failed to add product");
  }
};

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await ProductModel.findById(id);
    if (!product) return sendError(res, 404, "Product not found");

    const updateData = { ...req.body };

    // ✅ Always handle supplierId cleanly:
    // empty string or missing = null (remove supplier)
    // valid 24-char hex = keep it
    if ("supplierId" in updateData) {
      const sid = updateData.supplierId;
      updateData.supplierId =
        sid && typeof sid === "string" && sid.trim().length === 24
          ? sid.trim()
          : null;
    }

    // Handle image removal
    if (updateData.removeImage === "true" || updateData.removeImage === true) {
      if (product.image) {
        const urlParts = product.image.split("/");
        const uploadIndex = urlParts.indexOf("upload");
        const publicId = urlParts
          .slice(uploadIndex + 2)
          .join("/")
          .replace(/\.[^/.]+$/, "");
        await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
      }
      updateData.image = null;
    }

    // Handle new image upload
    if (req.file) {
      if (product.image) {
        const urlParts = product.image.split("/");
        const uploadIndex = urlParts.indexOf("upload");
        const publicId = urlParts
          .slice(uploadIndex + 2)
          .join("/")
          .replace(/\.[^/.]+$/, "");
        await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
      }
      const uploadResult = await cloudinary.uploader.upload(req.file.path, {
        resource_type: "image",
      });
      updateData.image = uploadResult.secure_url;
    }

    delete updateData.removeImage;

    const updated = await ProductModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    return sendResponse(res, 200, updated, "Product updated successfully");
  } catch (error) {
    console.error(error);
    return sendError(res, 500, "Failed to update product");
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const existingProduct = await ProductModel.findById(id);
    if (!existingProduct) return sendError(res, 404, "Product not found");
    if (existingProduct.isDeleted) return sendError(res, 400, "Product already deleted");

    const product = await ProductModel.findByIdAndUpdate(
      id, { isDeleted: true }, { new: true }
    );
    return sendResponse(res, 200, product, "Product deleted successfully");
  } catch (error) {
    console.error('Error deleting product:', error);
    return sendError(res, 500, "Failed to delete product");
  }
};

const getDeletedProducts = async (req, res) => {
  try {
    const { skip, limit, page, sort } = getPaginationParams(req);
    const total = await ProductModel.countDocuments({ isDeleted: true });

    const deletedProducts = await ProductModel
      .find({ isDeleted: true })
      .populate("categoryId", "name")
      .populate("supplierId")
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const meta = getPaginationMeta(total, limit, page);
    return sendResponse(res, 200, { products: deletedProducts }, "Deleted products retrieved successfully", meta);
  } catch (error) {
    console.error('Error fetching deleted products:', error);
    return sendError(res, 500, "Failed to fetch deleted products");
  }
};

const restoreProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await ProductModel.findById(id);
    if (!product) return sendError(res, 404, "Product not found");
    if (!product.isDeleted) return sendError(res, 400, "Product is not deleted");

    product.isDeleted = false;
    await product.save();
    return sendResponse(res, 200, product, "Product restored successfully");
  } catch (error) {
    console.error('Error restoring product:', error);
    return sendError(res, 500, "Failed to restore product");
  }
};

const deleteProductPermanent = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await ProductModel.findById(id);
    if (!product) return sendError(res, 404, "Product not found");

    if (product.image) {
      const urlParts = product.image.split("/");
      const uploadIndex = urlParts.indexOf("upload");
      const publicId = urlParts
        .slice(uploadIndex + 2)
        .join("/")
        .replace(/\.[^/.]+$/, "");
      await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
    }

    await ProductModel.findByIdAndDelete(id);
    return sendResponse(res, 200, null, "Product permanently deleted");
  } catch (error) {
    console.error(error);
    return sendError(res, 500, "Failed to permanently delete product");
  }
};

export {
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  getDeletedProducts,
  restoreProduct,
  deleteProductPermanent,
};

// GET /products/draft — load the saved draft for the logged-in admin
export const getProductDraft = async (req, res) => {
  try {
    const draft = await ProductDraftModel.findOne({ adminId: req.user._id });
    return res.json({ success: true, draft: draft?.draft || null });
  } catch (error) {
    console.error("getProductDraft error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /products/draft — save/overwrite the draft
export const saveProductDraft = async (req, res) => {
  try {
    const { name, description, price, stock, categoryId, supplierId } = req.body;

    await ProductDraftModel.findOneAndUpdate(
      { adminId: req.user._id },
      {
        adminId: req.user._id,
        draft: { name, description, price, stock, categoryId, supplierId },
        updatedAt: Date.now(),
      },
      { upsert: true, new: true } // create if not exists, update if exists
    );

    return res.json({ success: true });
  } catch (error) {
    console.error("saveProductDraft error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /products/draft — wipe draft after successful product add
export const clearProductDraft = async (req, res) => {
  try {
    await ProductDraftModel.findOneAndDelete({ adminId: req.user._id });
    return res.json({ success: true });
  } catch (error) {
    console.error("clearProductDraft error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};