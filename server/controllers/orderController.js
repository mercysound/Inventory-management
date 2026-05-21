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
       4️⃣ DETECT: raw PDF download vs mobile vs desktop
    ====================================================== */
    const wantRaw = req.query.download === "true";

    // Simple UA sniff — covers Android, iPhone, iPad
    const ua = req.headers["user-agent"] || "";
    const isMobile = /android|iphone|ipad|ipod|mobile/i.test(ua);

    /* ======================================================
       5️⃣ BUILD PDF BUFFER (always — needed for download link)
    ====================================================== */
    const receiptWidth = 300;
    const margin = 20;
    const contentWidth = receiptWidth - margin * 2;

    const doc = new PDFDocument({ margin, size: [receiptWidth, 800] });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));

    await new Promise((resolve, reject) => {
      doc.on("end", resolve);
      doc.on("error", reject);

      // ── STORE NAME ──
      doc
        .fontSize(14).font("Helvetica-Bold").fillColor("#1E3A8A")
        .text("MELECH STORE", margin, 20, { align: "center", width: contentWidth });
      doc
        .fontSize(8).font("Helvetica").fillColor("#555")
        .text("Official Sales Receipt", margin, doc.y + 2, { align: "center", width: contentWidth });

      const divider = () => {
        doc.moveTo(margin, doc.y + 5).lineTo(receiptWidth - margin, doc.y + 5)
          .dash(2, { space: 2 }).strokeColor("#aaa").stroke().undash();
      };

      divider();
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
      doc.moveDown(0.5);

      const col = {
        num: margin, name: margin + 14, qty: margin + 100,
        price: margin + 126, total: margin + 182,
      };

      doc.fontSize(7.5).font("Helvetica-Bold").fillColor("#fff")
        .rect(margin, doc.y, contentWidth, 22).fill("#1E3A8A").stroke();

      const headerY = doc.y - 22;
      doc.fillColor("#fff").fontSize(7);
      doc.font("Helvetica-Bold").text("#",        col.num,   headerY + 3,  { width: 12 });
      doc.font("Helvetica-Bold").text("Item",     col.name,  headerY + 3,  { width: 82 });
      doc.font("Helvetica-Bold").text("Qty",      col.qty,   headerY + 3,  { width: 26 });
      doc.font("Helvetica-Bold").text("Unit",     col.price, headerY + 3,  { width: 52 });
      doc.font("Helvetica-Bold").text("Subtotal", col.total, headerY + 3,  { width: 52 });
      doc.font("Helvetica").fontSize(6).fillColor("#cce0ff");
      doc.text("Name / Desc / Cat.", col.name,  headerY + 13, { width: 82 });
      doc.text("Price",              col.price, headerY + 13, { width: 52 });
      doc.text("(Qty × Price)",      col.total, headerY + 13, { width: 52 });

      doc.fillColor("#000").font("Helvetica").fontSize(7.5);
      let y = doc.y + 4;

      orders.forEach((o, index) => {
        const name      = o.product.name || "—";
        const catText   = o.product.categoryName ? `[${o.product.categoryName}]` : "";
        const rawDesc   = o.product.desc || "";
        const shortDesc = rawDesc.length > 40 ? rawDesc.slice(0, 40) + "…" : rawDesc;

        const nameHeight = doc.heightOfString(name,      { width: 82 });
        const catHeight  = catText   ? doc.heightOfString(catText,    { width: 82 }) : 0;
        const descHeight = shortDesc ? doc.heightOfString(shortDesc,  { width: 82 }) : 0;
        const rowHeight  = Math.max(24, nameHeight + catHeight + descHeight + 10);

        doc.rect(margin, y, contentWidth, rowHeight)
          .fill(index % 2 === 0 ? "#F3F4F6" : "#FFFFFF").stroke();

        doc.fillColor("#000");
        doc.font("Helvetica-Bold").fontSize(7).text(String(index + 1), col.num, y + 4, { width: 12 });
        doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#000").text(name, col.name, y + 4, { width: 82 });

        let textOffsetY = y + 4 + nameHeight;
        if (catText) {
          doc.font("Helvetica").fontSize(6.5).fillColor("#1E3A8A")
            .text(catText, col.name, textOffsetY, { width: 82 });
          textOffsetY += catHeight;
        }
        if (shortDesc) {
          doc.font("Helvetica").fontSize(6.5).fillColor("#555")
            .text(shortDesc, col.name, textOffsetY, { width: 82 });
        }

        const midY = y + rowHeight / 2 - 4;
        doc.fillColor("#000").font("Helvetica").fontSize(7.5);
        doc.text(String(o.quantity),                  col.qty,   midY, { width: 26 });
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

      divider();
      doc.moveDown(0.5);
      doc.fontSize(7).font("Helvetica").fillColor("gray")
        .text("Thank you for shopping with MELECH STORE!", margin, doc.y, { align: "center", width: contentWidth });
      doc.text("No signature required — auto-generated receipt", margin, doc.y + 4, { align: "center", width: contentWidth });

      doc.end();
    });

    const pdfBuffer = Buffer.concat(chunks);

    /* ======================================================
       6️⃣ RAW PDF DOWNLOAD (any device, ?download=true)
    ====================================================== */
    if (wantRaw) {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=receipt-${receiptOrderId || "order"}.pdf`);
      return res.send(pdfBuffer);
    }

    /* ======================================================
       7️⃣ MOBILE → pure HTML receipt (no PDF embed at all)
         Android Chrome cannot render PDF inside any tag,
         so we skip the embed entirely and draw the receipt
         as styled HTML that looks identical to the PDF.
    ====================================================== */
    const downloadUrl = `?${new URLSearchParams({ ...req.query, download: "true" })}`;

    if (isMobile) {
      // Build HTML rows for each order item
      const itemRows = orders.map((o, index) => {
        const name      = o.product.name || "—";
        const catText   = o.product.categoryName ? o.product.categoryName : "";
        const rawDesc   = o.product.desc || "";
        const shortDesc = rawDesc.length > 60 ? rawDesc.slice(0, 60) + "…" : rawDesc;

        return `
          <tr class="${index % 2 === 0 ? "even" : "odd"}">
            <td class="num">${index + 1}</td>
            <td class="item-cell">
              <span class="item-name">${name}</span>
              ${catText  ? `<span class="item-cat">${catText}</span>` : ""}
              ${shortDesc ? `<span class="item-desc">${shortDesc}</span>` : ""}
            </td>
            <td class="center">${o.quantity}</td>
            <td class="right">₦${o.price.toLocaleString()}</td>
            <td class="right bold">₦${o.totalPrice.toLocaleString()}</td>
          </tr>`;
      }).join("");

      // Build payment instructions block if unpaid
      const paymentBlock = paymentStatus === "Unpaid" ? `
        <div class="payment-block">
          <div class="payment-title">⚠️ PAYMENT INSTRUCTIONS</div>
          <div class="pay-row"><span class="pay-label">Bank:</span><span>${STORE_ACCOUNT.bankName}</span></div>
          <div class="pay-row"><span class="pay-label">Account Name:</span><span>${STORE_ACCOUNT.accountName}</span></div>
          <div class="pay-row"><span class="pay-label">Account No:</span><span class="bold">${STORE_ACCOUNT.accountNumber}</span></div>
        </div>` : "";

      const mobileHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0"/>
  <title>Receipt – MELECH STORE</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Courier New', Courier, monospace;
      background: #e5e7eb;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 16px 12px 32px;
    }

    /* ── Page title & action bar ── */
    .page-title {
      color: #1E3A8A;
      font-size: 1rem;
      font-weight: 700;
      letter-spacing: .06em;
      margin-bottom: 10px;
      text-align: center;
    }
    .toolbar {
      display: flex;
      gap: 8px;
      margin-bottom: 14px;
      justify-content: center;
      flex-wrap: wrap;
    }
    .btn {
      padding: 9px 20px;
      border: none;
      border-radius: 8px;
      font-size: .82rem;
      font-weight: 700;
      cursor: pointer;
      text-decoration: none;
      display: inline-block;
      letter-spacing: .03em;
    }
    .btn-primary   { background: #1E3A8A; color: #fff; }
    .btn-secondary { background: #fff;    color: #374151; border: 1px solid #d1d5db; }

    /* ── Receipt card ── */
    .receipt {
      background: #fff;
      width: 100%;
      max-width: 360px;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 8px 30px rgba(0,0,0,.12);
      padding-bottom: 4px;
    }

    /* ── Store header ── */
    .store-header {
      background: #1E3A8A;
      color: #fff;
      text-align: center;
      padding: 16px 12px 12px;
    }
    .store-name {
      font-size: 1.15rem;
      font-weight: 800;
      letter-spacing: .1em;
    }
    .store-sub {
      font-size: .68rem;
      opacity: .75;
      margin-top: 2px;
      letter-spacing: .05em;
    }

    /* ── Dashed divider ── */
    .dash {
      border: none;
      border-top: 1.5px dashed #d1d5db;
      margin: 0 12px;
    }

    /* ── Info section ── */
    .info-block {
      padding: 10px 14px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      font-size: .72rem;
      line-height: 1.4;
    }
    .info-label { font-weight: 700; color: #374151; flex-shrink: 0; margin-right: 8px; }
    .info-value { color: #4b5563; text-align: right; word-break: break-all; }
    .status-paid   { color: #15803d; font-weight: 800; }
    .status-unpaid { color: #b91c1c; font-weight: 800; }

    /* ── Items table ── */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: .7rem;
    }
    thead tr {
      background: #1E3A8A;
      color: #fff;
    }
    thead th {
      padding: 7px 5px;
      font-weight: 700;
      letter-spacing: .04em;
      font-size: .65rem;
      text-align: left;
    }
    thead th.sub {
      display: block;
      font-weight: 400;
      opacity: .7;
      font-size: .6rem;
      letter-spacing: 0;
    }
    th.center, td.center { text-align: center; }
    th.right,  td.right  { text-align: right;  }

    tr.even { background: #f3f4f6; }
    tr.odd  { background: #fff;    }

    td {
      padding: 7px 5px;
      vertical-align: top;
      color: #111827;
      line-height: 1.35;
    }
    td.num {
      color: #9ca3af;
      font-size: .65rem;
      padding-top: 8px;
      text-align: center;
      width: 18px;
    }
    td.item-cell  { width: 40%; }
    td.center     { width: 18%; }
    td.right      { width: 22%; }
    td.bold       { font-weight: 700; }

    .item-name {
      display: block;
      font-weight: 700;
      font-size: .72rem;
      color: #1f2937;
    }
    .item-cat {
      display: block;
      font-size: .62rem;
      color: #1E3A8A;
      font-weight: 600;
      margin-top: 1px;
    }
    .item-desc {
      display: block;
      font-size: .62rem;
      color: #6b7280;
      margin-top: 1px;
    }

    /* ── Total row ── */
    .total-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 14px;
      border-top: 2px solid #111827;
      margin-top: 2px;
    }
    .total-label { font-size: .8rem; font-weight: 700; color: #111827; }
    .total-amount {
      font-size: 1rem;
      font-weight: 800;
      color: #1E3A8A;
      letter-spacing: .03em;
    }

    /* ── Payment instructions ── */
    .payment-block {
      margin: 0 12px 12px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      padding: 10px 12px;
      font-size: .7rem;
    }
    .payment-title {
      font-weight: 800;
      color: #b91c1c;
      font-size: .72rem;
      text-align: center;
      margin-bottom: 8px;
      letter-spacing: .04em;
    }
    .pay-row {
      display: flex;
      gap: 6px;
      margin-bottom: 4px;
      color: #374151;
    }
    .pay-label { font-weight: 700; flex-shrink: 0; }

    /* ── Footer ── */
    .footer {
      text-align: center;
      padding: 10px 12px 14px;
      font-size: .65rem;
      color: #9ca3af;
      line-height: 1.6;
    }
  </style>
</head>
<body>

  <p class="page-title">🧾 MELECH STORE — Receipt</p>

  <div class="toolbar">
    <a class="btn btn-primary" href="${downloadUrl}" download="receipt.pdf">⬇ Download PDF</a>
    <button class="btn btn-secondary" onclick="window.print()">🖨 Print</button>
  </div>

  <div class="receipt">

    <!-- Store header -->
    <div class="store-header">
      <div class="store-name">MELECH STORE</div>
      <div class="store-sub">Official Sales Receipt</div>
    </div>

    <hr class="dash" style="margin-top:0"/>

    <!-- Order info -->
    <div class="info-block">
      <div class="info-row">
        <span class="info-label">Order ID:</span>
        <span class="info-value">${receiptOrderId ? String(receiptOrderId).slice(-10).toUpperCase() : "N/A"}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Date:</span>
        <span class="info-value">${new Date().toLocaleString()}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Customer:</span>
        <span class="info-value">${customerName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Payment:</span>
        <span class="info-value">${paymentMethod}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Status:</span>
        <span class="info-value ${paymentStatus === "Paid" ? "status-paid" : "status-unpaid"}">${paymentStatus}</span>
      </div>
    </div>

    <hr class="dash"/>

    <!-- Items table -->
    <table>
      <thead>
        <tr>
          <th style="width:18px">#</th>
          <th>
            Item
            <span class="sub">Name / Desc / Cat.</span>
          </th>
          <th class="center">
            Qty
          </th>
          <th class="right">
            Unit
            <span class="sub">Price</span>
          </th>
          <th class="right">
            Subtotal
            <span class="sub">Qty×Price</span>
          </th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>

    <!-- Total -->
    <div class="total-row">
      <span class="total-label">TOTAL (${orders.length} item${orders.length > 1 ? "s" : ""}):</span>
      <span class="total-amount">₦${totalAmount.toLocaleString()}</span>
    </div>

    <hr class="dash"/>

    <!-- Payment instructions (unpaid only) -->
    ${paymentBlock}

    <!-- Footer -->
    <div class="footer">
      Thank you for shopping with MELECH STORE!<br/>
      No signature required — auto-generated receipt
    </div>

  </div>
</body>
</html>`;

      res.setHeader("Content-Type", "text/html");
      return res.send(mobileHtml);
    }

    /* ======================================================
       8️⃣ DESKTOP → PDF embed in HTML wrapper (unchanged)
    ====================================================== */
    const base64PDF = pdfBuffer.toString("base64");
    const dataURI   = `data:application/pdf;base64,${base64PDF}`;

    const desktopHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Receipt – MELECH STORE</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:sans-serif; background:#f1f5f9; display:flex; flex-direction:column; align-items:center; min-height:100vh; padding:12px; }
    h2 { color:#1E3A8A; margin-bottom:10px; font-size:1rem; letter-spacing:.05em; }
    .toolbar { display:flex; gap:10px; margin-bottom:12px; flex-wrap:wrap; justify-content:center; }
    .btn { padding:9px 20px; border:none; border-radius:6px; font-size:.85rem; cursor:pointer; font-weight:600; text-decoration:none; display:inline-block; }
    .btn-primary   { background:#1E3A8A; color:#fff; }
    .btn-secondary { background:#e2e8f0; color:#1e293b; }
    .pdf-wrap { width:100%; max-width:500px; background:white; border-radius:10px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,.12); }
    embed { width:100%; height:80vh; border:none; display:block; }
  </style>
</head>
<body>
  <h2>🧾 MELECH STORE — Receipt</h2>
  <div class="toolbar">
    <a class="btn btn-primary" href="${downloadUrl}" download="receipt.pdf">⬇ Download PDF</a>
    <button class="btn btn-secondary" onclick="window.print()">🖨 Print</button>
  </div>
  <div class="pdf-wrap">
    <embed src="${dataURI}" type="application/pdf"/>
  </div>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html");
    return res.send(desktopHtml);

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