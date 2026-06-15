import SupplierModel from '../models/SupplierModel.js';
import CategoryModel from '../models/CategoryModel.js';
import ProductModel from '../models/ProductModel.js';
import cloudinary from '../config/cloudinary.js';
import { sendResponse, sendError } from '../utils/apiResponse.js';
import { getPaginationParams, getPaginationMeta } from '../utils/pagination.js';
import OrderModel from '../models/OrderModel.js';
import orderNotifier from '../utils/orderNotifier.js';

// ─── Helper: strip wholesalePrice from product for non-admin/non-staff roles ─
// Customers and wholesale users only see their own price — not both columns.
// Staff and admin see everything.
const sanitizeProductForRole = (product, role) => {
  const obj = product.toObject ? product.toObject() : { ...product };
  if (role === 'customer') {
    // Customers see only retail price; hide wholesalePrice entirely
    delete obj.wholesalePrice;
    return obj;
  }
  if (role === 'wholesale') {
    // Wholesale users see only wholesale price displayed as "price"
    // We overwrite price with wholesalePrice (fall back to retail if not set)
    obj.price = obj.wholesalePrice ?? obj.price;
    delete obj.wholesalePrice;
    return obj;
  }
  // admin, staff → return full object with both prices
  return obj;
};

const getProducts = async (req, res) => {
  try {
    const { skip, limit, page, sort } = getPaginationParams(req);
    const role = req.user?.role || 'customer';

    const total = await ProductModel.countDocuments({ isDeleted: false });

    const products = await ProductModel
      .find({ isDeleted: false })
      .populate('categoryId')
      .populate('supplierId')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const sanitized = products.map(p => sanitizeProductForRole(p, role));

    const suppliers = await SupplierModel.find();
    const categories = await CategoryModel.find();

    const meta = getPaginationMeta(total, limit, page);

    return sendResponse(res, 200, {
      products: sanitized,
      suppliers,
      categories,
    }, 'Products retrieved successfully', meta);
  } catch (error) {
    console.error('Error fetching products:', error);
    return sendError(res, 500, 'Failed to fetch products');
  }
};

const addProduct = async (req, res) => {
  try {
    const { name, description, price, wholesalePrice, stock, categoryId, supplierId } = req.body;

    let imageUrl = null;
    if (req.file) {
      const uploadResult = await cloudinary.uploader.upload(req.file.path, {
        resource_type: 'image',
      });
      imageUrl = uploadResult.secure_url;
    }

    // If wholesalePrice is not provided or empty, default to retail price
    const finalWholesalePrice = (wholesalePrice && wholesalePrice !== '') ? Number(wholesalePrice) : Number(price);

    const product = await ProductModel.create({
      name,
      description,
      price,
      wholesalePrice: finalWholesalePrice,
      stock,
      categoryId,
      supplierId: supplierId && supplierId.trim() !== '' ? supplierId : null,
      image: imageUrl,
    });

    return sendResponse(res, 201, product, 'Product added successfully');
  } catch (error) {
    console.error('Error adding product:', error);
    return sendError(res, 500, 'Failed to add product');
  }
};

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await ProductModel.findById(id);
    if (!product) return sendError(res, 404, 'Product not found');

    const updateData = { ...req.body };

    // Handle wholesalePrice
    if ('wholesalePrice' in updateData) {
      const wp = updateData.wholesalePrice;
      // If admin provided an explicit value, use it.
      // If left blank/empty, inherit from the retail `price` (if provided in update) or existing product.price.
      if (wp !== '' && wp !== null && wp !== undefined) {
        updateData.wholesalePrice = Number(wp);
      } else {
        const retailSource = updateData.price !== undefined && updateData.price !== null && updateData.price !== ''
          ? Number(updateData.price)
          : product.price;
        updateData.wholesalePrice = Number(retailSource);
      }
    }

    // Handle supplierId
    if ('supplierId' in updateData) {
      const sid = updateData.supplierId;
      updateData.supplierId =
        sid && typeof sid === 'string' && sid.trim().length === 24
          ? sid.trim()
          : null;
    }

    // Handle image removal
    if (updateData.removeImage === 'true' || updateData.removeImage === true) {
      if (product.image) {
        const urlParts = product.image.split('/');
        const uploadIndex = urlParts.indexOf('upload');
        const publicId = urlParts.slice(uploadIndex + 2).join('/').replace(/\.[^/.]+$/, '');
        await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
      }
      updateData.image = null;
    }

    // Handle new image upload
    if (req.file) {
      if (product.image) {
        const urlParts = product.image.split('/');
        const uploadIndex = urlParts.indexOf('upload');
        const publicId = urlParts.slice(uploadIndex + 2).join('/').replace(/\.[^/.]+$/, '');
        await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
      }
      const uploadResult = await cloudinary.uploader.upload(req.file.path, {
        resource_type: 'image',
      });
      updateData.image = uploadResult.secure_url;
    }

    delete updateData.removeImage;

    const updated = await ProductModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    // If price fields changed, update any unpaid cart orders referencing this product
    try {
      const priceChanged =
        (updated.price !== product.price) ||
        (updated.wholesalePrice !== product.wholesalePrice);

      if (priceChanged) {
        const orders = await OrderModel.find({ product: id, paid: false }).select('priceMode quantity');
        if (orders.length > 0) {
          const bulk = orders.map((o) => {
            const newPrice = (o.priceMode === 'wholesale') ? (updated.wholesalePrice ?? updated.price) : updated.price;
            return {
              updateOne: {
                filter: { _id: o._id },
                update: { $set: { price: newPrice, totalPrice: newPrice * (o.quantity || 0) } },
              },
            };
          });
          await OrderModel.bulkWrite(bulk);
        }

        // Notify any listeners (SSE) that orders/prices changed for this product
        orderNotifier.emit('productPriceChanged', { productId: id, affected: orders.length || 0, updatedAt: new Date().toISOString() });
      }
    } catch (err) {
      console.error('Failed to propagate price change to orders:', err);
    }

    return sendResponse(res, 200, updated, 'Product updated successfully');
  } catch (error) {
    console.error(error);
    return sendError(res, 500, 'Failed to update product');
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const existingProduct = await ProductModel.findById(id);
    if (!existingProduct) return sendError(res, 404, 'Product not found');
    if (existingProduct.isDeleted) return sendError(res, 400, 'Product already deleted');

    const product = await ProductModel.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
    return sendResponse(res, 200, product, 'Product deleted successfully');
  } catch (error) {
    console.error('Error deleting product:', error);
    return sendError(res, 500, 'Failed to delete product');
  }
};

const getDeletedProducts = async (req, res) => {
  try {
    const { skip, limit, page, sort } = getPaginationParams(req);
    const total = await ProductModel.countDocuments({ isDeleted: true });

    const deletedProducts = await ProductModel
      .find({ isDeleted: true })
      .populate('categoryId', 'name')
      .populate('supplierId')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const meta = getPaginationMeta(total, limit, page);
    return sendResponse(res, 200, { products: deletedProducts }, 'Deleted products retrieved successfully', meta);
  } catch (error) {
    console.error('Error fetching deleted products:', error);
    return sendError(res, 500, 'Failed to fetch deleted products');
  }
};

const restoreProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await ProductModel.findById(id);
    if (!product) return sendError(res, 404, 'Product not found');
    if (!product.isDeleted) return sendError(res, 400, 'Product is not deleted');

    product.isDeleted = false;
    await product.save();
    return sendResponse(res, 200, product, 'Product restored successfully');
  } catch (error) {
    console.error('Error restoring product:', error);
    return sendError(res, 500, 'Failed to restore product');
  }
};

const deleteProductPermanent = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await ProductModel.findById(id);
    if (!product) return sendError(res, 404, 'Product not found');

    if (product.image) {
      const urlParts = product.image.split('/');
      const uploadIndex = urlParts.indexOf('upload');
      const publicId = urlParts.slice(uploadIndex + 2).join('/').replace(/\.[^/.]+$/, '');
      await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    }

    await ProductModel.findByIdAndDelete(id);
    return sendResponse(res, 200, null, 'Product permanently deleted');
  } catch (error) {
    console.error(error);
    return sendError(res, 500, 'Failed to permanently delete product');
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
