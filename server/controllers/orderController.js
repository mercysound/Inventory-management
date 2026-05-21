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
      historyReceipt,
    } = req.query;

    const paymentStatus = mode === "final" ? "Paid" : "Unpaid";
    let orders = [];
    let receiptOrderId = orderId || null;

    /* ======================================================
       1️⃣  PREVIEW → FROM CART
    ====================================================== */
    if (mode === "preview") {
      const activeOrders = await OrderModel.find({
        userOrdering: req.user._id,
      }).populate({
        path: "product",
        select: "name description categoryId",
        populate: { path: "categoryId", select: "name" },
      });

      if (!activeOrders.length)
        return res.status(404).json({ message: "No active orders to preview" });

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
       2️⃣  FINAL → FROM HISTORY MODEL
    ====================================================== */
    if (mode === "final") {
      let HistoryModel;
      if (historyReceipt) {
        HistoryModel = CompletedOrderHistoryModel;
      } else {
        HistoryModel =
          orderSource === "staff"
            ? CompletedOrderHistoryModel
            : AllOrdersPlacedModel;
      }

      const query = orderId ? { _id: orderId } : { userOrdering: req.user._id };
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

      if (!order) return res.status(404).json({ message: "Order not found" });

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

    if (!orders.length)
      return res.status(404).json({ message: "No orders found" });

    /* ======================================================
       3️⃣  TOTALS & SHARED VARIABLES
    ====================================================== */
    const totalAmount = orders.reduce((sum, o) => sum + o.totalPrice, 0);
    const orderIdShort = receiptOrderId
      ? String(receiptOrderId).slice(-10).toUpperCase()
      : "N/A";
    const dateStr = new Date().toLocaleString("en-NG", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    /* ======================================================
       4️⃣  RAW PDF DOWNLOAD — only when ?download=true
           The HTML page's "Download PDF" button hits this
           same endpoint with ?download=true appended.
    ====================================================== */
    const wantRaw = req.query.download === "true";

    // Build the download URL used by the HTML page's Download PDF button
    const downloadUrl =
      "?" + new URLSearchParams({ ...req.query, download: "true" }).toString();

    if (wantRaw) {
      const receiptWidth = 300;
      const margin = 20;
      const contentWidth = receiptWidth - margin * 2;
      const doc = new PDFDocument({ margin, size: [receiptWidth, 800] });
      const chunks = [];
      doc.on("data", (c) => chunks.push(c));

      await new Promise((resolve, reject) => {
        doc.on("end", resolve);
        doc.on("error", reject);

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

        const divider = () =>
          doc
            .moveTo(margin, doc.y + 5)
            .lineTo(receiptWidth - margin, doc.y + 5)
            .dash(2, { space: 2 })
            .strokeColor("#aaa")
            .stroke()
            .undash();

        divider();
        doc.moveDown(0.8).fontSize(7.5).font("Helvetica").fillColor("#000");

        [
          ["Order ID:", orderIdShort],
          ["Date:", dateStr],
          ["Customer:", customerName],
          ["Payment:", paymentMethod],
          ["Status:", paymentStatus],
        ].forEach(([label, value]) => {
          const ly = doc.y;
          doc.font("Helvetica-Bold").text(label, margin, ly, { continued: false, width: 70 });
          doc.font("Helvetica").text(value, margin + 72, ly, { width: contentWidth - 72 });
          doc.moveDown(0.3);
        });

        divider();
        doc.moveDown(0.5);

        const col = {
          num: margin,
          name: margin + 14,
          qty: margin + 100,
          price: margin + 126,
          total: margin + 182,
        };

        doc
          .fontSize(7.5)
          .font("Helvetica-Bold")
          .fillColor("#fff")
          .rect(margin, doc.y, contentWidth, 22)
          .fill("#1E3A8A")
          .stroke();

        const hy = doc.y - 22;
        doc.fillColor("#fff").fontSize(7);
        doc.font("Helvetica-Bold").text("#", col.num, hy + 3, { width: 12 });
        doc.font("Helvetica-Bold").text("Item", col.name, hy + 3, { width: 82 });
        doc.font("Helvetica-Bold").text("Qty", col.qty, hy + 3, { width: 26 });
        doc.font("Helvetica-Bold").text("Unit", col.price, hy + 3, { width: 52 });
        doc.font("Helvetica-Bold").text("Subtotal", col.total, hy + 3, { width: 52 });
        doc
          .font("Helvetica")
          .fontSize(6)
          .fillColor("#cce0ff")
          .text("Name / Desc / Cat.", col.name, hy + 13, { width: 82 })
          .text("Price", col.price, hy + 13, { width: 52 })
          .text("(Qty×Price)", col.total, hy + 13, { width: 52 });

        doc.fillColor("#000").font("Helvetica").fontSize(7.5);
        let y = doc.y + 4;

        orders.forEach((o, idx) => {
          const name = o.product.name || "—";
          const cat = o.product.categoryName ? `[${o.product.categoryName}]` : "";
          const raw = o.product.desc || "";
          const desc = raw.length > 40 ? raw.slice(0, 40) + "…" : raw;

          const nh = doc.heightOfString(name, { width: 82 });
          const ch = cat ? doc.heightOfString(cat, { width: 82 }) : 0;
          const dh = desc ? doc.heightOfString(desc, { width: 82 }) : 0;
          const rh = Math.max(24, nh + ch + dh + 10);

          doc
            .rect(margin, y, contentWidth, rh)
            .fill(idx % 2 === 0 ? "#F3F4F6" : "#FFF")
            .stroke();
          doc.fillColor("#000");

          doc.font("Helvetica-Bold").fontSize(7).text(String(idx + 1), col.num, y + 4, { width: 12 });
          doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#000").text(name, col.name, y + 4, { width: 82 });

          let ty = y + 4 + nh;
          if (cat) {
            doc.font("Helvetica").fontSize(6.5).fillColor("#1E3A8A").text(cat, col.name, ty, { width: 82 });
            ty += ch;
          }
          if (desc)
            doc.font("Helvetica").fontSize(6.5).fillColor("#555").text(desc, col.name, ty, { width: 82 });

          const mid = y + rh / 2 - 4;
          doc.fillColor("#000").font("Helvetica").fontSize(7.5);
          doc.text(String(o.quantity), col.qty, mid, { width: 26 });
          doc.text(`₦${o.price.toLocaleString()}`, col.price, mid, { width: 52 });
          doc.text(`₦${o.totalPrice.toLocaleString()}`, col.total, mid, { width: 52 });
          y += rh;
        });

        y += 6;
        doc.moveTo(margin, y).lineTo(receiptWidth - margin, y).strokeColor("#000").stroke();
        y += 6;
        doc
          .fontSize(9)
          .font("Helvetica-Bold")
          .fillColor("#000")
          .text(`TOTAL (${orders.length} item${orders.length > 1 ? "s" : ""}):`, col.num, y, { width: 155 })
          .text(`₦${totalAmount.toLocaleString()}`, col.total, y, { width: 52 });
        y += 20;

        if (paymentStatus === "Unpaid") {
          divider();
          doc.moveDown(0.5);
          doc
            .fontSize(7.5)
            .font("Helvetica-Bold")
            .fillColor("#b91c1c")
            .text("PAYMENT INSTRUCTIONS", margin, doc.y, { align: "center", width: contentWidth });
          doc.font("Helvetica").fillColor("#000").moveDown(0.3);
          [
            ["Bank:", STORE_ACCOUNT.bankName],
            ["Account Name:", STORE_ACCOUNT.accountName],
            ["Account No:", STORE_ACCOUNT.accountNumber],
          ].forEach(([label, value]) => {
            const ly = doc.y;
            doc.font("Helvetica-Bold").text(label, margin, ly, { width: 75 });
            doc.font("Helvetica").text(value, margin + 77, ly, { width: contentWidth - 77 });
            doc.moveDown(0.3);
          });
        }

        divider();
        doc.moveDown(0.5);
        doc
          .fontSize(7)
          .font("Helvetica")
          .fillColor("gray")
          .text("Thank you for shopping with MELECH STORE!", margin, doc.y, {
            align: "center",
            width: contentWidth,
          })
          .text("No signature required — auto-generated receipt", margin, doc.y + 4, {
            align: "center",
            width: contentWidth,
          });

        doc.end();
      });

      const pdfBuffer = Buffer.concat(chunks);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=receipt-${orderIdShort}.pdf`);
      return res.send(pdfBuffer);
    }

    /* ======================================================
       5️⃣  HTML RECEIPT — served on ALL devices
           Works on mobile and desktop.
           Buttons: Download PDF | Save Image | Print | Share
           Share uses html2canvas to capture the receipt as
           a real PNG file and passes it to the native OS
           share sheet — WhatsApp/Facebook receive the actual
           image in chat, not a link.
    ====================================================== */

    // ── Status badge colours ──
    const statusColor  = paymentStatus === "Paid" ? "#15803d" : "#b91c1c";
    const statusBg     = paymentStatus === "Paid" ? "#f0fdf4" : "#fef2f2";
    const statusBorder = paymentStatus === "Paid" ? "#bbf7d0" : "#fecaca";

    // ── Build item rows ──
    const itemRows = orders
      .map((o, idx) => {
        const name = o.product.name || "—";
        const cat  = o.product.categoryName || "";
        const raw  = o.product.desc || "";
        const desc = raw.length > 60 ? raw.slice(0, 60) + "…" : raw;
        return `
        <tr class="${idx % 2 === 0 ? "r-even" : "r-odd"}">
          <td class="td-num">${idx + 1}</td>
          <td class="td-item">
            <span class="i-name">${name}</span>
            ${cat  ? `<span class="i-cat">${cat}</span>`   : ""}
            ${desc ? `<span class="i-desc">${desc}</span>` : ""}
          </td>
          <td class="td-c">${o.quantity}</td>
          <td class="td-r">&#8358;${o.price.toLocaleString()}</td>
          <td class="td-r td-bold">&#8358;${o.totalPrice.toLocaleString()}</td>
        </tr>`;
      })
      .join("");

    // ── Payment instructions block (unpaid orders only) ──
    const payBlock =
      paymentStatus === "Unpaid"
        ? `<div class="pay-box">
            <div class="pay-title">Payment instructions</div>
            <div class="pay-row"><span class="pay-lbl">Bank</span><span>${STORE_ACCOUNT.bankName}</span></div>
            <div class="pay-row"><span class="pay-lbl">Account name</span><span>${STORE_ACCOUNT.accountName}</span></div>
            <div class="pay-row"><span class="pay-lbl">Account no.</span><span class="pay-acct">${STORE_ACCOUNT.accountNumber}</span></div>
          </div>`
        : "";

    // ── Escape values used inside JS string literals inside the HTML ──
    // These are injected into a <script> block, so we escape apostrophes.
    const safeCustomer = customerName.replace(/'/g, "\\'");
    const safeDateStr  = dateStr.replace(/'/g, "\\'");
    const safeTotal    = totalAmount.toLocaleString();

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"/>
<title>Receipt · MELECH STORE</title>

<!-- html2canvas: converts the receipt div into a PNG image in the browser.
     Loaded from cdnjs (no npm install needed — pure client-side). -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"><\/script>

<style>
  /* ── Reset ── */
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  /* ── Page ── */
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #f0f2f5;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px 12px 48px;
    color: #111827;
  }

  /* ── Action bar ── */
  .actions {
    display: flex;
    gap: 8px;
    margin-bottom: 18px;
    flex-wrap: wrap;
    justify-content: center;
    width: 100%;
    max-width: 480px;
  }
  .btn {
    flex: 1;
    min-width: 100px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 11px 10px;
    border-radius: 10px;
    font-size: 0.78rem;
    font-weight: 600;
    border: none;
    cursor: pointer;
    text-decoration: none;
    letter-spacing: 0.02em;
    transition: opacity .15s, transform .1s;
    white-space: nowrap;
  }
  .btn:disabled { opacity: .6; cursor: not-allowed; transform: none; }
  .btn:active   { transform: scale(0.97); opacity: 0.88; }

  /* Individual button colours */
  .btn-dl    { background: #1E3A8A; color: #fff; }
  .btn-img   { background: #7c3aed; color: #fff; }
  .btn-print { background: #fff; color: #374151; border: 1.5px solid #e5e7eb; }
  .btn-share { background: #16a34a; color: #fff; }
  .btn svg   { flex-shrink: 0; }

  /* ── Receipt card ── */
  .card {
    background: #fff;
    width: 100%;
    max-width: 480px;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 4px 24px rgba(0,0,0,.10);
  }

  /* ── Store header ── */
  .store-hd {
    background: #1E3A8A;
    color: #fff;
    text-align: center;
    padding: 22px 16px 16px;
  }
  .store-logo {
    width: 44px; height: 44px;
    border-radius: 50%;
    background: rgba(255,255,255,.18);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
    font-weight: 700;
    margin-bottom: 8px;
    letter-spacing: .05em;
  }
  .store-name { font-size: 1.1rem; font-weight: 700; letter-spacing: .1em; }
  .store-sub  { font-size: .7rem; opacity: .7; margin-top: 3px; letter-spacing: .06em; }

  /* ── Dashed divider ── */
  .dash { border: none; border-top: 1.5px dashed #e5e7eb; margin: 0 16px; }

  /* ── Order meta ── */
  .meta { padding: 14px 18px; display: flex; flex-direction: column; gap: 5px; }
  .meta-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
    font-size: .78rem;
    line-height: 1.4;
  }
  .meta-lbl { font-weight: 600; color: #6b7280; flex-shrink: 0; }
  .meta-val { color: #111827; text-align: right; word-break: break-all; }
  .status-badge {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 99px;
    font-size: .72rem;
    font-weight: 700;
    background: ${statusBg};
    color: ${statusColor};
    border: 1px solid ${statusBorder};
  }

  /* ── Items table ── */
  table { width: 100%; border-collapse: collapse; font-size: .75rem; }
  thead tr { background: #1E3A8A; color: #fff; }
  thead th {
    padding: 9px 6px;
    font-weight: 700;
    font-size: .68rem;
    letter-spacing: .04em;
    text-align: left;
    line-height: 1.3;
  }
  thead th small { display: block; font-weight: 400; opacity: .65; font-size: .6rem; letter-spacing: 0; }
  .td-num  { text-align: center; color: #9ca3af; font-size: .68rem; padding: 8px 4px; width: 22px; vertical-align: top; }
  .td-item { padding: 8px 6px; vertical-align: top; width: 42%; }
  .td-c    { text-align: center; padding: 8px 4px; vertical-align: middle; width: 14%; }
  .td-r    { text-align: right; padding: 8px 6px; vertical-align: middle; width: 20%; }
  .td-bold { font-weight: 700; color: #111827; }
  .r-even  { background: #f9fafb; }
  .r-odd   { background: #fff; }
  .i-name  { display: block; font-weight: 700; font-size: .76rem; color: #1f2937; }
  .i-cat   { display: block; font-size: .65rem; color: #1E3A8A; font-weight: 600; margin-top: 2px; }
  .i-desc  { display: block; font-size: .65rem; color: #6b7280; margin-top: 2px; }

  /* ── Total bar ── */
  .total-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 13px 18px;
    border-top: 2px solid #111827;
    margin-top: 2px;
  }
  .total-lbl    { font-size: .85rem; font-weight: 700; }
  .total-amount { font-size: 1.1rem; font-weight: 800; color: #1E3A8A; }

  /* ── Payment instructions ── */
  .pay-box {
    margin: 0 16px 16px;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 10px;
    padding: 12px 14px;
    font-size: .75rem;
  }
  .pay-title {
    font-weight: 700; color: #b91c1c; font-size: .74rem;
    text-align: center; margin-bottom: 10px;
    text-transform: uppercase; letter-spacing: .05em;
  }
  .pay-row { display: flex; justify-content: space-between; gap: 8px; padding: 3px 0; color: #374151; }
  .pay-lbl  { font-weight: 600; color: #6b7280; flex-shrink: 0; }
  .pay-acct { font-weight: 700; color: #111827; letter-spacing: .04em; }

  /* ── Footer ── */
  .footer {
    text-align: center;
    padding: 12px 16px 18px;
    font-size: .68rem;
    color: #9ca3af;
    line-height: 1.7;
    border-top: 1.5px dashed #e5e7eb;
  }

  /* ── Print: hide buttons, remove shadows ── */
  @media print {
    body { background: #fff; padding: 0; }
    .actions { display: none !important; }
    .card { box-shadow: none; border-radius: 0; max-width: 100%; }
  }

  /* ── Desktop ── */
  @media (min-width: 600px) {
    body { padding: 32px 24px 64px; }
    .btn  { font-size: .84rem; }
    table { font-size: .8rem; }
  }
</style>
</head>
<body>

<!-- ═══════════════════════════════════════════
     ACTION BAR
     4 buttons: Download PDF | Save Image | Print | Share
     ═══════════════════════════════════════════ -->
<div class="actions" id="actionBar">

  <!-- 1. Download PDF — hits the same endpoint with ?download=true -->
  <a class="btn btn-dl" href="${downloadUrl}" download="receipt-${orderIdShort}.pdf">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
    PDF
  </a>

  <!-- 2. Save Image — captures receipt as PNG via html2canvas and downloads it -->
  <button class="btn btn-img" id="dlImgBtn">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21 15 16 10 5 21"/>
    </svg>
    Save image
  </button>

  <!-- 3. Print -->
  <button class="btn btn-print" onclick="window.print()">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="6 9 6 2 18 2 18 9"/>
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
      <rect x="6" y="14" width="12" height="8"/>
    </svg>
    Print
  </button>

  <!-- 4. Share — sends the actual PNG image file to WhatsApp/Facebook/etc.
       On devices that support navigator.canShare({files}), the OS share sheet
       opens and the recipient gets the image directly in chat (not a link).
       On desktop browsers that don't support file sharing, it downloads the
       image instead so the user can attach it manually. -->
  <button class="btn btn-share" id="shareBtn">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
    </svg>
    Share
  </button>

</div>

<!-- ═══════════════════════════════════════════
     RECEIPT CARD  (this div is what gets
     captured as a PNG by html2canvas)
     ═══════════════════════════════════════════ -->
<div class="card" id="receipt">

  <!-- Store header -->
  <div class="store-hd">
    <div class="store-logo">MS</div>
    <div class="store-name">MELECH STORE</div>
    <div class="store-sub">Official Sales Receipt</div>
  </div>

  <hr class="dash"/>

  <!-- Order meta -->
  <div class="meta">
    <div class="meta-row">
      <span class="meta-lbl">Order ID</span>
      <span class="meta-val">#${orderIdShort}</span>
    </div>
    <div class="meta-row">
      <span class="meta-lbl">Date</span>
      <span class="meta-val">${dateStr}</span>
    </div>
    <div class="meta-row">
      <span class="meta-lbl">Customer</span>
      <span class="meta-val">${customerName}</span>
    </div>
    <div class="meta-row">
      <span class="meta-lbl">Payment method</span>
      <span class="meta-val">${paymentMethod}</span>
    </div>
    <div class="meta-row">
      <span class="meta-lbl">Status</span>
      <span class="meta-val">
        <span class="status-badge">${paymentStatus}</span>
      </span>
    </div>
  </div>

  <hr class="dash"/>

  <!-- Items table -->
  <table>
    <thead>
      <tr>
        <th style="width:22px;text-align:center">#</th>
        <th>Item <small>Name / desc / category</small></th>
        <th style="text-align:center">Qty</th>
        <th style="text-align:right">Unit <small>price</small></th>
        <th style="text-align:right">Subtotal <small>Qty &times; price</small></th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <!-- Total -->
  <div class="total-bar">
    <span class="total-lbl">
      Total &nbsp;
      <span style="font-weight:400;font-size:.78rem;color:#6b7280">
        (${orders.length} item${orders.length > 1 ? "s" : ""})
      </span>
    </span>
    <span class="total-amount">&#8358;${totalAmount.toLocaleString()}</span>
  </div>

  <hr class="dash"/>

  <!-- Payment instructions (unpaid only) -->
  ${payBlock}

  <!-- Footer -->
  <div class="footer">
    Thank you for shopping with MELECH STORE<br/>
    No signature required &middot; Auto-generated receipt
  </div>

</div><!-- end #receipt -->

<script>
  // ─────────────────────────────────────────────────────────────────────────
  // UTILITY: temporarily show feedback text on a button then restore it
  // ─────────────────────────────────────────────────────────────────────────
  function btnFeedback(btn, html, bg, ms) {
    var orig   = btn.innerHTML;
    var origBg = btn.style.background;
    btn.innerHTML        = html;
    btn.style.background = bg;
    btn.disabled         = true;
    setTimeout(function () {
      btn.innerHTML        = orig;
      btn.style.background = origBg;
      btn.disabled         = false;
    }, ms);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CAPTURE: use html2canvas to render #receipt as a hi-res PNG blob.
  // We temporarily hide the action bar so it does not appear in the image.
  // scale:2 gives a crisp 2× image suitable for phone screens and printing.
  // ─────────────────────────────────────────────────────────────────────────
  function captureReceiptBlob() {
    var actionBar = document.getElementById('actionBar');
    actionBar.style.display = 'none';           // hide buttons during capture

    return html2canvas(document.getElementById('receipt'), {
      scale:           2,
      useCORS:         true,
      backgroundColor: '#ffffff',
      logging:         false,
    }).then(function (canvas) {
      actionBar.style.display = '';             // restore buttons
      return new Promise(function (resolve) {
        canvas.toBlob(function (blob) { resolve(blob); }, 'image/png', 1.0);
      });
    }).catch(function (err) {
      actionBar.style.display = '';             // always restore on error too
      throw err;
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SAVE IMAGE BUTTON
  // Captures the receipt as PNG and triggers a browser download.
  // The user can then open their gallery/files and attach it to WhatsApp
  // manually if the Share button is not available on their device.
  // ─────────────────────────────────────────────────────────────────────────
  document.getElementById('dlImgBtn').addEventListener('click', function () {
    var btn = this;
    btn.disabled  = true;
    btn.innerHTML = 'Generating\u2026';

    captureReceiptBlob().then(function (blob) {
      var url = URL.createObjectURL(blob);
      var a   = document.createElement('a');
      a.href     = url;
      a.download = 'receipt-${orderIdShort}.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      btnFeedback(btn,
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/><\\/svg> Saved!',
        '#0f766e', 2500
      );
    }).catch(function (err) {
      console.error('Image capture error:', err);
      btn.disabled  = false;
      btn.innerHTML = 'Save image';
      alert('Could not generate image. Please try again.');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SHARE BUTTON
  //
  // HOW IT WORKS:
  //   1. html2canvas captures #receipt as a PNG blob (action bar hidden).
  //   2. The blob is wrapped in a File object.
  //   3. navigator.canShare({ files }) checks if the device OS supports
  //      direct file sharing (Android Chrome ✅, iOS Safari ✅, most
  //      desktop browsers ❌).
  //   4. If yes → navigator.share({ files }) opens the native share sheet.
  //      The user picks WhatsApp / Facebook / Telegram / Gmail etc.
  //      The receipt PNG lands directly in the conversation as an IMAGE,
  //      not a link — just like a bank app receipt share.
  //   5. If no (desktop) → the PNG is downloaded instead, with an alert
  //      explaining the user can attach it manually.
  // ─────────────────────────────────────────────────────────────────────────
  var originalShareHTML = document.getElementById('shareBtn').innerHTML;

  document.getElementById('shareBtn').addEventListener('click', function () {
    var btn      = this;
    btn.disabled = true;
    btn.innerHTML = 'Preparing\u2026';

    captureReceiptBlob().then(function (blob) {
      var file = new File(
        [blob],
        'receipt-${orderIdShort}.png',
        { type: 'image/png' }
      );

      // ── Path A: device supports native file sharing ──────────────────────
      // This opens the OS share sheet (WhatsApp, Facebook, Telegram, etc.)
      // and the recipient sees the PNG image directly in their chat.
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        return navigator.share({
          files: [file],
          title: 'MELECH STORE Receipt #${orderIdShort}',
          text:  'Receipt from MELECH STORE\\nOrder: #${orderIdShort}\\nDate: ${safeDateStr}\\nCustomer: ${safeCustomer}\\nTotal: \\u20A6${safeTotal}\\nStatus: ${paymentStatus}',
        }).then(function () {
          // Share completed or dismissed — restore button either way
          btn.disabled  = false;
          btn.innerHTML = originalShareHTML;
        }).catch(function (err) {
          btn.disabled  = false;
          btn.innerHTML = originalShareHTML;
          // AbortError = user closed the share sheet — not an error
          if (err.name !== 'AbortError') {
            console.warn('Share error:', err);
            alert('Sharing failed. The image has been downloaded instead — attach it manually.');
            triggerDownload(blob);
          }
        });
      }

      // ── Path B: desktop / browser without file share support ─────────────
      // Download the PNG and tell the user they can attach it manually.
      triggerDownload(blob);
      btnFeedback(btn,
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/><\\/svg> Image saved \u2014 attach it in your app',
        '#0f766e', 3500
      );

    }).catch(function (err) {
      console.error('Capture error:', err);
      btn.disabled  = false;
      btn.innerHTML = originalShareHTML;
      alert('Could not prepare the image. Please try again.');
    });
  });

  // ── Helper: trigger a PNG file download in the browser ──
  function triggerDownload(blob) {
    var url = URL.createObjectURL(blob);
    var a   = document.createElement('a');
    a.href     = url;
    a.download = 'receipt-${orderIdShort}.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
<\/script>
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