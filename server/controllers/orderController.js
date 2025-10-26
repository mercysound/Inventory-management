// server/controllers/orderController.js
import PDFDocument from "pdfkit";
import OrderModel from "../models/OrderModel.js";
import ProductModel from "../models/ProductModel.js";
import AllOrdersPlacedModel from "../models/AllOrdersPlacedModel.js";

/**
 * addOrder - add a single product to current user's cart (order)
 */
const addOrder = async (req, res) => {
  try {
    const { productId, quantity, total, price } = req.body;
    const userId = req.user._id;
    const product = await ProductModel.findById(productId);
    if (!product) return res.status(404).json({ error: "product not found in order" });

    if (quantity > product.stock) return res.status(400).json({ error: "Not enough stock" });

    const orderObj = new OrderModel({
      userOrdering: userId,
      product: productId,
      quantity,
      totalPrice: total,
      price,
    });
    await orderObj.save();
    return res.status(200).json({ success: true, message: "Order added successfully" });
  } catch (error) {
    console.error("addOrder error:", error);
    return res.status(500).json({ success: false, error: "server error in adding order" });
  }
};

/**
 * getOrders - return orders for current user (staff) or all for admin
 */
const getOrders = async (req, res) => {
  try {
    const userId = req.user._id;
    let query = {};

    if (req.user.role === "staff") {
      query = { userOrdering: userId };
    }

    const orders = await OrderModel.find(query)
      .populate({
        path: "product",
        select: "name description price categoryId",
        populate: { path: "categoryId", select: "name" },
      })
      .populate("userOrdering", "name email role")
      .sort({ orderDate: -1 });

    const sanitizedOrders = orders.map((o) => ({
      _id: o._id,
      product: o.product,
      quantity: o.quantity,
      totalPrice: o.totalPrice ?? 0,
      orderDate: o.orderDate,
      userOrdering: o.userOrdering,
      price: o.price,
      paymentMethod: o.paymentMethod,
      buyerName: o.buyerName,
      deliveryStatus: o.deliveryStatus,
    }));

    return res.status(200).json({ success: true, orders: sanitizedOrders });
  } catch (error) {
    console.error("getOrders error:", error);
    return res.status(500).json({ success: false, error: "Server error in fetching orders" });
  }
};

/**
 * completeOrder - saves payment and other summary fields to user's active Order docs
 *                and also creates AllOrdersPlaced summary document.
 */
const completeOrder = async (req, res) => {
  try {
    const { paymentMethod, buyerName, userOrdering, productList, allQuantity, deliveryStatus, totalPrice } = req.body;

    if (!paymentMethod) return res.status(400).json({ success: false, message: "Payment method required" });

    // Update all active orders for current user
    const update = {
      paymentMethod,
      buyerName,
      deliveryStatus,
    };

    const result = await OrderModel.updateMany({ userOrdering: req.user._id }, { $set: update });

    // Create a placed-order summary record
    const placed = new AllOrdersPlacedModel({
      userOrdering: userOrdering || req.user.name || req.user._id,
      buyerName: buyerName || "Unknown",
      productList: productList || [],
      allQuantity: allQuantity || 0,
      paymentMethod,
      deliveryStatus: deliveryStatus || "pending",
      totalPrice: totalPrice || 0,
    });
    await placed.save();

    return res.json({ success: true, message: "Payment method saved and order completed", modifiedCount: result.modifiedCount });
  } catch (error) {
    console.error("completeOrder error:", error);
    return res.status(500).json({ success: false, message: "Error updating orders", error: error.message });
  }
};

/**
 * generateInvoice - produce a PDF invoice for current user's active orders.
 * Accepts query params:
 *  - customerName
 *  - paymentMethod
 *
 * Requires token either in Authorization header or ?token=... (optionalAuthMiddleware)
 */
const generateInvoice = async (req, res) => {
  try {
    const customerName = req.query.customerName || "Guest Customer";
    const paymentMethod = req.query.paymentMethod || "Not Specified";

    // If user is staff, only their orders; admins see all orders.
    const query = req.user?.role === "staff" ? { userOrdering: req.user._id } : {};

    const orders = await OrderModel.find(query).populate("product");
    if (!orders || orders.length === 0) {
      return res.status(404).json({ success: false, message: "No orders found" });
    }

    const totalAmount = orders.reduce((acc, o) => acc + (o.totalPrice || o.quantity * o.price), 0);

    const doc = new PDFDocument({ margin: 40 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=invoice.pdf");
    doc.pipe(res);

    // Header
    doc.fontSize(22).fillColor("#1E3A8A").font("Helvetica-Bold").text("📦 GADGET STORE", { align: "center" });
    doc.fontSize(14).fillColor("#444").font("Helvetica").text("Official Sales Invoice", { align: "center" });
    doc.moveDown(1.2);

    // Customer info
    doc.fontSize(12).fillColor("#000").font("Helvetica")
      .text(`Customer Name: ${customerName}`)
      .moveDown(0.2)
      .text(`Invoice Date: ${new Date().toLocaleString()}`)
      .moveDown(0.2)
      .text(`Payment Method: ${paymentMethod}`);
    doc.moveDown(1);

    // Table header
    const startY = doc.y;
    doc.rect(40, startY, 520, 25).fill("#1E3A8A").stroke();
    doc.fillColor("#FFF").fontSize(12).font("Helvetica-Bold")
      .text("No", 50, startY + 8)
      .text("Product", 100, startY + 8)
      .text("Qty", 320, startY + 8)
      .text("Price (₦)", 380, startY + 8)
      .text("Total (₦)", 470, startY + 8);
    doc.fillColor("#000");
    doc.moveDown();

    // Rows
    let y = startY + 25;
    orders.forEach((order, index) => {
      const rowHeight = 24;
      const fill = index % 2 === 0 ? "#F9FAFB" : "#FFFFFF";
      doc.rect(40, y, 520, rowHeight).fill(fill).stroke();

      doc.fillColor("#000").fontSize(11).font("Helvetica");
      doc.text(index + 1, 50, y + 7);
      doc.text(order.product?.name || "N/A", 100, y + 7, { width: 200 });
      doc.text(String(order.quantity), 330, y + 7, { width: 30 });
      doc.text((order.price ?? 0).toLocaleString(), 380, y + 7, { width: 70, align: "right" });
      doc.text((order.totalPrice ?? (order.quantity * order.price)).toLocaleString(), 470, y + 7, { width: 80, align: "right" });

      y += rowHeight;
    });

    // Total
    y += 16;
    doc.moveTo(40, y).lineTo(560, y).stroke();
    y += 10;
    doc.fontSize(13).fillColor("#000").font("Helvetica-Bold")
      .text("Total Amount:", 360, y)
      .text(`₦${totalAmount.toLocaleString()}`, 460, y, { width: 100, align: "right" });
    doc.moveDown(2);

    // Footer
    doc.fontSize(10).fillColor("gray").font("Helvetica")
      .text("Thank you for shopping with Gadget Store!", 40, doc.y + 10)
      .text("Generated automatically — no signature required", 40, doc.y + 25);

    doc.end();
  } catch (error) {
    console.error("generateInvoice error:", error);
    return res.status(500).json({ success: false, message: "Error generating invoice", error: error.message });
  }
};

/**
 * reduceOrder - decrease quantity for an order (route uses /orders/reduce/:orderId)
 */
const reduceOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await OrderModel.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    if (order.quantity <= 1) {
      await OrderModel.findByIdAndDelete(orderId);
    } else {
      order.quantity -= 1;
      order.totalPrice = order.price * order.quantity;
      await order.save();
    }
    return res.json({ success: true, message: "Order reduced successfully" });
  } catch (error) {
    console.error("reduceOrder error:", error);
    return res.status(500).json({ success: false, message: "Error reducing order", error: error.message });
  }
};

/**
 * deleteOrderItem - delete item
 */
const deleteOrderItem = async (req, res) => {
  try {
    const { orderId } = req.params;
    const deleted = await OrderModel.findByIdAndDelete(orderId);
    if (!deleted) return res.status(404).json({ success: false, message: "Order not found" });
    return res.json({ success: true, message: "Order item deleted successfully" });
  } catch (error) {
    console.error("deleteOrderItem error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * clearUserOrders - remove all current user's orders
 */
const clearUserOrders = async (req, res) => {
  try {
    await OrderModel.deleteMany({ userOrdering: req.user._id });
    return res.json({ success: true, message: "Your orders cleared" });
  } catch (error) {
    console.error("clearUserOrders error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export {
  addOrder,
  getOrders,
  completeOrder,
  generateInvoice,
  reduceOrder,
  deleteOrderItem,
  clearUserOrders,
};
