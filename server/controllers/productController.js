import SupplierModel from '../models/SupplierModel.js';
import CategoryModel from '../models/CategoryModel.js';
import ProductModel from '../models/ProductModel.js';
import cloudinary from '../config/cloudinary.js';
import { sendResponse, sendError } from '../utils/apiResponse.js';
import { getPaginationParams, getPaginationMeta } from '../utils/pagination.js';
import OrderModel from '../models/OrderModel.js';
import orderNotifier from '../utils/orderNotifier.js';
import productNotifier from '../utils/productNotifier.js';

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
// Staff-only products are excluded from customer and wholesale responses
// at the DATA level — they simply won't be in the returned array.
const sanitizeProductForRole = (product, role) => {
  const obj = product.toObject ? product.toObject() : { ...product };

  // Inject canonical images array
  obj.images = resolveImages(product);

  if (role === 'customer') {
    // Hide staff-only products from online customers entirely
    if (obj.isStaffOnly) return null;
    delete obj.wholesalePrice;
    delete obj.batchNumber;
    delete obj.expiryDate;
    return obj;
  }
  if (role === 'wholesale') {
    // Hide staff-only products from wholesale online customers
    if (obj.isStaffOnly) return null;
    obj.price = obj.wholesalePrice ?? obj.price;
    delete obj.wholesalePrice;
    delete obj.batchNumber;
    delete obj.expiryDate;
    return obj;
  }
  // admin, staff → full object including all flags
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

    const sanitized = products.map((p) => sanitizeProductForRole(p, role)).filter(Boolean);
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

    // Parse variants from JSON string (multipart form sends it as string)
    let parsedVariants = [];
    if (req.body.variants) {
      try { parsedVariants = JSON.parse(req.body.variants); } catch {}
    }

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
      expiryDate:   req.body.expiryDate   || null,
      batchNumber:  req.body.batchNumber  || null,
      isNewArrival: req.body.isNewArrival === 'true' || req.body.isNewArrival === true,
      isBonanza:    req.body.isBonanza    === 'true' || req.body.isBonanza    === true,
      isStaffOnly:  req.body.isStaffOnly  === 'true' || req.body.isStaffOnly  === true,
      variants:     parsedVariants,
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

    // Parse variants JSON string (sent via multipart/form-data)
    if ('variants' in updateData && typeof updateData.variants === 'string') {
      try {
        updateData.variants = JSON.parse(updateData.variants);
      } catch {
        delete updateData.variants;
      }
    }

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
    // Emit real-time flag change to all connected product SSE clients
    productNotifier.emit('productFlagChanged', {
      productId:   id,
      isNewArrival: next,
      newArrivalAt: product.newArrivalAt,
    });
    return sendResponse(res, 200, {
      isNewArrival: product.isNewArrival,
      newArrivalAt: product.newArrivalAt,
    }, next ? 'Marked as New Arrival' : 'Removed from New Arrivals');
  } catch (error) {
    console.error('toggleNewArrival error:', error);
    return sendError(res, 500, 'Failed to update new arrival status');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /products/:id/bonanza
// Admin toggles the isBonanza flag on a product.
// ─────────────────────────────────────────────────────────────────────────────
const toggleBonanza = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await ProductModel.findById(id);
    if (!product) return sendError(res, 404, 'Product not found');
    const next = !product.isBonanza;
    product.isBonanza = next;
    await product.save();
    productNotifier.emit('productFlagChanged', { productId: id, isBonanza: next });
    return sendResponse(res, 200, { isBonanza: next }, next ? 'Added to Bonanza' : 'Removed from Bonanza');
  } catch (error) {
    console.error('toggleBonanza error:', error);
    return sendError(res, 500, 'Failed to update bonanza status');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /products/:id/staff-only
// Admin toggles the isStaffOnly flag on a product.
// ─────────────────────────────────────────────────────────────────────────────
const toggleStaffOnly = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await ProductModel.findById(id);
    if (!product) return sendError(res, 404, 'Product not found');
    const next = !product.isStaffOnly;
    product.isStaffOnly = next;
    await product.save();
    productNotifier.emit('productFlagChanged', { productId: id, isStaffOnly: next });
    return sendResponse(res, 200, { isStaffOnly: next }, next ? 'Marked as Staff-Only' : 'Now visible to all');
  } catch (error) {
    console.error('toggleStaffOnly error:', error);
    return sendError(res, 500, 'Failed to update staff-only status');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /products/batch/delete  — soft-delete multiple products
// POST /products/batch/permanent-delete  — hard-delete multiple products
// POST /products/batch/flag  — toggle a flag on multiple products
// ─────────────────────────────────────────────────────────────────────────────
const batchDelete = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return sendError(res, 400, 'No product IDs provided');
    await ProductModel.updateMany({ _id: { $in: ids } }, { isDeleted: true });
    return sendResponse(res, 200, { deleted: ids.length }, `${ids.length} product(s) deleted`);
  } catch (error) {
    console.error('batchDelete error:', error);
    return sendError(res, 500, 'Failed to delete products');
  }
};

const batchPermanentDelete = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return sendError(res, 400, 'No product IDs provided');
    // Delete images from Cloudinary for each product
    const products = await ProductModel.find({ _id: { $in: ids } });
    for (const p of products) {
      const imgs = resolveImages(p);
      for (const url of imgs) { await destroyCloudinaryUrl(url); }
    }
    await ProductModel.deleteMany({ _id: { $in: ids } });
    return sendResponse(res, 200, { deleted: ids.length }, `${ids.length} product(s) permanently deleted`);
  } catch (error) {
    console.error('batchPermanentDelete error:', error);
    return sendError(res, 500, 'Failed to permanently delete products');
  }
};

const VALID_FLAGS = ['isNewArrival', 'isBonanza', 'isStaffOnly'];

const batchToggleFlag = async (req, res) => {
  try {
    const { ids, flag, value } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return sendError(res, 400, 'No product IDs provided');
    if (!VALID_FLAGS.includes(flag)) return sendError(res, 400, `Invalid flag. Must be one of: ${VALID_FLAGS.join(', ')}`);
    const updateObj = { [flag]: Boolean(value) };
    if (flag === 'isNewArrival') updateObj.newArrivalAt = Boolean(value) ? new Date() : null;
    await ProductModel.updateMany({ _id: { $in: ids } }, updateObj);
    // Emit SSE for each changed product so customer pages update in real-time
    ids.forEach((productId) => {
      productNotifier.emit('productFlagChanged', { productId, ...updateObj });
    });
    return sendResponse(res, 200, { updated: ids.length }, `${ids.length} product(s) updated`);
  } catch (error) {
    console.error('batchToggleFlag error:', error);
    return sendError(res, 500, 'Failed to update product flags');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /products/:id/low-stock-config
// Admin sets the individual low-stock threshold and ON/OFF for a product.
// Body: { threshold: number|null, enabled: boolean }
// ─────────────────────────────────────────────────────────────────────────────
const setLowStockConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const { threshold, enabled } = req.body;

    const product = await ProductModel.findById(id);
    if (!product) return sendError(res, 404, 'Product not found');

    if (threshold !== undefined) {
      product.individualLowStockThreshold =
        threshold === null || threshold === "" ? null : Math.max(0, Number(threshold));
    }
    if (enabled !== undefined) {
      product.individualLowStockAlertEnabled = Boolean(enabled);
    }
    await product.save();

    // Notify connected clients so ProductTable updates in real-time
    productNotifier.emit('productFlagChanged', {
      productId:                      id,
      individualLowStockThreshold:    product.individualLowStockThreshold,
      individualLowStockAlertEnabled: product.individualLowStockAlertEnabled,
    });

    return sendResponse(res, 200, {
      individualLowStockThreshold:    product.individualLowStockThreshold,
      individualLowStockAlertEnabled: product.individualLowStockAlertEnabled,
    }, 'Low stock config updated');
  } catch (error) {
    console.error('setLowStockConfig error:', error);
    return sendError(res, 500, 'Failed to update low stock config');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /products/public
// No auth required. Returns all non-deleted, non-staff-only products.
// Respects guestBrowsingEnabled setting — returns 403 when disabled.
// Retail prices only; wholesale prices stripped.
// ─────────────────────────────────────────────────────────────────────────────
export const getPublicProducts = async (req, res) => {
  try {
    // Check guest browsing setting
    const SettingsModel = (await import('../models/SettingsModel.js')).default;
    const settings = await SettingsModel.findOne({}).sort({ createdAt: 1 });
    if (settings?.guestBrowsingEnabled === false) {
      return sendError(res, 403, 'Public browsing is currently disabled');
    }

    const { skip, limit, page, sort } = getPaginationParams(req);
    const total = await ProductModel.countDocuments({ isDeleted: false, isStaffOnly: false });

    const products = await ProductModel
      .find({ isDeleted: false, isStaffOnly: false })
      .populate('categoryId', 'name')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const sanitized = products.map((p) => {
      const obj = p.toObject();
      obj.images = resolveImages(p);
      // Strip sensitive/internal fields for public view
      delete obj.wholesalePrice;
      delete obj.batchNumber;
      delete obj.expiryDate;
      delete obj.supplierId;
      delete obj.lastExpiryWarningSentAt;
      delete obj.lastLowStockAlertSentAt;
      delete obj.individualLowStockThreshold;
      delete obj.individualLowStockAlertEnabled;
      // Strip variants with zero stock
      if (Array.isArray(obj.variants)) {
        obj.variants = obj.variants.filter(v => v.stock > 0);
      }
      return obj;
    });

    const categories = await (await import('../models/CategoryModel.js')).default.find().select('name');
    const meta = getPaginationMeta(total, limit, page);

    return sendResponse(res, 200, { products: sanitized, categories }, 'Public products retrieved', meta);
  } catch (error) {
    console.error('getPublicProducts error:', error);
    return sendError(res, 500, 'Failed to fetch products');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /products/public/:id
// No auth required. Returns a single product for the detail page.
// Also respects guestBrowsingEnabled.
// ─────────────────────────────────────────────────────────────────────────────
export const getPublicProductById = async (req, res) => {
  try {
    const SettingsModel = (await import('../models/SettingsModel.js')).default;
    const settings = await SettingsModel.findOne({}).sort({ createdAt: 1 });
    if (settings?.guestBrowsingEnabled === false) {
      return sendError(res, 403, 'Public browsing is currently disabled');
    }

    const { id } = req.params;
    const product = await ProductModel.findOne({ _id: id, isDeleted: false, isStaffOnly: false })
      .populate('categoryId', 'name');
    if (!product) return sendError(res, 404, 'Product not found');

    const obj = product.toObject();
    obj.images = resolveImages(product);
    delete obj.wholesalePrice;
    delete obj.batchNumber;
    delete obj.expiryDate;
    delete obj.supplierId;
    delete obj.lastExpiryWarningSentAt;
    delete obj.lastLowStockAlertSentAt;
    delete obj.individualLowStockThreshold;
    delete obj.individualLowStockAlertEnabled;
    // Only show variants that still have stock
    if (Array.isArray(obj.variants)) {
      obj.variants = obj.variants.filter(v => v.stock > 0);
    }

    // Fetch reviews
    const ReviewModel = (await import('../models/ReviewModel.js')).default;
    const reviews = await ReviewModel.find({ productId: id, approved: true })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('userId', 'name');

    return sendResponse(res, 200, { product: obj, reviews }, 'Product retrieved');
  } catch (error) {
    console.error('getPublicProductById error:', error);
    return sendError(res, 500, 'Failed to fetch product');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /products/:id/duplicate   (admin only)
// Creates a copy of the product with a " (Copy)" suffix on the name.
// Images are reused (same Cloudinary URLs — no re-upload needed).
// Stock defaults to 0 on the copy so admin can set correct levels.
// ─────────────────────────────────────────────────────────────────────────────
export const duplicateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const source = await ProductModel.findById(id);
    if (!source) return sendError(res, 404, 'Product not found');

    const sourceObj = source.toObject();

    // Strip identity fields — Mongoose creates new _id automatically
    delete sourceObj._id;
    delete sourceObj.createdAt;
    delete sourceObj.updatedAt;
    delete sourceObj.__v;

    // Mark as draft so it won't show until admin edits it
    sourceObj.name        = `${sourceObj.name} (Copy)`;
    sourceObj.stock       = 0;                 // admin sets correct stock
    sourceObj.isNewArrival = false;
    sourceObj.newArrivalAt = null;
    sourceObj.isBonanza   = false;
    sourceObj.isDeleted   = false;
    // Keep variants but zero out their stock too
    if (Array.isArray(sourceObj.variants)) {
      sourceObj.variants = sourceObj.variants.map(v => ({ ...v, stock: 0 }));
    }
    // Reset tracking timestamps
    sourceObj.lastExpiryWarningSentAt = null;
    sourceObj.lastLowStockAlertSentAt = null;

    const copy = await ProductModel.create(sourceObj);
    const out  = copy.toObject();
    out.images = resolveImages(copy);

    return sendResponse(res, 201, out, 'Product duplicated successfully');
  } catch (error) {
    console.error('duplicateProduct error:', error);
    return sendError(res, 500, 'Failed to duplicate product');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /products/authenticated/:id
// Auth required. Returns full product detail for logged-in users
// (staff/admin see all fields; customer/wholesale see role-filtered view).
// ─────────────────────────────────────────────────────────────────────────────
export const getAuthenticatedProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const role   = req.user?.role || 'customer';
    const product = await ProductModel.findOne({ _id: id, isDeleted: false })
      .populate('categoryId', 'name')
      .populate('supplierId', 'name');
    if (!product) return sendError(res, 404, 'Product not found');

    const sanitized = sanitizeProductForRole(product, role);
    if (!sanitized) return sendError(res, 403, 'Access denied');

    // Fetch reviews (approved only for customers; all for admin/staff)
    const ReviewModel = (await import('../models/ReviewModel.js')).default;
    const reviewQuery = (role === 'admin' || role === 'staff')
      ? { productId: id }
      : { productId: id, approved: true };
    const reviews = await ReviewModel.find(reviewQuery)
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('userId', 'name');

    return sendResponse(res, 200, { product: sanitized, reviews }, 'Product retrieved');
  } catch (error) {
    console.error('getAuthenticatedProductById error:', error);
    return sendError(res, 500, 'Failed to fetch product');
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
  toggleBonanza,
  toggleStaffOnly,
  batchDelete,
  batchPermanentDelete,
  batchToggleFlag,
  setLowStockConfig,
};
