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

    if (!order) {
      return res.status(200).json({ success: true, order: null });
    }

    return res.status(200).json({ success: true, order });
  } catch (error) {
    console.error("getOrderByProduct error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
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
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Make sure current user owns this order
    if (String(order.userOrdering) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    // Validate quantity
    const qty = Number(quantity);
    if (!qty || qty < 1) {
      return res.status(400).json({ success: false, message: "Quantity must be at least 1" });
    }

    // Re-check product stock
    const product = await ProductModel.findById(order.product._id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    if (qty > product.stock) {
      return res.status(400).json({ success: false, message: "Not enough stock available" });
    }

    order.quantity = qty;
    // If total provided use it; otherwise compute from price * qty
    order.totalPrice = total || (price || order.price) * qty;
    // ensure price is set correctly on order
    order.price = price || order.price;
    await order.save();

    return res.status(200).json({ success: true, message: "Order updated", updatedOrder: order });
  } catch (error) {
    console.error("updateOrder error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
/**
 * getOrders - return orders for current user (staff) or all for admin
 */
const getOrders = async (req, res) => {
  try {
    const userId = req.user._id;
    let query = {};

    // 🧠 Determine what to fetch based on user role
    if (req.user.role === "staff" || req.user.role === "customer") {
      // Both staff and customers should only see their own orders
      query = { userOrdering: userId };
    } else if (req.user.role === "admin") {
      // Admin sees all orders — leave query empty
      query = {};
    }

    const orders = await OrderModel.find(query)
      .populate({
        path: "product",
        select: "name description price categoryId",
        populate: { path: "categoryId", select: "name" },
      });

    // 🧹 Clean up data before sending it to frontend
    const sanitizedOrders = orders.map((o) => ({
      _id: o._id,
      product: o.product,
      quantity: o.quantity,
      totalPrice: o.totalPrice ?? 0,
      orderDate: o.orderDate,
      price: o.price,
      userOrdering: o.userOrdering,
    }));

    return res.status(200).json({ success: true, orders: sanitizedOrders });
  } catch (error) {
    console.error("getOrders error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Server error in fetching orders" });
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
    let paymentStatus = "Unpaid";

    // STEP 1: Try to get user's active orders
    const query = req.user ? { userOrdering: req.user._id } : {};
    let orders = await OrderModel.find(query).populate({
      path: "product",
      select: "name description price categoryId",
      populate: { path: "categoryId", select: "name" },
    });

    // STEP 2: If no active orders, use last completed order
    if (!orders || orders.length === 0) {
      const lastOrder = await AllOrdersPlacedModel.findOne(
        req.user ? { userOrdering: req.user._id } : {}
      )
        .populate({
          path: "productList.productId",
          select: "name description price categoryId",
          populate: { path: "categoryId", select: "name" },
        })
        .sort({ createdAt: -1 })
        .lean();

      if (lastOrder) {
        orders = lastOrder.productList.map((item) => ({
          product: {
            name: item.productId?.name || "Unknown",
            description: item.productId?.description || "No description",
            categoryName: item.productId?.categoryId?.name || "N/A",
          },
          quantity: item.quantity,
          price: item.price,
          totalPrice: item.totalPrice,
        }));
        paymentStatus = "Paid";
      }
    } else {
      orders = orders.map((o) => ({
        product: {
          name: o.product?.name,
          description: o.product?.description,
          categoryName: o.product?.categoryId?.name || "N/A",
        },
        quantity: o.quantity,
        price: o.price,
        totalPrice: o.totalPrice,
      }));
    }

    if (!orders || orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No orders found to generate invoice",
      });
    }

    // STEP 3: Calculate total
    const totalAmount = orders.reduce(
      (sum, o) => sum + (o.totalPrice || o.price * o.quantity),
      0
    );

    // STEP 4: Create PDF
    const doc = new PDFDocument({ margin: 40 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=invoice.pdf");
    doc.pipe(res);

    // Header
    doc.fontSize(20).fillColor("#1E3A8A").text("MELECH STORE", { align: "center" });
    doc.fontSize(12).fillColor("#000").text("Sales Invoice", { align: "center" });
    doc.moveDown(1);

    // Customer Info
    doc.fontSize(11).fillColor("#000").text(`Customer: ${customerName}`);
    doc.text(`Payment Method: ${paymentMethod}`);
    doc.text(`Payment Status: ${paymentStatus}`);
    doc.text(`Date: ${new Date().toLocaleString()}`);
    doc.moveDown(1);

    // Column layout
    const cols = {
      product: 45,
      category: 160,
      description: 260,
      qty: 390,
      price: 430,
      total: 500,
    };

    // Table Header
    const startY = doc.y;
    doc.fontSize(11).fillColor("#FFF").rect(40, startY, 520, 20).fill("#1E3A8A").stroke();
    doc.fillColor("#FFF").font("Helvetica-Bold");
    doc.text("Product", cols.product, startY + 5);
    doc.text("Category", cols.category, startY + 5);
    doc.text("Description", cols.description, startY + 5);
    doc.text("Qty", cols.qty, startY + 5);
    doc.text("Price", cols.price, startY + 5);
    doc.text("Total", cols.total, startY + 5);

    // Table Rows
    doc.fillColor("#000").font("Helvetica");
    let y = startY + 25;

    for (const [index, o] of orders.entries()) {
      const desc = o.product.description || "—";

      // Dynamically compute height of description
      const descHeight = doc.heightOfString(desc, { width: 120 });
      const rowHeight = Math.max(20, descHeight + 8);

      // Alternate background for rows
      if (index % 2 === 0) {
        doc.rect(40, y, 520, rowHeight).fill("#F9FAFB").stroke();
      } else {
        doc.rect(40, y, 520, rowHeight).fill("#FFFFFF").stroke();
      }

      doc.fillColor("#000");
      doc.text(o.product.name, cols.product, y + 5, { width: 110 });
      doc.text(o.product.categoryName, cols.category, y + 5, { width: 100 });
      doc.text(desc, cols.description, y + 5, { width: 120 });
      doc.text(String(o.quantity), cols.qty, y + 5);
      doc.text(`₦${o.price.toLocaleString()}`, cols.price, y + 5);
      doc.text(`₦${o.totalPrice.toLocaleString()}`, cols.total, y + 5);

      y += rowHeight;
    }

    // Total
    y += 10;
    doc.moveTo(40, y).lineTo(560, y).stroke();
    y += 10;
    doc.font("Helvetica-Bold");
    doc.text("Grand Total:", 400, y);
    doc.text(`₦${totalAmount.toLocaleString()}`, 500, y);

    // Footer
    doc.moveDown(2);
    doc.fontSize(10).fillColor("gray").font("Helvetica");
    doc.text("Thank you for shopping with MELECH STORE!", 40, doc.y + 10);
    doc.text("Generated automatically — no signature required", 40, doc.y + 25);

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
  reduceOrder,
  deleteOrderItem,
  clearUserOrders,
  increaseOrderQuantity,
  getOrderByProduct,
  updateOrder,
  generateInvoice
};
