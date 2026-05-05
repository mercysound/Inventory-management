import PDFDocument from "pdfkit";
import OrderModel from "../models/OrderModel.js";
import ProductModel from "../models/ProductModel.js";
import AllOrdersPlacedModel from "../models/AllOrdersPlacedModel.js";
import CompletedOrderHistoryModel from "../models/CompletedOrderHistoryModel.js";
import { sendAdminOrderPlacedEmail } from "../utils/email/adminOrderPlaced.js";
import { sendResponse, sendError } from '../utils/apiResponse.js';
import { getPaginationParams, getPaginationMeta } from '../utils/pagination.js';
import mongoose from "mongoose";
// import { STORE_ACCOUNT } from "../config/storeAccount.js";
const STORE_ACCOUNT = {
  bankName: "XYZ Bank",
  accountName: "MELECH STORE",
  accountNumber: "1234567890",
};


/**
 * addOrder - add a single product to current user's cart (order)
 */
const addOrder = async (req, res) => {
  try {
    const { productId, quantity, total, price } = req.body;
    const userId = req.user._id;

    const product = await ProductModel.findById(productId);
    if (!product) {
      return sendError(res, 404, "Product not found in order");
    }

    if (quantity > product.stock) {
      return sendError(res, 400, "Not enough stock");
    }

    // ✅ CHECK IF ORDER ALREADY EXISTS
    const existing = await OrderModel.findOne({
      userOrdering: userId,
      product: productId,
    });

    if (existing) {
      // ✅ UPDATE INSTEAD OF DUPLICATE
      const newQty = existing.quantity + quantity;

      if (newQty > product.stock) {
        return sendError(res, 400, "Not enough stock available");
      }

      existing.quantity = newQty;
      existing.totalPrice = newQty * (price || existing.price);
      existing.price = price || existing.price;

      await existing.save();

      return sendResponse(res, 200, existing, "Order updated instead of duplicate");
    }

    // ✅ CREATE NEW ORDER (ONLY IF NONE EXISTS)
    const orderObj = new OrderModel({
      userOrdering: userId,
      product: productId,
      quantity,
      totalPrice: total,
      price,
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
    const userId = req.user._id;
    const { productId } = req.params;

    const order = await OrderModel.findOne({
      userOrdering: userId,
      product: productId,
    });

    return sendResponse(res, 200, order, "Order fetched successfully");
  } catch (error) {
    console.error("getOrderByProduct error:", error);
    return sendError(res, 500, "Failed to fetch order");
  }
};

/**
 * updateOrder - update quantity/total of an existing order (makes sure stock is available)
 */
const updateOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { quantity, total, price } = req.body;

    const order = await OrderModel.findById(orderId).populate("product");
    if (!order) {
      return sendError(res, 404, "Order not found");
    }

    if (String(order.userOrdering) !== String(req.user._id)) {
      return sendError(res, 403, "Unauthorized");
    }

    const qty = Number(quantity);
    if (!qty || qty < 1) {
      return sendError(res, 400, "Quantity must be at least 1");
    }

    const product = await ProductModel.findById(order.product._id);
    if (!product) {
      return sendError(res, 404, "Product not found");
    }

    if (qty > product.stock) {
      return sendError(res, 400, "Not enough stock available");
    }

    order.quantity = qty;
    order.totalPrice = total || (price || order.price) * qty;
    order.price = price || order.price;
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

    if (req.user.role === "staff" || req.user.role === "customer") {
      query = { userOrdering: userId };
    }

    const { skip, limit, page, sort } = getPaginationParams(req);
    const total = await OrderModel.countDocuments(query);

    const orders = await OrderModel.find(query)
      .populate({
        path: "product",
        select: "name description price image categoryId",
        populate: { path: "categoryId", select: "name" },
      })
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const sanitizedOrders = orders.map((o) => ({
      _id: o._id,
      product: o.product,
      quantity: o.quantity,
      totalPrice: o.totalPrice ?? 0,
      orderDate: o.orderDate,
      price: o.price,
      userOrdering: o.userOrdering,
    }));

    const meta = getPaginationMeta(total, limit, page);
    return sendResponse(res, 200, sanitizedOrders, "Orders retrieved successfully", meta);
  } catch (error) {
    console.error("getOrders error:", error);
    return sendError(res, 500, "Failed to fetch orders");
  }
};


/**
 * completeOrder - saves payment and summary, marks paymentStatus as Paid
 */
const completeOrder = async (req, res) => {
  const { paymentMethod, buyerName } = req.body;
  const userId = req.user._id;

  //used chargtp to change it
  if (!paymentMethod) {
  return sendError(res, 400, "Payment method is required");
}

  const session = await mongoose.startSession();
  session.startTransaction();

  try {

    const orders = await OrderModel.find({ userOrdering: userId })
      .populate("product")
      .session(session);

    if (!orders.length) {
      throw new Error("No active orders");
    }

    for (const o of orders) {

      const updated = await ProductModel.findOneAndUpdate(
        {
          _id: o.product._id,
          stock: { $gte: o.quantity }
        },
        { $inc: { stock: -o.quantity } },
        { new: true, session }
      );

      if (!updated) {
        throw new Error(`Insufficient stock for ${o.product.name}`);
      }
    }

    const totalPrice = orders.reduce(
      (sum, o) => sum + o.quantity * o.price, 0
    );

    const allQuantity = orders.reduce(
      (sum, o) => sum + o.quantity, 0
    );

    const productList = orders.map(o => ({
      productId: o.product._id,
      quantity: o.quantity,
      price: o.price,
      totalPrice: o.quantity * o.price,
    }));

    let placed;

    if (req.user.role === "customer") {
      placed = await AllOrdersPlacedModel.create([{
        userOrdering: userId,
        buyerName: buyerName || "Customer",
        paymentMethod,
        totalPrice,
        allQuantity,
        productList,
        paid: true,
        deliveryStatus: "Pending",
      }], { session });
    } else {
      placed = await CompletedOrderHistoryModel.create([{
        userOrdering: userId,
        buyerName: buyerName || "Walk-in Customer",
        paymentMethod,
        totalPrice,
        allQuantity,
        productList,
        paid: true,
        deliveryStatus: "Completed",
      }], { session });
    }

    await OrderModel.deleteMany(
      { userOrdering: userId },
      { session }
    );

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
const generateInvoice = async (req, res) => {
  try {
    const {
      customerName = "Guest Customer",
      paymentMethod = "Not Specified",
      mode = "preview",
      orderSource = "online",
      orderId,
      historyReceipt
    } = req.query;

    const paymentStatus = mode === "final" ? "Paid" : "Unpaid";

    let orders = [];
    let receiptOrderId = orderId || null;

    /* ======================================================
       1️⃣ PREVIEW → FROM CART
    ====================================================== */
    if (mode === "preview") {
      const activeOrders = await OrderModel.find({
        userOrdering: req.user._id,
      }).populate({
        path: "product",
        populate: { path: "categoryId", select: "name" },
      });

      if (!activeOrders.length) {
        return res.status(404).json({ message: "No active orders to preview" });
      }

      orders = activeOrders.map((o) => ({
        product: {
          name: o.product?.name,
          categoryName: o.product?.categoryId?.name,
        },
        quantity: o.quantity,
        price: o.price,
        totalPrice: o.quantity * o.price,
      }));
    }

    /* ======================================================
       2️⃣ FINAL → FROM HISTORY MODEL
    ====================================================== */
    if (mode === "final") {
      let HistoryModel;

      if (historyReceipt) {
        HistoryModel = CompletedOrderHistoryModel;
      } else {
        HistoryModel = orderSource === "staff"
          ? CompletedOrderHistoryModel
          : AllOrdersPlacedModel;
      }

      const query = orderId
        ? { _id: orderId }
        : { userOrdering: req.user._id };

      let order;

      if (historyReceipt) {
        order = await HistoryModel.findOne(query).populate({
          path: "productList.productId",
          populate: { path: "categoryId", select: "name" },
        });
      } else {
        order = await HistoryModel.findOne(query)
          .populate({
            path: "productList.productId",
            populate: { path: "categoryId", select: "name" },
          })
          .sort({ createdAt: -1 });
      }

      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // ✅ capture the real order ID for the receipt
      receiptOrderId = order._id;

      orders = order.productList.map((i) => ({
        product: {
          name: i.productId?.name,
          categoryName: i.productId?.categoryId?.name,
        },
        quantity: i.quantity,
        price: i.price,
        totalPrice: i.totalPrice,
      }));
    }

    if (!orders.length) {
      return res.status(404).json({ message: "No orders found" });
    }

    /* ======================================================
       3️⃣ TOTAL
    ====================================================== */
    const totalAmount = orders.reduce((sum, o) => sum + o.totalPrice, 0);

    /* ======================================================
       4️⃣ RECEIPT PDF — COMPACT THERMAL STYLE
    ====================================================== */
    const receiptWidth = 300;
    const margin = 20;
    const contentWidth = receiptWidth - margin * 2;

    const doc = new PDFDocument({
      margin,
      size: [receiptWidth, 800], // narrow receipt width, tall enough
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=receipt.pdf");
    doc.pipe(res);

    // ── STORE NAME ──
    doc
      .fontSize(14)
      .font("Helvetica-Bold")
      .fillColor("#1E3A8A")
      .text("MELECH STORE", margin, 20, { align: "center", width: contentWidth });

    doc
      .fontSize(8)
      .font("Helvetica")
      .fillColor("#555")
      .text("Official Sales Receipt", margin, doc.y + 2, {
        align: "center",
        width: contentWidth,
      });

    // ── DIVIDER ──
    const divider = () => {
      doc
        .moveTo(margin, doc.y + 5)
        .lineTo(receiptWidth - margin, doc.y + 5)
        .dash(2, { space: 2 })
        .strokeColor("#aaa")
        .stroke()
        .undash();
    };

    divider();

    // ── ORDER INFO ──
    doc.moveDown(0.8);
    const infoY = doc.y;
    doc.fontSize(7.5).font("Helvetica").fillColor("#000");

    const infoLines = [
      ["Order ID:", receiptOrderId ? String(receiptOrderId).slice(-10).toUpperCase() : "N/A"],
      ["Date:", new Date().toLocaleString()],
      ["Customer:", customerName],
      ["Payment:", paymentMethod],
      ["Status:", paymentStatus],
    ];

    infoLines.forEach(([label, value]) => {
      const lineY = doc.y;
      doc.font("Helvetica-Bold").text(label, margin, lineY, { continued: false, width: 70 });
      doc.font("Helvetica").text(value, margin + 72, lineY, { width: contentWidth - 72 });
      doc.moveDown(0.3);
    });

    divider();

    // ── ITEMS HEADER ──
    doc.moveDown(0.5);
    const col = {
      name: margin,
      qty: margin + 100,
      price: margin + 130,
      total: margin + 185,
    };

    doc
      .fontSize(7.5)
      .font("Helvetica-Bold")
      .fillColor("#fff")
      .rect(margin, doc.y, contentWidth, 14)
      .fill("#1E3A8A")
      .stroke();

    const headerY = doc.y - 14;
    doc.fillColor("#fff");
    doc.text("Item", col.name, headerY + 3, { width: 95 });
    doc.text("Qty", col.qty, headerY + 3, { width: 30 });
    doc.text("Price", col.price, headerY + 3, { width: 55 });
    doc.text("Total", col.total, headerY + 3, { width: 55 });

    // ── ITEMS ROWS ──
    doc.fillColor("#000").font("Helvetica").fontSize(7.5);
    let y = doc.y + 4;

    orders.forEach((o, index) => {
      const name = o.product.name || "—";
      const category = o.product.categoryName ? `(${o.product.categoryName})` : "";
      const nameText = `${name} ${category}`;
      const nameHeight = doc.heightOfString(nameText, { width: 95 });
      const rowHeight = Math.max(16, nameHeight + 6);

      // alternating row background
      doc
        .rect(margin, y, contentWidth, rowHeight)
        .fill(index % 2 === 0 ? "#F3F4F6" : "#FFFFFF")
        .stroke();

      doc.fillColor("#000");
      doc.text(nameText, col.name, y + 3, { width: 95 });
      doc.text(String(o.quantity), col.qty, y + 3, { width: 30 });
      doc.text(`₦${o.price.toLocaleString()}`, col.price, y + 3, { width: 55 });
      doc.text(`₦${o.totalPrice.toLocaleString()}`, col.total, y + 3, { width: 55 });

      y += rowHeight;
    });

    // ── TOTAL ──
    y += 6;
    doc
      .moveTo(margin, y)
      .lineTo(receiptWidth - margin, y)
      .strokeColor("#000")
      .stroke();

    y += 6;
    doc
      .fontSize(9)
      .font("Helvetica-Bold")
      .fillColor("#000")
      .text("TOTAL:", col.name, y)
      .text(`₦${totalAmount.toLocaleString()}`, col.total, y, { width: 55 });

    y += 20;

    // ── PAYMENT INSTRUCTIONS (if unpaid) ──
    if (paymentStatus === "Unpaid") {
      divider();
      doc.moveDown(0.5);
      doc
        .fontSize(7.5)
        .font("Helvetica-Bold")
        .fillColor("#b91c1c")
        .text("PAYMENT INSTRUCTIONS", margin, doc.y, {
          align: "center",
          width: contentWidth,
        });

      doc.font("Helvetica").fillColor("#000").moveDown(0.3);
      [
        ["Bank:", STORE_ACCOUNT.bankName],
        ["Account Name:", STORE_ACCOUNT.accountName],
        ["Account No:", STORE_ACCOUNT.accountNumber],
      ].forEach(([label, value]) => {
        const lineY = doc.y;
        doc.font("Helvetica-Bold").text(label, margin, lineY, { width: 75 });
        doc.font("Helvetica").text(value, margin + 77, lineY, { width: contentWidth - 77 });
        doc.moveDown(0.3);
      });
    }

    // ── FOOTER ──
    divider();
    doc.moveDown(0.5);
    doc
      .fontSize(7)
      .font("Helvetica")
      .fillColor("gray")
      .text("Thank you for shopping with MELECH STORE!", margin, doc.y, {
        align: "center",
        width: contentWidth,
      });
    doc.text("No signature required — auto-generated receipt", margin, doc.y + 4, {
      align: "center",
      width: contentWidth,
    });

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
    } else {
      order.quantity -= 1;
      order.totalPrice = order.price * order.quantity;
      await order.save();
    }
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
    if (!order) {
      return sendError(res, 404, "Order not found");
    }

    const product = await ProductModel.findById(order.product._id);
    if (!product) {
      return sendError(res, 404, "Product not found");
    }

    if (order.quantity >= product.stock) {
      return sendError(res, 400, "Cannot increase quantity beyond available stock.");
    }

    order.quantity += 1;
    order.totalPrice = order.price * order.quantity;
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

export {
  addOrder,
  getOrders,
  completeOrder,
  reduceOrder,
  deleteOrderItem,
  clearUserOrders,
  increaseOrderQuantity,
  getOrderByProduct,
  updateOrder,
  generateInvoice
};