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
const getPlacedOrders = async (req, res) => {
  try {
    // const userId = req.user._id;
    // let query = {};

    // if (req.user.role === "staff") {
    //   query = { userOrdering: userId };
    // }

    const orders = await AllOrdersPlacedModel.find(query)
      .populate({
        path: "product",
        select: "name description price categoryId",
        populate: { path: "categoryId", select: "name" },
      })

    const sanitizedPlacedOrders = orders.map((o) => ({
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
      productList,
      allQuantity,
      deliveryStatus,
      totalPrice,
      productDescription,
    } = req.body;

    const userId = req.user._id;

    if (!paymentMethod)
      return res
        .status(400)
        .json({ success: false, message: "Payment method required" });

    // ✅ Fetch all current user orders (to get product + quantity info)
    const userOrders = await OrderModel.find({ userOrdering: userId }).populate(
      "product"
    );

    if (!userOrders || userOrders.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No orders found for this user" });
    }

    // ✅ Reduce product stock for each order item
    for (const order of userOrders) {
      const product = order.product;
      const qty = order.quantity || 0;

      if (!product) continue;

      // Ensure product stock doesn’t go negative
      if (product.stock < qty) {
        return res.status(400).json({
          success: false,
          message: `Not enough stock for ${product.name}. Available: ${product.stock}`,
        });
      }

      product.stock -= qty;
      await product.save();
    }

    // ✅ Create record of completed orders in AllOrdersPlacedModel
    const placed = new AllOrdersPlacedModel({
      userOrdering: userId,
      buyerName: buyerName || "Unknown",
      productList: productList || [],
      productDescription: productDescription || [],
      allQuantity: allQuantity || 0,
      paymentMethod,
      deliveryStatus: deliveryStatus || "pending",
      totalPrice: totalPrice || 0,
      paymentStatus: "Paid",
    });
    await placed.save();

    // ✅ Clear user’s temporary orders (optional — if you want)
    await OrderModel.deleteMany({ userOrdering: userId });

    return res.json({
      success: true,
      message: "Order completed successfully and product stock updated.",
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
    let orders = await OrderModel.find(query).populate("product");

    // ✅ If no orders found (after completion), fetch the most recent completed order
    if (!orders || orders.length === 0) {
      const lastOrder = await AllOrdersPlacedModel.findOne()
        .sort({ createdAt: -1 })
        .lean();

      if (lastOrder) {
        orders = lastOrder.productList.map((name, index) => ({
          product: { name, description: lastOrder.productDescription[index] || "No Description" },
          quantity: lastOrder.allQuantity,
          price: lastOrder.totalPrice / lastOrder.allQuantity,
          totalPrice: lastOrder.totalPrice,
        }));

        paymentStatus = lastOrder.paymentStatus || "Paid";
      }
    }

    if (!orders || orders.length === 0) {
      return res.status(404).json({ success: false, message: "No orders found" });
    }

    // ====== COMPUTE TOTAL ======
    const totalAmount = orders.reduce(
      (acc, o) => acc + (o.totalPrice || o.quantity * o.price),
      0
    );

    paymentStatus =
      paymentStatus === "Paid" ||
      orders.some((o) => o.paymentStatus === "Paid")
        ? "Paid"
        : "Unpaid";

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

    // ===== TABLE COLUMN CONFIG =====
    const columns = {
      no: { x: 45, width: 30, align: "left" },
      product: { x: 80, width: 110, align: "left" },
      description: { x: 200, width: 130, align: "left" },
      qty: { x: 340, width: 40, align: "center" },
      price: { x: 390, width: 70, align: "right" },
      total: { x: 480, width: 80, align: "right" },
    };

    // ===== TABLE HEADER =====
    const startY = doc.y;
    doc.rect(40, startY, 520, 25).fill("#1E3A8A").stroke();
    doc.fillColor("#FFF").fontSize(12).font("Helvetica-Bold");

    doc.text("No", columns.no.x, startY + 8, { width: columns.no.width, align: columns.no.align });
    doc.text("Product", columns.product.x, startY + 8, { width: columns.product.width, align: columns.product.align });
    doc.text("Description", columns.description.x, startY + 8, { width: columns.description.width, align: columns.description.align });
    doc.text("Qty", columns.qty.x, startY + 8, { width: columns.qty.width, align: columns.qty.align });
    doc.text("Price (₦)", columns.price.x, startY + 8, { width: columns.price.width, align: columns.price.align });
    doc.text("Total (₦)", columns.total.x, startY + 8, { width: columns.total.width, align: columns.total.align });

    // ===== TABLE BODY =====
    doc.fillColor("#000");
    let y = startY + 25;

    orders.forEach((order, index) => {
      const productName = order.product?.name || "N/A";
      const description = order.product?.description || "N/A";
      const quantity = String(order.quantity || 1);
      const price = (order.price ?? 0).toLocaleString();
      const total = (
        order.totalPrice ?? order.quantity * order.price
      ).toLocaleString();

      const descHeight = doc.heightOfString(description, {
        width: columns.description.width,
      });
      const rowHeight = Math.max(26, descHeight + 10);

      const fill = index % 2 === 0 ? "#F9FAFB" : "#FFFFFF";
      doc.rect(40, y, 520, rowHeight).fill(fill).stroke();

      doc.fillColor("#000").fontSize(10).font("Helvetica");
      doc.text(index + 1, columns.no.x, y + 8, { width: columns.no.width, align: columns.no.align });
      doc.text(productName, columns.product.x, y + 8, { width: columns.product.width, align: columns.product.align });
      doc.text(description, columns.description.x, y + 8, { width: columns.description.width, align: columns.description.align });
      doc.text(quantity, columns.qty.x, y + 8, { width: columns.qty.width, align: columns.qty.align });
      doc.text(price, columns.price.x, y + 8, { width: columns.price.width, align: columns.price.align });
      doc.text(total, columns.total.x, y + 8, { width: columns.total.width, align: columns.total.align });

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
      .text("Total Amount:", 360, y)
      .text(`₦${totalAmount.toLocaleString()}`, 460, y, {
        width: 100,
        align: "right",
      });

    // ===== FOOTER =====
    doc.moveDown(2);
    doc
      .fontSize(10)
      .fillColor("gray")
      .font("Helvetica")
      .text("Thank you for shopping with Gadget Store!", 40, doc.y + 10)
      .text("Generated automatically — no signature required", 40, doc.y + 25);

    doc.end();
  } catch (error) {
    console.error("generateInvoice error:", error);
    res.status(500).json({ success: false, message: "Error generating invoice" });
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
  generateInvoice,
  reduceOrder,
  deleteOrderItem,
  clearUserOrders,
  increaseOrderQuantity
};
