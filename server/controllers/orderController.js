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
      // paymentStatus: "Unpaid", // Default state
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

    const sanitizedOrders = orders.map((o) => ({
      _id: o._id,
      product: o.product,
      quantity: o.quantity,
      totalPrice: o.totalPrice ?? 0,
      orderDate: o.orderDate,
      price: o.price,
    }));

    return res.status(200).json({ success: true, orders: sanitizedOrders });
  } catch (error) {
    console.error("getOrders error:", error);
    return res.status(500).json({ success: false, error: "Server error in fetching orders" });
  }
};

/**
 * completeOrder - saves payment and summary, marks paymentStatus as Paid
 */
const completeOrder = async (req, res) => {
  try {
    const {
      paymentMethod,
      buyerName,
      deliveryStatus,
      totalPrice,
    } = req.body;

    const userId = req.user._id;

    if (!paymentMethod) {
      return res
        .status(400)
        .json({ success: false, message: "Payment method required" });
    }

    // ✅ Fetch all current orders of this user
    const userOrders = await OrderModel.find({ userOrdering: userId })
      .populate({
        path: "product",
        populate: { path: "categoryId", select: "name" },
      });

    if (!userOrders || userOrders.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No orders found for this user" });
    }

    // ✅ Reduce stock safely
    for (const order of userOrders) {
      const product = order.product;
      const qty = order.quantity || 0;
      if (!product) continue;

      if (product.stock < qty) {
        return res.status(400).json({
          success: false,
          message: `Not enough stock for ${product.name}. Available: ${product.stock}`,
        });
      }

      product.stock -= qty;
      await product.save();
    }

    // ✅ Compute totals
    const allQuantity = userOrders.reduce((sum, o) => sum + (o.quantity || 0), 0);
    const totalOrderPrice = totalPrice || userOrders.reduce(
      (sum, o) => sum + (o.totalPrice ?? o.quantity * o.price),
      0
    );

    // ✅ Structure the productList exactly like schema
    const productList = userOrders.map((order) => ({
      productId: order.product?._id,
      quantity: order.quantity,
      price: order.price,
      totalPrice: order.totalPrice,
    }));

    // ✅ Save to AllOrdersPlacedModel
    const placed = new AllOrdersPlacedModel({
      userOrdering: userId,
      buyerName: buyerName || "Unknown",
      paymentMethod,
      deliveryStatus: deliveryStatus || "Pending",
      totalPrice: totalOrderPrice,
      allQuantity,
      productList,
    });

    await placed.save();

    // ✅ Clear user's temp orders
    await OrderModel.deleteMany({ userOrdering: userId });

    return res.json({
      success: true,
      message: "Order completed successfully and stock updated.",
      placed,
    });
  } catch (error) {
    console.error("completeOrder error:", error);
    return res.status(500).json({
      success: false,
      message: "Error completing order",
      error: error.message,
    });
  }
};


/**
 * generateInvoice - produce a PDF invoice for current user's active orders.
 */

const generateInvoice = async (req, res) => {
  try {
    const customerName = req.query.customerName || "Guest Customer";
    const paymentMethod = req.query.paymentMethod || "Not Specified";
    let paymentStatus = req.query.paymentStatus || "Unpaid";

    // ✅ Try to fetch user's live orders first
    const query = req.user ? { userOrdering: req.user._id } : {};
    let orders = await OrderModel.find(query).populate({
      path: "product",
      populate: { path: "categoryId", select: "name" },
    });

    // ✅ If no live orders, fetch most recent completed order
    if (!orders || orders.length === 0) {
      const lastOrder = await AllOrdersPlacedModel.findOne()
        .populate({
          path: "productList.productId",
          populate: { path: "categoryId", select: "name" },
        })
        .sort({ createdAt: -1 })
        .lean();

      if (lastOrder) {
        // ✅ Convert productList structure into the same shape your PDF expects
        orders = lastOrder.productList.map((item) => ({
          product: {
            name: item.productId?.name || "Unknown Product",
            description: item.productId?.description || "No Description",
            category: item.productId?.categoryId?.name || "Uncategorized",
          },
          quantity: item.quantity,
          price: item.price,
          totalPrice: item.totalPrice,
        }));

        paymentStatus = "Paid";
      }
    }

    if (!orders || orders.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No orders found to generate invoice" });
    }

    // ====== COMPUTE TOTAL ======
    const totalAmount = orders.reduce(
      (acc, o) => acc + (o.totalPrice || o.quantity * o.price),
      0
    );

    // ====== PDF GENERATION ======
    const doc = new PDFDocument({ margin: 40 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=invoice.pdf");
    doc.pipe(res);

    // ===== HEADER =====
    doc
      .fontSize(22)
      .fillColor("#1E3A8A")
      .font("Helvetica-Bold")
      .text("MELECH STORE", { align: "center" });
    doc
      .fontSize(14)
      .fillColor("#444")
      .font("Helvetica")
      .text("Official Sales Invoice", { align: "center" });
    doc.moveDown(1.2);

    // ===== CUSTOMER INFO =====
    doc
      .fontSize(12)
      .fillColor("#000")
      .font("Helvetica")
      .text(`Customer Name: ${customerName}`)
      .moveDown(0.2)
      .text(`Invoice Date: ${new Date().toLocaleString()}`)
      .moveDown(0.2)
      .text(`Payment Method: ${paymentMethod}`)
      .moveDown(0.2)
      .text(`Payment Status: ${paymentStatus}`);
    doc.moveDown(1);

    // ===== TABLE HEADERS =====
    const columns = {
      no: { x: 40, width: 30 },
      product: { x: 80, width: 110 },
      category: { x: 190, width: 100 },
      description: { x: 290, width: 120 },
      qty: { x: 410, width: 40 },
      price: { x: 460, width: 70 },
      total: { x: 530, width: 70 },
    };

    const startY = doc.y;
    doc.rect(40, startY, 560, 25).fill("#1E3A8A").stroke();
    doc.fillColor("#FFF").fontSize(11).font("Helvetica-Bold");
    doc.text("No", columns.no.x, startY + 8);
    doc.text("Product", columns.product.x, startY + 8);
    doc.text("Category", columns.category.x, startY + 8);
    doc.text("Description", columns.description.x, startY + 8);
    doc.text("Qty", columns.qty.x, startY + 8);
    doc.text("Price (₦)", columns.price.x, startY + 8);
    doc.text("Total (₦)", columns.total.x, startY + 8);

    // ===== TABLE BODY =====
    doc.fillColor("#000");
    let y = startY + 25;

    orders.forEach((order, index) => {
      const name = order.product?.name || "N/A";
      const category = order.product?.category || "N/A";
      const description = order.product?.description || "N/A";
      const quantity = String(order.quantity || 1);
      const price = (order.price ?? 0).toLocaleString();
      const total = (order.totalPrice ?? order.quantity * order.price).toLocaleString();

      const descHeight = doc.heightOfString(description, { width: 120 });
      const rowHeight = Math.max(25, descHeight + 10);
      const fill = index % 2 === 0 ? "#F9FAFB" : "#FFFFFF";

      doc.rect(40, y, 560, rowHeight).fill(fill).stroke();

      doc.fillColor("#000").fontSize(10).font("Helvetica");
      doc.text(index + 1, columns.no.x, y + 8);
      doc.text(name, columns.product.x, y + 8, { width: columns.product.width });
      doc.text(category, columns.category.x, y + 8, { width: columns.category.width });
      doc.text(description, columns.description.x, y + 8, { width: columns.description.width });
      doc.text(quantity, columns.qty.x, y + 8, { width: columns.qty.width });
      doc.text(price, columns.price.x, y + 8, { width: columns.price.width, align: "right" });
      doc.text(total, columns.total.x, y + 8, { width: columns.total.width, align: "right" });

      y += rowHeight;
    });

    // ===== TOTAL =====
    y += 16;
    doc.moveTo(40, y).lineTo(560, y).stroke();
    y += 10;
    doc
      .fontSize(13)
      .fillColor("#000")
      .font("Helvetica-Bold")
      .text("Total Amount:", 380, y)
      .text(`₦${totalAmount.toLocaleString()}`, 460, y, {
        width: 140,
        align: "right",
      });

    // ===== FOOTER =====
    doc.moveDown(2);
    doc
      .fontSize(10)
      .fillColor("gray")
      .font("Helvetica")
      .text("Thank you for shopping with MELECH STORE!", 40, doc.y + 10)
      .text("Generated automatically — no signature required", 40, doc.y + 25);

    doc.end();
  } catch (error) {
    console.error("generateInvoice error:", error);
    res.status(500).json({ success: false, message: "Error generating invoice" });
  }
};

export default generateInvoice;



/**
 * reduceOrder - decrease quantity
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
const increaseOrderQuantity = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await OrderModel.findById(orderId).populate("product");
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const product = await ProductModel.findById(order.product._id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    // Prevent going beyond available stock
    if (order.quantity >= product.stock) {
      return res.status(400).json({
        success: false,
        message: "Cannot increase quantity beyond available stock.",
      });
    }

    // Update order
    order.quantity += 1;
    order.totalPrice = order.price * order.quantity;
    await order.save();

    res.json({
      success: true,
      message: "Quantity increased successfully",
      updatedOrder: order,
    });
  } catch (error) {
    console.error("Error increasing order quantity:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
/**
 * deleteOrderItem - delete single item
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
  increaseOrderQuantity
};
