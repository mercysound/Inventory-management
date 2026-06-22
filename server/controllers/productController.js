import SupplierModel from '../models/SupplierModel.js';
import CategoryModel from '../models/CategoryModel.js';
import ProductModel from '../models/ProductModel.js';
import cloudinary from '../config/cloudinary.js';
import { sendResponse, sendError } from '../utils/apiResponse.js';
import { getPaginationParams, getPaginationMeta } from '../utils/pagination.js';
import OrderModel from '../models/OrderModel.js';
import orderNotifier from '../utils/orderNotifier.js';

// ─── Helper: upload a buffer to Cloudinary, return secure URL ────────────────
// Explicitly re-applies the cloudinary config at call time so the api_key is
// always present regardless of module initialization order.
const uploadToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    // Re-apply config here — guarantees credentials are set even if the
    // singleton wasn't initialized when the module was first imported.
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key:    process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    const stream = cloudinary.uploader.upload_stream(
      { resource_type: "image" },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
};

// ─── Helper: destroy a Cloudinary image by URL ───────────────────────────────
const destroyCloudinaryUrl = async (url) => {
  if (!url) return;
  try {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key:    process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    const parts       = url.split('/');
    const uploadIndex = parts.indexOf('upload');
    if (uploadIndex === -1) return;
    const publicId = parts.slice(uploadIndex + 2).join('/').replace(/\.[^/.]+$/, '');
    if (publicId) await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
  } catch (e) {
    console.error('Cloudinary destroy failed:', e.message);
  }
};

// ─── Helper: resolve canonical images array ───────────────────────────────────
// Always returns a clean string array. Merges new `images[]` with legacy
// single `image` field so the frontend always gets one consistent shape.
const resolveImages = (product) => {
  const obj = product.toObject ? product.toObject() : { ...product };
  const arr = Array.isArray(obj.images) ? obj.images.filter(Boolean) : [];
  if (arr.length === 0 && obj.image) return [obj.image];
  return arr;
};

// ─── Helper: sanitize product for role ───────────────────────────────────────
// Always injects the resolved `images` array so every frontend consumer gets it.
const sanitizeProductForRole = (product, role) => {
  const obj = product.toObject ? product.toObject() : { ...product };

  // Inject canonical images array
  obj.images = resolveImages(product);

  if (role === 'customer') {
    delete obj.wholesalePrice;
    delete obj.batchNumber;
    delete obj.expiryDate;
    return obj;
  }
  if (role === 'wholesale') {
    obj.price = obj.wholesalePrice ?? obj.price;
    delete obj.wholesalePrice;
    delete obj.batchNumber;
    delete obj.expiryDate;
    return obj;
  }
  // admin, staff → full object including batchNumber and expiryDate
  return obj;
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /products
// ─────────────────────────────────────────────────────────────────────────────
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

    const sanitized = products.map((p) => sanitizeProductForRole(p, role));
    const suppliers  = await SupplierModel.find();
    const categories = await CategoryModel.find();
    const meta       = getPaginationMeta(total, limit, page);

    return sendResponse(res, 200, { products: sanitized, suppliers, categories }, 'Products retrieved successfully', meta);
  } catch (error) {
    console.error('Error fetching products:', error);
    return sendError(res, 500, 'Failed to fetch products');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /products/add
// Accepts up to 5 images via multipart field "images".
// ─────────────────────────────────────────────────────────────────────────────
const addProduct = async (req, res) => {
  try {
    const { name, description, price, wholesalePrice, stock, categoryId, supplierId } = req.body;

    // Upload all provided images to Cloudinary (max 5, enforced by multer)
    const uploadedUrls = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const url = await uploadToCloudinary(file.buffer);
        uploadedUrls.push(url);
      }
    }

    const finalWholesalePrice =
      wholesalePrice && wholesalePrice !== '' ? Number(wholesalePrice) : Number(price);

    const product = await ProductModel.create({
      name,
      description,
      price:          Number(price),
      wholesalePrice: finalWholesalePrice,
      stock:          Number(stock),
      categoryId,
      supplierId:     supplierId && supplierId.trim() !== '' ? supplierId : null,
      images:         uploadedUrls,
      image:          uploadedUrls[0] || null,
      // Optional fields
      expiryDate:  req.body.expiryDate  || null,
      batchNumber: req.body.batchNumber || null,
    });

    const out = product.toObject();
    out.images = resolveImages(product);
    return sendResponse(res, 201, out, 'Product added successfully');
  } catch (error) {
    console.error('Error adding product:', error);
    return sendError(res, 500, 'Failed to add product');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /products/:id
// Images handling:
//   - `req.files`          → new images to add (appended, keeping existing ones
//                            unless `replaceImages=true` is sent)
//   - `keepImages`         → JSON-stringified array of existing URLs to retain
//                            (images NOT in this list are deleted from Cloudinary)
//   - `replaceImages=true` → delete ALL existing images first, then add new ones
// ─────────────────────────────────────────────────────────────────────────────
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await ProductModel.findById(id);
    if (!product) return sendError(res, 404, 'Product not found');

    const updateData = { ...req.body };

    // ── wholesalePrice ────────────────────────────────────────────────────
    if ('wholesalePrice' in updateData) {
      const wp = updateData.wholesalePrice;
      if (wp !== '' && wp !== null && wp !== undefined) {
        updateData.wholesalePrice = Number(wp);
      } else {
        const retailSource =
          updateData.price !== undefined && updateData.price !== ''
            ? Number(updateData.price)
            : product.price;
        updateData.wholesalePrice = Number(retailSource);
      }
    }

    // ── supplierId ────────────────────────────────────────────────────────
    if ('supplierId' in updateData) {
      const sid = updateData.supplierId;
      updateData.supplierId =
        sid && typeof sid === 'string' && sid.trim().length === 24
          ? sid.trim()
          : null;
    }

    // ── Multi-image logic ─────────────────────────────────────────────────
    // `keepImages` = JSON array of existing Cloudinary URLs to preserve.
    // Any existing URL not in keepImages is deleted from Cloudinary.
    let keepImages = [];
    if (updateData.keepImages) {
      try { keepImages = JSON.parse(updateData.keepImages); } catch { keepImages = []; }
      delete updateData.keepImages;
    } else {
      // If no keepImages sent, preserve all existing images by default
      keepImages = Array.isArray(product.images) ? [...product.images] : [];
      if (keepImages.length === 0 && product.image) keepImages = [product.image];
    }

    // Delete any existing images that were removed by the admin
    const existingImages = Array.isArray(product.images) && product.images.length > 0
      ? product.images
      : (product.image ? [product.image] : []);

    for (const url of existingImages) {
      if (!keepImages.includes(url)) {
        await destroyCloudinaryUrl(url);
      }
    }

    // Upload new images
    const newlyUploaded = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const url = await uploadToCloudinary(file.buffer);
        newlyUploaded.push(url);
      }
    }

    // Final images array (keep existing retained + new uploads, capped at 5)
    const finalImages = [...keepImages, ...newlyUploaded].slice(0, 5);
    updateData.images = finalImages;
    updateData.image  = finalImages[0] || null; // keep legacy field in sync

    // Remove old single-image fields from body to avoid conflicts
    delete updateData.removeImage;

    const updated = await ProductModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    // ── Propagate price changes to unpaid cart orders ─────────────────────
    try {
      const priceChanged =
        updated.price !== product.price ||
        updated.wholesalePrice !== product.wholesalePrice;

      if (priceChanged) {
        const orders = await OrderModel.find({ product: id, paid: false }).select('priceMode quantity');
        if (orders.length > 0) {
          const bulk = orders.map((o) => {
            const newPrice =
              o.priceMode === 'wholesale'
                ? (updated.wholesalePrice ?? updated.price)
                : updated.price;
            return {
              updateOne: {
                filter: { _id: o._id },
                update: { $set: { price: newPrice, totalPrice: newPrice * (o.quantity || 0) } },
              },
            };
          });
          await OrderModel.bulkWrite(bulk);
        }
        orderNotifier.emit('productPriceChanged', {
          productId:  id,
          affected:   orders.length || 0,
          updatedAt:  new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error('Failed to propagate price change to orders:', err);
    }

    const out = updated.toObject();
    out.images = resolveImages(updated);
    return sendResponse(res, 200, out, 'Product updated successfully');
  } catch (error) {
    console.error('updateProduct error:', error);
    return sendError(res, 500, 'Failed to update product');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /products/:id  (soft-delete)
// ─────────────────────────────────────────────────────────────────────────────
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await ProductModel.findById(id);
    if (!existing)          return sendError(res, 404, 'Product not found');
    if (existing.isDeleted) return sendError(res, 400, 'Product already deleted');

    const product = await ProductModel.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
    return sendResponse(res, 200, product, 'Product deleted successfully');
  } catch (error) {
    console.error('Error deleting product:', error);
    return sendError(res, 500, 'Failed to delete product');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /products/deleted
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// PUT /products/restore/:id
// ─────────────────────────────────────────────────────────────────────────────
const restoreProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await ProductModel.findById(id);
    if (!product)          return sendError(res, 404, 'Product not found');
    if (!product.isDeleted) return sendError(res, 400, 'Product is not deleted');

    product.isDeleted = false;
    await product.save();
    return sendResponse(res, 200, product, 'Product restored successfully');
  } catch (error) {
    console.error('Error restoring product:', error);
    return sendError(res, 500, 'Failed to restore product');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /products/permanent/:id  (hard-delete + Cloudinary cleanup)
// ─────────────────────────────────────────────────────────────────────────────
const deleteProductPermanent = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await ProductModel.findById(id);
    if (!product) return sendError(res, 404, 'Product not found');

    // Delete all images from Cloudinary
    const allImages = resolveImages(product);
    for (const url of allImages) {
      await destroyCloudinaryUrl(url);
    }

    await ProductModel.findByIdAndDelete(id);
    return sendResponse(res, 200, null, 'Product permanently deleted');
  } catch (error) {
    console.error('deleteProductPermanent error:', error);
    return sendError(res, 500, 'Failed to permanently delete product');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /products/:id/new-arrival
// Admin toggles the isNewArrival flag on a product.
// If marking as new arrival, newArrivalAt is set to now.
// If removing, newArrivalAt is cleared.
// The product remains in all categories and is still purchasable.
// ─────────────────────────────────────────────────────────────────────────────
const toggleNewArrival = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await ProductModel.findById(id);
    if (!product) return sendError(res, 404, 'Product not found');

    const next = !product.isNewArrival;
    product.isNewArrival = next;
    product.newArrivalAt  = next ? new Date() : null;
    await product.save();

    return sendResponse(res, 200, {
      isNewArrival: product.isNewArrival,
      newArrivalAt: product.newArrivalAt,
    }, next ? 'Marked as New Arrival' : 'Removed from New Arrivals');
  } catch (error) {
    console.error('toggleNewArrival error:', error);
    return sendError(res, 500, 'Failed to update new arrival status');
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
  toggleNewArrival,
};
