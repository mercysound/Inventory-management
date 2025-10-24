import OrderModel from "../models/OrderModel.js";
import ProductModel from "../models/ProductModel.js";
import PDFDocument from "pdfkit"; // for recipt pf orders
import path from "path";
import fs from "fs";
import { createCanvas, loadImage } from "canvas";
import { Readable } from "stream";
import jsPDF from "jspdf";


const addOrder = async (req, res) =>{
 try {
    const {productId, quantity, total, price} = req.body;
    const userId = req.user._id; 
    const product = await ProductModel.findById({_id: productId});
    if (!product) {
      return res.status(404).json({error:"product not found in order"})
    }

    if (quantity > product.stock) {
      return res.status(404).json({error:"Not enough stock"})
    }
    // else{
    //   product.stock -= parseInt(quantity);
    //   await product.save(); 
    // }

    const orderObj = new OrderModel({
      userOrdering: userId, 
      product: productId,
      quantity,
      totalPrice: total,
      price
    })
    orderObj.save();
      return res.status(200).json({success: true, message: 'Order added successfully'})
 } catch (error) {
      return res.status(500).json({success: false, error:"server error in adding order"})
  
 }
}
const getOrders = async (req, res) => {
  try {
    const userId = req.user._id;
    let query = {};

    if (req.user.role === "staff") {
      query = { userOrdering: userId };
    }

    const orders = await OrderModel.find(query)
      .populate({
        path: 'product',
        select: 'name description price categoryId',
        populate: { path: 'categoryId', select: 'name' },
      })
      .populate('userOrdering', 'name email role')
      .sort({ orderDate: -1 });

    // ✅ Safety check
    const sanitizedOrders = orders.map(o => ({
      _id: o._id,
      product: o.product,
      quantity: o.quantity,
      totalPrice: o.totalPrice ?? 0, // fallback to 0
      orderDate: o.orderDate,
      userOrdering: o.userOrdering,
      price:o.price
    }));

    return res.status(200).json({ success: true, orders: sanitizedOrders });
  } catch (error) {
    console.error("Error in getOrders:", error);
    return res.status(500).json({ success: false, error: "Server error in fetching orders" });
  }
};


const getPurchaseHistory = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.orderDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const orders = await OrderModel.find(dateFilter)
      .populate({
        path: "product",
        select: "name categoryId",
        populate: { path: "categoryId", select: "name" },
      })
      .populate("userOrdering", "name email")
      .sort({ orderDate: -1 });

    // Group by date
    const grouped = orders.reduce((acc, order) => {
      const date = order.orderDate.toISOString().split("T")[0];
      if (!acc[date]) acc[date] = [];
      acc[date].push(order);
      return acc;
    }, {});

    const history = Object.entries(grouped).map(([date, orders]) => ({
      _id: date,
      totalOrders: orders.length,
      totalRevenue: orders.reduce((sum, o) => sum + o.totalPrice, 0),
      orders: orders.map((o) => ({
        _id: o._id,
        product: o.product?.name || "—",
        category: o.product?.categoryId?.name || "—",
        quantity: o.quantity,
        totalPrice: o.totalPrice,
        orderedBy: o.userOrdering?.name || "—",
      })),
    }));

    res.json({ success: true, history });
  } catch (error) {
    console.error("Error fetching purchase history:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
// 🧹 Clear all purchase history
 const clearAllHistory = async (req, res) => {
  try {
    await OrderModel.deleteMany({});
    res.json({ success: true, message: "All purchase history cleared successfully." });
  } catch (error) {
    console.error("Error clearing all history:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
// 🧹 Clear purchase history by specific date
 const clearHistoryByDate = async (req, res) => {
  try {
    const { date } = req.params;

    if (!date) {
      return res.status(400).json({ success: false, message: "Date parameter is required" });
    }

    // Convert the provided date (YYYY-MM-DD) to a date range for the entire day
    const start = new Date(date);
    const end = new Date(date);
    end.setDate(end.getDate() + 1);

    const result = await OrderModel.deleteMany({
      orderDate: { $gte: start, $lt: end },
    });

    res.json({
      success: true,
      message: `Purchase history for ${date} cleared (${result.deletedCount} record(s) removed).`,
    });
  } catch (error) {
    console.error("Error clearing history by date:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
//new
const removeOneFromOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    const userId = req.user._id;

    const order = await OrderModel.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    // ensure user can only modify their own orders (admin can be allowed via role check)
    if (req.user.role === "staff" && String(order.userOrdering) !== String(userId)) {
      return res.status(403).json({ success: false, message: "Not allowed" });
    }

    if (order.quantity > 1) {
      order.quantity = order.quantity - 1;
      // recalc totalPrice using saved price field
      order.totalPrice = order.price * order.quantity;
      await order.save();
      return res.json({ success: true, message: "Quantity decremented", order });
    } else {
      // quantity is 1 -> remove order
      await OrderModel.findByIdAndDelete(orderId);
      return res.json({ success: true, message: "Order removed" });
    }
  } catch (err) {
    console.error("removeOneFromOrder error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * DELETE /api/orders/clear
 * Delete all pending orders for current user (staff) or all orders for admin if desired.
 */
const clearUserOrders = async (req, res) => {
  try {
    if (req.user.role === "admin") {
      // If you want admin to clear all users' pending orders, keep below:
      // await OrderModel.deleteMany({});
      // res.json({ success: true, message: "All orders cleared (admin)" });

      // otherwise restrict admin to clear their own (we'll clear all for admin only if intended)
      await OrderModel.deleteMany({ userOrdering: req.user._id });
      return res.json({ success: true, message: "Your orders cleared" });
    } else {
      await OrderModel.deleteMany({ userOrdering: req.user._id });
      return res.json({ success: true, message: "Your orders cleared" });
    }
  } catch (err) {
    console.error("clearUserOrders:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * GET /api/orders/invoice?format=pdf|png
 * Generates an invoice for current user's pending orders.
 * - format=pdf (default) -> returns application/pdf
 * - format=png -> returns image/png (single image of the invoice)
 */
const generateOrdersInvoice = async (req, res) => {
  try {
    const user = req.user;
    const orders = await OrderModel.find({ userOrdering: user._id }).populate("product");

    if (!orders || orders.length === 0) {
      return res.status(404).json({ success: false, message: "No orders found for this user" });
    }

    // Create PDF
    const doc = new PDFDocument({ margin: 40 });
    let totalAmount = 0;

    // Set headers for browser
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=invoice.pdf");

    // Pipe the PDF directly to the response
    doc.pipe(res);

    // --- HEADER ---
    doc
      .fontSize(20)
      .text("📱 Gadget Store Invoice", { align: "center" })
      .moveDown(0.5);
    doc
      .fontSize(10)
      .text("123 Store Avenue, Lagos, Nigeria", { align: "center" })
      .text("Tel: +234-800-123-4567 | Email: info@gadgetstore.com", { align: "center" })
      .moveDown(1);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();

    // --- CUSTOMER INFO ---
    doc.moveDown(1);
    doc
      .fontSize(12)
      .text(`Customer Name: ${user?.name || "Guest Customer"}`)
      .text(`Payment Method: ${orders[0].paymentMethod || "Pending"}`)
      .text(`Invoice Date: ${new Date().toLocaleString()}`)
      .moveDown(1);

    // --- TABLE HEADER ---
    doc.font("Helvetica-Bold").text("No.", 50).text("Product", 100).text("Qty", 300).text("Price", 360).text("Total", 440);
    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();

    // --- TABLE BODY ---
    doc.font("Helvetica");
    orders.forEach((order, i) => {
      const itemTotal = order.quantity * order.price;
      totalAmount += itemTotal;
      doc
        .moveDown(0.3)
        .text(`${i + 1}`, 50)
        .text(`${order.product?.name || "Unknown"}`, 100)
        .text(`${order.quantity}`, 300)
        .text(`₦${order.price.toLocaleString()}`, 360)
        .text(`₦${itemTotal.toLocaleString()}`, 440);
    });

    // --- TOTAL ---
    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.fontSize(13).font("Helvetica-Bold").text(`Total Amount: ₦${totalAmount.toLocaleString()}`, 360, doc.y + 10);

    // --- FOOTER ---
    doc.moveDown(3);
    doc
      .fontSize(11)
      .font("Helvetica-Oblique")
      .text("Thank you for shopping with Gadget Store!", { align: "center" })
      .text("Visit us again soon!", { align: "center" });

    // Finalize PDF
    doc.end();
  } catch (error) {
    console.error("Invoice generation error:", error);
    return res.status(500).json({
      success: false,
      message: "Error generating invoice",
      error: error.message,
    });
  }
};

const generateInvoice = async (req, res) => {
  try {
    const { customerName } = req.params;
    const { format } = req.query;

    // find customer order
    const order = await OrderModel.findOne({ customerName }).populate("items.productId");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // create a new PDF document
    const doc = new PDFDocument({ margin: 50 });
    const filename = `Invoice_${customerName}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);

    // ---- HEADER ----
    doc
      .fontSize(20)
      .text("GADGET STORE INVOICE", { align: "center", underline: true })
      .moveDown();

    // ---- CUSTOMER INFO ----
    doc
      .fontSize(14)
      .text(`Customer Name: ${order.customerName}`)
      .text(`Payment Method: ${order.paymentMethod}`)
      .text(`Date: ${new Date(order.createdAt).toLocaleString()}`)
      .moveDown();

    // ---- ORDER ITEMS ----
    doc.fontSize(16).text("Order Summary", { underline: true }).moveDown(0.5);
    doc.fontSize(12);

    order.items.forEach((item, index) => {
      doc
        .text(
          `${index + 1}. ${item.productId.name} - ${item.quantity} × ₦${item.price} = ₦${
            item.quantity * item.price
          }`
        )
        .moveDown(0.3);
    });

    // ---- TOTAL ----
    doc.moveDown(1).fontSize(14).text(`Total: ₦${order.totalPrice}`, { align: "right" });

    doc.moveDown(2).fontSize(10).text("Thank you for shopping with us!", { align: "center" });

    doc.end();
    doc.pipe(res);
  } catch (err) {
    console.error("Error generating invoice:", err);
    res.status(500).json({ message: "Server error" });
  }
};



export {addOrder, getOrders, getPurchaseHistory, clearAllHistory, clearHistoryByDate,  removeOneFromOrder, clearUserOrders,generateOrdersInvoice, generateInvoice}