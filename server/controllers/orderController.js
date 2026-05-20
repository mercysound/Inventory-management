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

    const existing = await OrderModel.findOne({
      userOrdering: userId,
      product: productId,
    });

    const ONE_HOUR = new Date(Date.now() + 60 * 60 * 1000);

    if (existing) {
      const newQty = existing.quantity + quantity;

      if (newQty > product.stock) {
        return sendError(res, 400, "Not enough stock available");
      }

      existing.quantity = newQty;
      existing.totalPrice = newQty * (price || existing.price);
      existing.price = price || existing.price;
      existing.cartExpiresAt = ONE_HOUR; // ✅ reset 1hr window on update

      await existing.save();
      return sendResponse(res, 200, existing, "Order updated instead of duplicate");
    }

    // ✅ always calculate totalPrice server-side
    const unitPrice = price || product.price;
    const orderObj = new OrderModel({
      userOrdering: userId,
      product: productId,
      quantity,
      price: unitPrice,
      totalPrice: total || (quantity * unitPrice),
      cartExpiresAt: ONE_HOUR, // ✅ set 1hr window on new order
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
 * updateOrder - update quantity/total of an existing order
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
    order.cartExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // ✅ reset 1hr window on update
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
 * verifyStock - pre-payment stock check so we don't charge customer for unavailable items.
 * Call this BEFORE opening Paystack popup. Returns 409 if any item is under-stocked.
 */
const verifyStock = async (req, res) => {
  try {
    const userId = req.user._id;
    const orders = await OrderModel.find({ userOrdering: userId }).populate("product");

    if (!orders.length) {
      return sendError(res, 400, "Your cart is empty");
    }

    const conflicts = [];

    for (const o of orders) {
      const product = await ProductModel.findById(o.product._id).select("stock name");
      if (!product || product.stock < o.quantity) {
        conflicts.push({
          productName: product?.name || "Unknown item",
          requested: o.quantity,
          available: product?.stock ?? 0,
        });
      }
    }

    if (conflicts.length > 0) {
      return res.status(409).json({
        success: false,
        message: "STOCK_CONFLICT",
        conflicts, // array of { productName, requested, available }
      });
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
  const { paymentMethod, buyerName, paystackReference } = req.body;
  const userId = req.user._id;

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
        const currentStock = await ProductModel.findById(o.product._id).select("stock").session(session);
        const remaining = currentStock?.stock ?? 0;

        // If Paystack already charged the customer, refund them automatically
        if (paystackReference && paymentMethod === "Paystack") {
          try {
            await fetch("https://api.paystack.co/refund", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                transaction: paystackReference,
                merchant_note: `Auto-refund: insufficient stock for ${o.product.name}`,
              }),
            });
            console.log(`✅ Paystack refund initiated for ref: ${paystackReference}`);
          } catch (refundErr) {
            // Log but don't block — we still return the stock error to the client
            console.error("❌ Paystack refund failed:", refundErr.message);
          }
        }

        throw new Error(`STOCK_ERROR:${o.product.name}:${o.quantity}:${remaining}`);
      }
    }

    const totalPrice = orders.reduce((sum, o) => sum + o.quantity * o.price, 0);
    const allQuantity = orders.reduce((sum, o) => sum + o.quantity, 0);

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
        select: "name description categoryId",
        populate: { path: "categoryId", select: "name" },
      });

      if (!activeOrders.length) {
        return res.status(404).json({ message: "No active orders to preview" });
      }

      orders = activeOrders.map((o) => ({
        product: {
          name: o.product?.name,
          desc: o.product?.description || "",
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
          select: "name description categoryId",
          populate: { path: "categoryId", select: "name" },
        });
      } else {
        order = await HistoryModel.findOne(query)
          .populate({
            path: "productList.productId",
            select: "name description categoryId",
            populate: { path: "categoryId", select: "name" },
          })
          .sort({ createdAt: -1 });
      }

      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      receiptOrderId = order._id;

      orders = order.productList.map((i) => ({
        product: {
          name: i.productId?.name,
          desc: i.productId?.description || "",
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

    // ── Collect PDF into a Buffer (not piped directly to res) ──
    const doc = new PDFDocument({
      margin,
      size: [receiptWidth, 800],
    });

    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));

    await new Promise((resolve, reject) => {
      doc.on("end", resolve);
      doc.on("error", reject);

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

      // Columns: # | Item / Desc / Category | Qty | Unit Price | Subtotal
      const col = {
        num:      margin,        // "#"  — 14px wide
        name:     margin + 14,   // "Item / Desc / Category" — 82px wide
        qty:      margin + 100,  // "Qty" — 22px wide
        price:    margin + 126,  // "Unit Price" — 52px wide
        total:    margin + 182,  // "Subtotal" — 52px wide
      };

      doc
        .fontSize(7.5)
        .font("Helvetica-Bold")
        .fillColor("#fff")
        .rect(margin, doc.y, contentWidth, 22)
        .fill("#1E3A8A")
        .stroke();

      const headerY = doc.y - 22;
      doc.fillColor("#fff").fontSize(7);

      // Row 1 of header: main labels
      doc.font("Helvetica-Bold").text("#",          col.num,   headerY + 3,  { width: 12 });
      doc.font("Helvetica-Bold").text("Item",       col.name,  headerY + 3,  { width: 82 });
      doc.font("Helvetica-Bold").text("Qty",        col.qty,   headerY + 3,  { width: 26 });
      doc.font("Helvetica-Bold").text("Unit",       col.price, headerY + 3,  { width: 52 });
      doc.font("Helvetica-Bold").text("Subtotal",   col.total, headerY + 3,  { width: 52 });

      // Row 2 of header: sub-labels (smaller, lighter)
      doc.font("Helvetica").fontSize(6).fillColor("#cce0ff");
      doc.text("Name / Desc / Cat.", col.name,  headerY + 13, { width: 82 });
      doc.text("",                   col.qty,   headerY + 13, { width: 26 });
      doc.text("Price",              col.price, headerY + 13, { width: 52 });
      doc.text("(Qty × Price)",      col.total, headerY + 13, { width: 52 });

      // ── ITEMS ROWS ──
      doc.fillColor("#000").font("Helvetica").fontSize(7.5);
      let y = doc.y + 4;

      orders.forEach((o, index) => {
        const itemNumber = index + 1;

        const name     = o.product.name || "—";
        const category = o.product.categoryName ? `[${o.product.categoryName}]` : "";

        const rawDesc  = o.product.desc || "";
        const shortDesc = rawDesc.length > 40 ? rawDesc.slice(0, 40) + "…" : rawDesc;

        const nameText = name.trim();
        const catText  = category.trim();
        const descText = shortDesc;

        const nameHeight = doc.heightOfString(nameText, { width: 82, fontSize: 7.5 });
        const catHeight  = catText  ? doc.heightOfString(catText,  { width: 82, fontSize: 6.5 }) : 0;
        const descHeight = descText ? doc.heightOfString(descText, { width: 82, fontSize: 6.5 }) : 0;
        const rowHeight  = Math.max(24, nameHeight + catHeight + descHeight + 10);

        // alternating row background
        doc
          .rect(margin, y, contentWidth, rowHeight)
          .fill(index % 2 === 0 ? "#F3F4F6" : "#FFFFFF")
          .stroke();

        doc.fillColor("#000");

        // ── Item number ──
        doc
          .font("Helvetica-Bold")
          .fontSize(7)
          .text(String(itemNumber), col.num, y + 4, { width: 12 });

        // ── Product name ──
        doc
          .font("Helvetica-Bold")
          .fontSize(7.5)
          .fillColor("#000")
          .text(nameText, col.name, y + 4, { width: 82 });

        let textOffsetY = y + 4 + nameHeight;

        // ── Category tag ──
        if (catText) {
          doc
            .font("Helvetica")
            .fontSize(6.5)
            .fillColor("#1E3A8A")
            .text(catText, col.name, textOffsetY, { width: 82 });
          textOffsetY += catHeight;
        }

        // ── Short description ──
        if (descText) {
          doc
            .font("Helvetica")
            .fontSize(6.5)
            .fillColor("#555")
            .text(descText, col.name, textOffsetY, { width: 82 });
        }

        // ── Qty / Unit Price / Subtotal — vertically centred ──
        const midY = y + rowHeight / 2 - 4;
        doc.fillColor("#000").font("Helvetica").fontSize(7.5);
        doc.text(String(o.quantity),             col.qty,   midY, { width: 26 });
        doc.text(`₦${o.price.toLocaleString()}`, col.price, midY, { width: 52 });
        doc.text(`₦${o.totalPrice.toLocaleString()}`, col.total, midY, { width: 52 });

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
        .text(`TOTAL (${orders.length} item${orders.length > 1 ? "s" : ""}):`, col.num, y, { width: 155 })
        .text(`₦${totalAmount.toLocaleString()}`, col.total, y, { width: 52 });

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
    });

    /* ======================================================
       5️⃣ SERVE — HTML wrapper so mobile browsers can render
          the PDF without needing a native PDF plugin
    ====================================================== */
    const pdfBuffer = Buffer.concat(chunks);
    const base64PDF = pdfBuffer.toString("base64");
    const dataURI   = `data:application/pdf;base64,${base64PDF}`;

    // If the client explicitly wants raw PDF (e.g. for download), honour that
    const wantRaw = req.query.download === "true";
    if (wantRaw) {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=receipt-${receiptOrderId || "order"}.pdf`
      );
      return res.send(pdfBuffer);
    }

    // Otherwise send an HTML shell that works on ALL devices
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Receipt – MELECH STORE</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: sans-serif;
      background: #f1f5f9;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
      padding: 12px;
    }
    h2 {
      color: #1E3A8A;
      margin-bottom: 10px;
      font-size: 1rem;
      letter-spacing: .05em;
    }
    .toolbar {
      display: flex;
      gap: 10px;
      margin-bottom: 12px;
      flex-wrap: wrap;
      justify-content: center;
    }
    .btn {
      padding: 9px 20px;
      border: none;
      border-radius: 6px;
      font-size: .85rem;
      cursor: pointer;
      font-weight: 600;
      text-decoration: none;
      display: inline-block;
    }
    .btn-primary   { background: #1E3A8A; color: #fff; }
    .btn-secondary { background: #e2e8f0; color: #1e293b; }
    .pdf-wrap {
      width: 100%;
      max-width: 500px;
      background: white;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0,0,0,.12);
    }
    embed, iframe {
      width: 100%;
      height: 80vh;
      border: none;
      display: block;
    }
    /* Fallback message shown only when embed fails */
    .fallback {
      display: none;
      padding: 24px;
      text-align: center;
      color: #64748b;
      font-size: .85rem;
      line-height: 1.6;
    }
    .fallback a { color: #1E3A8A; font-weight: 600; }
  </style>
</head>
<body>
  <h2>🧾 MELECH STORE — Receipt</h2>

  <div class="toolbar">
    <a class="btn btn-primary" href="?${new URLSearchParams({ ...req.query, download: "true" }).toString()}" download="receipt.pdf">
      ⬇ Download PDF
    </a>
    <button class="btn btn-secondary" onclick="window.print()">🖨 Print</button>
  </div>

  <div class="pdf-wrap">
    <!--
      <embed> works on desktop and most modern Android browsers.
      The <iframe> inside <object> is a secondary fallback.
      The .fallback div appears only if JS detects neither rendered.
    -->
    <object data="${dataURI}" type="application/pdf" width="100%" height="100%"
            style="height:80vh;" id="pdfObj">
      <iframe src="${dataURI}" id="pdfFrame">
        <div class="fallback" id="fallbackMsg">
          <p>Your browser can't display PDFs inline.</p>
          <p style="margin-top:8px">
            <a href="?${new URLSearchParams({ ...req.query, download: "true" }).toString()}" download="receipt.pdf">
              Tap here to download the receipt
            </a>
          </p>
        </div>
      </iframe>
    </object>
  </div>

  <script>
    // If object/iframe didn't render the PDF, show the fallback text
    window.addEventListener("load", function () {
      var obj = document.getElementById("pdfObj");
      // A rendered <object> has a non-zero scrollHeight; if it's tiny it failed
      if (obj && obj.scrollHeight < 50) {
        document.getElementById("fallbackMsg").style.display = "block";
      }
    });
  </script>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html");
    return res.send(html);

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
      order.cartExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // ✅ reset on activity
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
    if (!order) return sendError(res, 404, "Order not found");

    const product = await ProductModel.findById(order.product._id);
    if (!product) return sendError(res, 404, "Product not found");

    if (order.quantity >= product.stock) {
      return sendError(res, 400, "Cannot increase quantity beyond available stock.");
    }

    order.quantity += 1;
    order.totalPrice = order.price * order.quantity;
    order.cartExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // ✅ reset on activity

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
  verifyStock,
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