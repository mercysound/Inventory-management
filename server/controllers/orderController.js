import PDFDocument from "pdfkit";
import OrderModel from "../models/OrderModel.js";
import ProductModel from "../models/ProductModel.js";
import AllOrdersPlacedModel from "../models/AllOrdersPlacedModel.js";
import CompletedOrderHistoryModel from "../models/CompletedOrderHistoryModel.js";
import { sendAdminOrderPlacedEmail } from "../utils/email/adminOrderPlaced.js";
import { sendResponse, sendError } from "../utils/apiResponse.js";
import { getPaginationParams, getPaginationMeta } from "../utils/pagination.js";
import mongoose from "mongoose";

const STORE_ACCOUNT = {
  bankName:      "XYZ Bank",
  accountName:   "MELECH STORE",
  accountNumber: "1234567890",
};


/**
 * addOrder - add a single product to current user's cart (order)
 */
const addOrder = async (req, res) => {
  try {
    const { productId, quantity, total, price, priceMode } = req.body;
    const userId = req.user._id;

    const product = await ProductModel.findById(productId);
    if (!product) return sendError(res, 404, "Product not found in order");
    if (quantity > product.stock) return sendError(res, 400, "Not enough stock");

    const existing = await OrderModel.findOne({ userOrdering: userId, product: productId });
    const ONE_HOUR = new Date(Date.now() + 60 * 60 * 1000);

    const finalPriceMode = ["retail", "wholesale"].includes(priceMode) ? priceMode : "retail";
    const unitPrice = finalPriceMode === "wholesale"
      ? (product.wholesalePrice ?? product.price)
      : product.price;

    if (existing) {
      const newQty = existing.quantity + quantity;
      if (newQty > product.stock) return sendError(res, 400, "Not enough stock available");
      existing.quantity      = newQty;
      existing.price         = unitPrice;
      existing.totalPrice    = newQty * unitPrice;
      existing.priceMode     = finalPriceMode;
      existing.cartExpiresAt = ONE_HOUR;
      await existing.save();
      return sendResponse(res, 200, existing, "Order updated instead of duplicate");
    }

    const orderObj  = new OrderModel({
      userOrdering:  userId,
      product:       productId,
      quantity,
      price:         unitPrice,
      totalPrice:    total || (quantity * unitPrice),
      priceMode:     finalPriceMode,
      cartExpiresAt: ONE_HOUR,
    });
    await orderObj.save();
    return sendResponse(res, 200, orderObj, "Order added successfully");
  } catch (error) {
    console.error("addOrder error:", error);
    return sendError(res, 500, "Failed to add order");
  }
};


/**
 * getOrderByProduct - returns the current user's order for the given product (if any)
 */
const getOrderByProduct = async (req, res) => {
  try {
    const userId    = req.user._id;
    const { productId } = req.params;
    const order = await OrderModel.findOne({ userOrdering: userId, product: productId });
    return sendResponse(res, 200, order, "Order fetched successfully");
  } catch (error) {
    console.error("getOrderByProduct error:", error);
    return sendError(res, 500, "Failed to fetch order");
  }
};

/**
 * updateOrder - update quantity/total of an existing order
 */
const updateOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { quantity, total, price, priceMode } = req.body;

    const order = await OrderModel.findById(orderId).populate("product");
    if (!order) return sendError(res, 404, "Order not found");
    if (String(order.userOrdering) !== String(req.user._id)) return sendError(res, 403, "Unauthorized");

    const qty = Number(quantity);
    if (!qty || qty < 1) return sendError(res, 400, "Quantity must be at least 1");

    const product = await ProductModel.findById(order.product._id);
    if (!product) return sendError(res, 404, "Product not found");
    if (qty > product.stock) return sendError(res, 400, "Not enough stock available");

    const finalPriceMode = ["retail", "wholesale"].includes(priceMode) ? priceMode : order.priceMode || "retail";
    const unitPrice = finalPriceMode === "wholesale"
      ? (product.wholesalePrice ?? product.price)
      : product.price;

    order.quantity      = qty;
    order.price         = unitPrice;
    order.priceMode     = finalPriceMode;
    order.totalPrice    = total || unitPrice * qty;
    order.cartExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await order.save();
    return sendResponse(res, 200, order, "Order updated successfully");
  } catch (error) {
    console.error("updateOrder error:", error);
    return sendError(res, 500, "Failed to update order");
  }
};

/**
 * getOrders - return orders for current user (staff) or all for admin
 */
const getOrders = async (req, res) => {
  try {
    const userId = req.user._id;
    let query = {};
    if (["staff", "customer", "wholesale"].includes(req.user.role)) {
      query = { userOrdering: userId };
    }

    const { skip, limit, page, sort } = getPaginationParams(req);
    const total  = await OrderModel.countDocuments(query);
    const orders = await OrderModel.find(query)
      .populate({
        path:   "product",
        select: "name description price wholesalePrice image categoryId",
        populate: { path: "categoryId", select: "name" },
      })
      .sort(sort).skip(skip).limit(limit);

    const sanitizedOrders = orders.map((o) => ({
      _id:              o._id,
      product:          o.product,
      quantity:         o.quantity,
      totalPrice:       o.totalPrice ?? 0,
      orderDate:        o.orderDate,
      price:            o.price,
      priceMode:        o.priceMode || 'retail',
      userOrdering:     o.userOrdering,
    }));

    const meta = getPaginationMeta(total, limit, page);
    return sendResponse(res, 200, sanitizedOrders, "Orders retrieved successfully", meta);
  } catch (error) {
    console.error("getOrders error:", error);
    return sendError(res, 500, "Failed to fetch orders");
  }
};

/**
 * verifyStock - pre-payment stock check so we don't charge customer for unavailable items.
 * Call this BEFORE opening Paystack popup. Returns 409 if any item is under-stocked.
 */
const verifyStock = async (req, res) => {
  try {
    const userId = req.user._id;
    const orders = await OrderModel.find({ userOrdering: userId }).populate("product");
    if (!orders.length) return sendError(res, 400, "Your cart is empty");

    const conflicts = [];
    for (const o of orders) {
      const product = await ProductModel.findById(o.product._id).select("stock name");
      if (!product || product.stock < o.quantity) {
        conflicts.push({
          productName: product?.name || "Unknown item",
          requested:   o.quantity,
          available:   product?.stock ?? 0,
        });
      }
    }

    if (conflicts.length > 0) {
      return res.status(409).json({ success: false, message: "STOCK_CONFLICT", conflicts });
    }
    return sendResponse(res, 200, null, "Stock verified — safe to proceed with payment");
  } catch (error) {
    console.error("verifyStock error:", error);
    return sendError(res, 500, "Failed to verify stock");
  }
};

/**
 * completeOrder - saves payment and summary, marks paymentStatus as Paid.
 * For Paystack payments, accepts paystackReference so we can refund automatically
 * if stock fails AFTER payment has been charged.
 */
const completeOrder = async (req, res) => {
  const { paymentMethod, buyerName, paystackReference, isWholesale } = req.body;
  const userId = req.user._id;
  const role   = req.user.role;

  if (!paymentMethod) return sendError(res, 400, "Payment method is required");

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const orders = await OrderModel.find({ userOrdering: userId })
      .populate("product")
      .session(session);

    if (!orders.length) throw new Error("No active orders");

    // ── Atomic stock deduction ────────────────────────────────────────────
    for (const o of orders) {
      const updated = await ProductModel.findOneAndUpdate(
        { _id: o.product._id, stock: { $gte: o.quantity } },
        { $inc: { stock: -o.quantity } },
        { new: true, session }
      );

      if (!updated) {
        const currentStock = await ProductModel.findById(o.product._id).select("stock").session(session);
        const remaining    = currentStock?.stock ?? 0;

        // Auto-refund Paystack if charged
        if (paystackReference && paymentMethod === "Paystack") {
          try {
            await fetch("https://api.paystack.co/refund", {
              method:  "POST",
              headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json" },
              body:    JSON.stringify({ transaction: paystackReference, merchant_note: `Auto-refund: insufficient stock for ${o.product.name}` }),
            });
            console.log(`✅ Paystack refund initiated for ref: ${paystackReference}`);
          } catch (refundErr) {
            console.error("❌ Paystack refund failed:", refundErr.message);
          }
        }

        throw new Error(`STOCK_ERROR:${o.product.name}:${o.quantity}:${remaining}`);
      }
    }

    const totalPrice  = orders.reduce((sum, o) => sum + o.quantity * o.price, 0);
    const allQuantity = orders.reduce((sum, o) => sum + o.quantity, 0);
    const productList = orders.map((o) => ({
      productId:  o.product._id,
      quantity:   o.quantity,
      price:      o.price,
      totalPrice: o.quantity * o.price,
      priceMode:  o.priceMode || "retail",
    }));

    let placed;

    // ── customer OR wholesale → placed orders (admin manages delivery) ────
    if (role === "customer" || role === "wholesale") {
      placed = await AllOrdersPlacedModel.create([{
        userOrdering:  userId,
        buyerName:     buyerName || (role === "wholesale" ? "Wholesale Customer" : "Customer"),
        paymentMethod,
        totalPrice,
        allQuantity,
        productList,
        paid:          true,
        deliveryStatus: "pending",
      }], { session });

    } else {
      // ── staff → direct completed history (walk-in sale) ─────────────────
      // If isWholesale flag is set, prices in productList already reflect
      // wholesale rates (applied on the frontend before submitting)
      placed = await CompletedOrderHistoryModel.create([{
        userOrdering:  userId,
        buyerName:     buyerName || "Walk-in Customer",
        paymentMethod,
        totalPrice,
        allQuantity,
        productList,
        paid:          true,
        deliveryStatus: "delivered",
      }], { session });
    }

    await OrderModel.deleteMany({ userOrdering: userId }, { session });
    await session.commitTransaction();

    return sendResponse(res, 200, { orderId: placed[0]._id }, "Order completed successfully");
  } catch (error) {
    await session.abortTransaction();
    return sendError(res, 400, error.message || "Failed to complete order");
  } finally {
    session.endSession();
  }
};


/* generateInvoice - produce a PDF invoice for current user's active orders. */
const escapeHtml = (value) => {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

const generateInvoice = async (req, res) => {
  try {
    const {
      customerName  = "Guest Customer",
      paymentMethod = "Not Specified",
      mode          = "preview",
      orderSource   = "online",
      orderId,
      historyReceipt,
    } = req.query;

    const paymentStatus = mode === "final" ? "Paid" : "Unpaid";
    let orders = [];
    let receiptOrderId = orderId || null;
    let buyerInfo = { name: customerName, email: "", phone: "", role: "" };
    let hasPriceModes = false;

    // ── Preview → from active cart ───────────────────────────────────────
    if (mode === "preview") {
      const activeOrders = await OrderModel.find({ userOrdering: req.user._id })
        .populate({
          path:     "product",
          select:   "name description categoryId",
          populate: { path: "categoryId", select: "name" },
        });

      if (!activeOrders.length) {
        return res.status(404).json({ message: "No active orders to preview" });
      }

      // Get user details for buyer info
      const user = await OrderModel.findOne({ userOrdering: req.user._id }).session(null);
      if (req.user) {
        buyerInfo = {
          name: req.user.name || customerName,
          email: req.user.email || "",
          phone: req.user.phone || "",
          role: req.user.role || "",
        };
      }

      orders = activeOrders.map((o) => {
        const priceMode = o.priceMode || "retail";
        hasPriceModes = true;
        return {
          product: {
            name:         o.product?.name,
            desc:         o.product?.description || "",
            categoryName: o.product?.categoryId?.name,
          },
          quantity:   o.quantity,
          price:      o.price,
          totalPrice: o.quantity * o.price,
          priceMode:  priceMode,
          priceTag:   priceMode === "wholesale" ? "WSP" : "RTP",
        };
      });
    }

    // ── Final → from history model ────────────────────────────────────────
    if (mode === "final") {
      let HistoryModel;
      if (historyReceipt) {
        HistoryModel = CompletedOrderHistoryModel;
      } else {
        HistoryModel = orderSource === "staff" ? CompletedOrderHistoryModel : AllOrdersPlacedModel;
      }

      const query = orderId ? { _id: orderId } : { userOrdering: req.user._id };
      let order;

      if (historyReceipt) {
        order = await HistoryModel.findOne(query)
          .populate({
            path:     "productList.productId",
            select:   "name description categoryId",
            populate: { path: "categoryId", select: "name" },
          })
          .populate({ path: "userOrdering", select: "name email phone role" });
      } else {
        order = await HistoryModel.findOne(query)
          .populate({
            path:     "productList.productId",
            select:   "name description categoryId",
            populate: { path: "categoryId", select: "name" },
          })
          .populate({ path: "userOrdering", select: "name email phone role" })
          .sort({ createdAt: -1 });
      }

      if (!order) return res.status(404).json({ message: "Order not found" });

      receiptOrderId = order._id;
      
      // Extract buyer info from order or user
      if (order.userOrdering) {
        buyerInfo = {
          name: order.userOrdering.name || order.buyerName || customerName,
          email: order.userOrdering.email || "",
          phone: order.userOrdering.phone || "",
          role: order.userOrdering.role || "",
        };
      } else {
        buyerInfo = {
          name: order.buyerName || customerName,
          email: "",
          phone: "",
          role: orderSource === "staff" ? "staff" : "",
        };
      }

      orders = order.productList.map((i) => {
        const priceMode = i.priceMode || "retail";
        hasPriceModes = true;
        return {
          product: {
            name:         i.productId?.name,
            desc:         i.productId?.description || "",
            categoryName: i.productId?.categoryId?.name,
          },
          quantity:   i.quantity,
          price:      i.price,
          totalPrice: i.totalPrice,
          priceMode:  priceMode,
          priceTag:   priceMode === "wholesale" ? "WSP" : "RTP",
        };
      });
    }

    if (!orders.length) return res.status(404).json({ message: "No orders found" });

    const totalAmount   = orders.reduce((sum, o) => sum + o.totalPrice, 0);
    const receiptWidth  = 300;
    const margin        = 20;
    const contentWidth  = receiptWidth - margin * 2;

    const doc = new PDFDocument({ margin, size: [receiptWidth, 850] });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=receipt.pdf");
    doc.pipe(res);

    // Store name
    doc.fontSize(14).font("Helvetica-Bold").fillColor("#1E3A8A")
      .text("MELECH STORE", margin, 20, { align: "center", width: contentWidth });
    doc.fontSize(8).font("Helvetica").fillColor("#555")
      .text("Official Sales Receipt", margin, doc.y + 2, { align: "center", width: contentWidth });

    const divider = () => {
      doc.moveTo(margin, doc.y + 5).lineTo(receiptWidth - margin, doc.y + 5)
        .dash(2, { space: 2 }).strokeColor("#aaa").stroke().undash();
    };

    divider();
    doc.moveDown(0.8);
    doc.fontSize(7.5).font("Helvetica").fillColor("#000");

    // ── BUYER INFORMATION SECTION ──
    doc.fontSize(7).font("Helvetica-Bold").fillColor("#1E3A8A")
      .text("BUYER INFORMATION", margin, doc.y, { align: "left", width: contentWidth });
    doc.moveDown(0.4);
    doc.fontSize(7).font("Helvetica").fillColor("#000");
    
    // Format buyer name with role if available
    const buyerDisplay = buyerInfo.role 
      ? `${buyerInfo.name} (${buyerInfo.role.toUpperCase()})`
      : buyerInfo.name;
    
    const buyerLines = [
      ["Name:",      buyerDisplay],
      ...(buyerInfo.email ? [["Email:",     buyerInfo.email]] : []),
      ...(buyerInfo.phone ? [["Phone:",     buyerInfo.phone]] : []),
    ];

    const infoLines = [
      ["Order ID:",   receiptOrderId ? String(receiptOrderId).slice(-10).toUpperCase() : "N/A"],
      ["Date:",       new Date().toLocaleString()],
      ["Payment:",    paymentMethod],
      ["Status:",     paymentStatus],
    ];

    // Display buyer info
    buyerLines.forEach(([label, value]) => {
      const lineY = doc.y;
      doc.font("Helvetica-Bold").text(label, margin, lineY, { width: 50 });
      doc.font("Helvetica").text(value, margin + 52, lineY, { width: contentWidth - 52 });
      doc.moveDown(0.3);
    });

    divider();
    doc.moveDown(0.3);

    // Display transaction info
    infoLines.forEach(([label, value]) => {
      const lineY = doc.y;
      doc.font("Helvetica-Bold").text(label, margin, lineY, { width: 50 });
      doc.font("Helvetica").text(value, margin + 52, lineY, { width: contentWidth - 52 });
      doc.moveDown(0.3);
    });

    divider();
    doc.moveDown(0.5);

    // ── ITEMS TABLE ──
    const col = { num: margin, name: margin + 14, qty: margin + 90, price: margin + 130, tag: margin + 175, total: margin + 210 };

    doc.fontSize(7).font("Helvetica-Bold").fillColor("#fff")
      .rect(margin, doc.y, contentWidth, 14).fill("#1E3A8A").stroke();

    const headerY = doc.y - 14;
    doc.fillColor("#fff");
    doc.text("#",     col.num,   headerY + 3, { width: 12 });
    doc.text("Item",  col.name,  headerY + 3, { width: 74 });
    doc.text("Qty",   col.qty,   headerY + 3, { width: 38 });
    doc.text("Price", col.price, headerY + 3, { width: 42 });
    if (hasPriceModes) {
      doc.text("Type", col.tag, headerY + 3, { width: 30 });
    }
    doc.text("Total", col.total, headerY + 3, { width: 42 });

    doc.fillColor("#000").font("Helvetica").fontSize(7);
    let y = doc.y + 4;

    orders.forEach((o, index) => {
      const name       = o.product.name || "—";
      const category   = o.product.categoryName ? `[${o.product.categoryName}]` : "";
      const rawDesc    = o.product.desc || "";
      const shortDesc  = rawDesc.length > 35 ? rawDesc.slice(0, 35) + "…" : rawDesc;
      const nameText   = `${name} ${category}`.trim();
      const nameHeight = doc.heightOfString(nameText, { width: 74 });
      const descHeight = shortDesc ? doc.heightOfString(shortDesc, { width: 74 }) : 0;
      const rowHeight  = Math.max(20, nameHeight + descHeight + 8);

      doc.rect(margin, y, contentWidth, rowHeight)
        .fill(index % 2 === 0 ? "#F3F4F6" : "#FFFFFF").stroke();

      doc.fillColor("#000");
      doc.font("Helvetica-Bold").fontSize(6.5).text(String(index + 1), col.num, y + 3, { width: 12 });
      doc.font("Helvetica-Bold").fontSize(7).text(nameText, col.name, y + 3, { width: 74 });

      if (shortDesc) {
        doc.font("Helvetica").fontSize(6).fillColor("#555")
          .text(shortDesc, col.name, y + 3 + nameHeight, { width: 74 });
      }

      const midY = y + rowHeight / 2 - 4;
      doc.fillColor("#000").font("Helvetica").fontSize(6.5);
      doc.text(String(o.quantity), col.qty, midY, { width: 38 });
      doc.text(`₦${o.price.toLocaleString()}`, col.price, midY, { width: 42 });
      
      if (hasPriceModes) {
        const tagColor = o.priceTag === "WSP" ? "#d97706" : "#059669";
        doc.fillColor(tagColor).font("Helvetica-Bold").fontSize(6)
          .text(o.priceTag, col.tag, midY + 1, { width: 30 });
        doc.fillColor("#000");
      }
      
      doc.font("Helvetica").fontSize(6.5)
        .text(`₦${o.totalPrice.toLocaleString()}`, col.total, midY, { width: 42 });

      y += rowHeight;
    });

    y += 6;
    doc.moveTo(margin, y).lineTo(receiptWidth - margin, y).strokeColor("#000").stroke();
    y += 6;
    doc.fontSize(8).font("Helvetica-Bold").fillColor("#000")
      .text(`TOTAL:`, col.num, y, { width: 90 })
      .text(`₦${totalAmount.toLocaleString()}`, col.total, y, { width: 60 });
    y += 18;

    // ── PRICE MODE LEGEND ──
    if (hasPriceModes) {
      doc.fontSize(6.5).font("Helvetica").fillColor("#555");
      doc.text("RTP = Retail Price", margin, y);
      doc.text("WSP = Wholesale Price", margin, doc.y + 3);
      y = doc.y + 8;
    }

    if (paymentStatus === "Unpaid") {
      divider();
      doc.moveDown(0.5);
      doc.fontSize(7.5).font("Helvetica-Bold").fillColor("#b91c1c")
        .text("PAYMENT INSTRUCTIONS", margin, doc.y, { align: "center", width: contentWidth });
      doc.font("Helvetica").fillColor("#000").moveDown(0.3);
      [
        ["Bank:",           STORE_ACCOUNT.bankName],
        ["Account Name:",   STORE_ACCOUNT.accountName],
        ["Account No:",     STORE_ACCOUNT.accountNumber],
      ].forEach(([label, value]) => {
        const lineY = doc.y;
        doc.font("Helvetica-Bold").text(label, margin, lineY, { width: 75 });
        doc.font("Helvetica").text(value, margin + 77, lineY, { width: contentWidth - 77 });
        doc.moveDown(0.3);
      });
    }

    divider();
    doc.moveDown(0.5);
    doc.fontSize(7).font("Helvetica").fillColor("gray")
      .text("Thank you for shopping with MELECH STORE!", margin, doc.y, { align: "center", width: contentWidth });
    doc.text("No signature required — auto-generated receipt", margin, doc.y + 4, { align: "center", width: contentWidth });

    doc.end();
  } catch (error) {
    console.error("generateInvoice error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * reduceOrder - decrease quantity
 */
const reduceOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await OrderModel.findById(orderId);
    if (!order) return sendError(res, 404, "Order not found");

    if (order.quantity <= 1) {
      await OrderModel.findByIdAndDelete(orderId);
      return sendResponse(res, 200, { deleted: true }, "Order removed successfully");
    }

    order.quantity     -= 1;
    order.totalPrice    = order.price * order.quantity;
    order.cartExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await order.save();
    return sendResponse(res, 200, order, "Order reduced successfully");
  } catch (error) {
    console.error("reduceOrder error:", error);
    return sendError(res, 500, "Error reducing order");
  }
};

const increaseOrderQuantity = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await OrderModel.findById(orderId).populate("product");
    if (!order) return sendError(res, 404, "Order not found");

    const product = await ProductModel.findById(order.product._id);
    if (!product) return sendError(res, 404, "Product not found");
    if (order.quantity >= product.stock) {
      return sendError(res, 400, "Cannot increase quantity beyond available stock.");
    }

    order.quantity     += 1;
    order.totalPrice    = order.price * order.quantity;
    order.cartExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await order.save();
    return sendResponse(res, 200, order, "Quantity increased successfully");
  } catch (error) {
    console.error("Error increasing order quantity:", error);
    return sendError(res, 500, "Failed to increase order quantity");
  }
};

/**
 * deleteOrderItem - delete single item
 */
const deleteOrderItem = async (req, res) => {
  try {
    const { orderId } = req.params;
    const deleted = await OrderModel.findByIdAndDelete(orderId);
    if (!deleted) return sendError(res, 404, "Order not found");
    return sendResponse(res, 200, null, "Order item deleted successfully");
  } catch (error) {
    console.error("deleteOrderItem error:", error);
    return sendError(res, 500, "Failed to delete order item");
  }
};
/**
 * clearUserOrders - remove all current user's orders
 */
const clearUserOrders = async (req, res) => {
  try {
    await OrderModel.deleteMany({ userOrdering: req.user._id });
    return sendResponse(res, 200, null, "User orders cleared successfully");
  } catch (error) {
    console.error("clearUserOrders error:", error);
    return sendError(res, 500, "Failed to clear user orders");
  }
};

/**
 * setPriceMode - toggle all cart items between wholesale and retail pricing
 * When toggled, recalculates prices based on the product's configured rates
 */
const setPriceMode = async (req, res) => {
  try {
    const { mode } = req.params;
    const userId = req.user._id;

    if (!["retail", "wholesale"].includes(mode)) {
      return sendError(res, 400, "Invalid price mode. Must be 'retail' or 'wholesale'");
    }

    // Fetch all user's cart orders
    const orders = await OrderModel.find({ userOrdering: userId }).populate("product");
    if (!orders.length) {
      return sendError(res, 400, "Your cart is empty");
    }

    // Update each order with the new price tier
    for (const order of orders) {
      const product = order.product;
      let newPrice;

      if (mode === "wholesale") {
        // Use wholesale price if available; fallback to retail
        newPrice = product.wholesalePrice ?? product.price;
      } else {
        // mode === "retail"
        newPrice = product.price;
      }

      order.price = newPrice;
      order.totalPrice = newPrice * order.quantity;
      order.priceMode = mode;
      order.cartExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await order.save();
    }

    return sendResponse(res, 200, { mode, updated: orders.length }, `Cart pricing switched to ${mode}`);
  } catch (error) {
    console.error("setPriceMode error:", error);
    return sendError(res, 500, "Failed to set price mode");
  }
};

export {
  addOrder,
  verifyStock,
  getOrders,
  completeOrder,
  reduceOrder,
  deleteOrderItem,
  clearUserOrders,
  increaseOrderQuantity,
  getOrderByProduct,
  updateOrder,
  generateInvoice,
  setPriceMode
};