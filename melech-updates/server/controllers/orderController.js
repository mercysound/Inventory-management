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

// ─────────────────────────────────────────────────────────────────────────────
// addOrder
// ─────────────────────────────────────────────────────────────────────────────
const addOrder = async (req, res) => {
  try {
    const { productId, quantity, total, price } = req.body;
    const userId = req.user._id;

    const product = await ProductModel.findById(productId);
    if (!product) return sendError(res, 404, "Product not found in order");
    if (quantity > product.stock) return sendError(res, 400, "Not enough stock");

    const existing = await OrderModel.findOne({ userOrdering: userId, product: productId });
    const ONE_HOUR = new Date(Date.now() + 60 * 60 * 1000);

    if (existing) {
      const newQty = existing.quantity + quantity;
      if (newQty > product.stock) return sendError(res, 400, "Not enough stock available");
      existing.quantity    = newQty;
      existing.totalPrice  = newQty * (price || existing.price);
      existing.price       = price || existing.price;
      existing.cartExpiresAt = ONE_HOUR;
      await existing.save();
      return sendResponse(res, 200, existing, "Order updated instead of duplicate");
    }

    const unitPrice = price || product.price;
    const orderObj  = new OrderModel({
      userOrdering:  userId,
      product:       productId,
      quantity,
      price:         unitPrice,
      totalPrice:    total || (quantity * unitPrice),
      cartExpiresAt: ONE_HOUR,
    });
    await orderObj.save();
    return sendResponse(res, 200, orderObj, "Order added successfully");
  } catch (error) {
    console.error("addOrder error:", error);
    return sendError(res, 500, "Failed to add order");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// getOrderByProduct
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// updateOrder
// ─────────────────────────────────────────────────────────────────────────────
const updateOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { quantity, total, price } = req.body;

    const order = await OrderModel.findById(orderId).populate("product");
    if (!order) return sendError(res, 404, "Order not found");
    if (String(order.userOrdering) !== String(req.user._id)) return sendError(res, 403, "Unauthorized");

    const qty = Number(quantity);
    if (!qty || qty < 1) return sendError(res, 400, "Quantity must be at least 1");

    const product = await ProductModel.findById(order.product._id);
    if (!product) return sendError(res, 404, "Product not found");
    if (qty > product.stock) return sendError(res, 400, "Not enough stock available");

    order.quantity     = qty;
    order.totalPrice   = total || (price || order.price) * qty;
    order.price        = price || order.price;
    order.cartExpiresAt= new Date(Date.now() + 60 * 60 * 1000);
    await order.save();
    return sendResponse(res, 200, order, "Order updated successfully");
  } catch (error) {
    console.error("updateOrder error:", error);
    return sendError(res, 500, "Failed to update order");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// getOrders
// ─────────────────────────────────────────────────────────────────────────────
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
        select: "name description price image categoryId",
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
      userOrdering:     o.userOrdering,
    }));

    const meta = getPaginationMeta(total, limit, page);
    return sendResponse(res, 200, sanitizedOrders, "Orders retrieved successfully", meta);
  } catch (error) {
    console.error("getOrders error:", error);
    return sendError(res, 500, "Failed to fetch orders");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// verifyStock
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// completeOrder
// ─────────────────────────────────────────────────────────────────────────────
// Role behaviour:
//   customer  → AllOrdersPlacedModel (admin tracks + changes delivery status)
//   wholesale → AllOrdersPlacedModel (same as customer — admin handles pickup)
//   staff     → CompletedOrderHistoryModel (walk-in sale, done immediately)
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// generateInvoice
// ─────────────────────────────────────────────────────────────────────────────
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

      orders = activeOrders.map((o) => ({
        product: {
          name:         o.product?.name,
          desc:         o.product?.description || "",
          categoryName: o.product?.categoryId?.name,
        },
        quantity:   o.quantity,
        price:      o.price,
        totalPrice: o.quantity * o.price,
      }));
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
        order = await HistoryModel.findOne(query).populate({
          path:     "productList.productId",
          select:   "name description categoryId",
          populate: { path: "categoryId", select: "name" },
        });
      } else {
        order = await HistoryModel.findOne(query)
          .populate({
            path:     "productList.productId",
            select:   "name description categoryId",
            populate: { path: "categoryId", select: "name" },
          })
          .sort({ createdAt: -1 });
      }

      if (!order) return res.status(404).json({ message: "Order not found" });

      receiptOrderId = order._id;
      orders = order.productList.map((i) => ({
        product: {
          name:         i.productId?.name,
          desc:         i.productId?.description || "",
          categoryName: i.productId?.categoryId?.name,
        },
        quantity:   i.quantity,
        price:      i.price,
        totalPrice: i.totalPrice,
      }));
    }

    if (!orders.length) return res.status(404).json({ message: "No orders found" });

    const totalAmount   = orders.reduce((sum, o) => sum + o.totalPrice, 0);
    const receiptWidth  = 300;
    const margin        = 20;
    const contentWidth  = receiptWidth - margin * 2;

    const doc = new PDFDocument({ margin, size: [receiptWidth, 800] });
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

    const infoLines = [
      ["Order ID:",   receiptOrderId ? String(receiptOrderId).slice(-10).toUpperCase() : "N/A"],
      ["Date:",       new Date().toLocaleString()],
      ["Customer:",   customerName],
      ["Payment:",    paymentMethod],
      ["Status:",     paymentStatus],
    ];

    infoLines.forEach(([label, value]) => {
      const lineY = doc.y;
      doc.font("Helvetica-Bold").text(label, margin, lineY, { continued: false, width: 70 });
      doc.font("Helvetica").text(value, margin + 72, lineY, { width: contentWidth - 72 });
      doc.moveDown(0.3);
    });

    divider();
    doc.moveDown(0.5);

    const col = { num: margin, name: margin + 14, qty: margin + 100, price: margin + 128, total: margin + 183 };

    doc.fontSize(7.5).font("Helvetica-Bold").fillColor("#fff")
      .rect(margin, doc.y, contentWidth, 14).fill("#1E3A8A").stroke();

    const headerY = doc.y - 14;
    doc.fillColor("#fff");
    doc.text("#",     col.num,   headerY + 3, { width: 12 });
    doc.text("Item",  col.name,  headerY + 3, { width: 82 });
    doc.text("Qty",   col.qty,   headerY + 3, { width: 28 });
    doc.text("Price", col.price, headerY + 3, { width: 52 });
    doc.text("Total", col.total, headerY + 3, { width: 52 });

    doc.fillColor("#000").font("Helvetica").fontSize(7.5);
    let y = doc.y + 4;

    orders.forEach((o, index) => {
      const name       = o.product.name || "—";
      const category   = o.product.categoryName ? `[${o.product.categoryName}]` : "";
      const rawDesc    = o.product.desc || "";
      const shortDesc  = rawDesc.length > 40 ? rawDesc.slice(0, 40) + "…" : rawDesc;
      const nameText   = `${name} ${category}`.trim();
      const nameHeight = doc.heightOfString(nameText, { width: 82 });
      const descHeight = shortDesc ? doc.heightOfString(shortDesc, { width: 82 }) : 0;
      const rowHeight  = Math.max(20, nameHeight + descHeight + 8);

      doc.rect(margin, y, contentWidth, rowHeight)
        .fill(index % 2 === 0 ? "#F3F4F6" : "#FFFFFF").stroke();

      doc.fillColor("#000");
      doc.font("Helvetica-Bold").fontSize(7).text(String(index + 1), col.num, y + 3, { width: 12 });
      doc.font("Helvetica-Bold").fontSize(7.5).text(nameText, col.name, y + 3, { width: 82 });

      if (shortDesc) {
        doc.font("Helvetica").fontSize(6.5).fillColor("#555")
          .text(shortDesc, col.name, y + 3 + nameHeight, { width: 82 });
      }

      const midY = y + rowHeight / 2 - 4;
      doc.fillColor("#000").font("Helvetica").fontSize(7.5);
      doc.text(String(o.quantity), col.qty, midY, { width: 28 });
      doc.text(`₦${o.price.toLocaleString()}`,      col.price, midY, { width: 52 });
      doc.text(`₦${o.totalPrice.toLocaleString()}`, col.total, midY, { width: 52 });

      y += rowHeight;
    });

    y += 6;
    doc.moveTo(margin, y).lineTo(receiptWidth - margin, y).strokeColor("#000").stroke();
    y += 6;
    doc.fontSize(9).font("Helvetica-Bold").fillColor("#000")
      .text(`TOTAL (${orders.length} item${orders.length > 1 ? "s" : ""}):`, col.num, y, { width: 155 })
      .text(`₦${totalAmount.toLocaleString()}`, col.total, y, { width: 52 });
    y += 20;

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

// ─────────────────────────────────────────────────────────────────────────────
// reduceOrder
// ─────────────────────────────────────────────────────────────────────────────
const reduceOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await OrderModel.findById(orderId);
    if (!order) return sendError(res, 404, "Order not found");

    if (order.quantity <= 1) {
      await OrderModel.findByIdAndDelete(orderId);
    } else {
      order.quantity     -= 1;
      order.totalPrice    = order.price * order.quantity;
      order.cartExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await order.save();
    }
    return sendResponse(res, 200, order, "Order reduced successfully");
  } catch (error) {
    console.error("reduceOrder error:", error);
    return sendError(res, 500, "Error reducing order");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// increaseOrderQuantity
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// deleteOrderItem
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// clearUserOrders
// ─────────────────────────────────────────────────────────────────────────────
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
};
