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
       1  PREVIEW -> FROM CART
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
       2  FINAL -> FROM HISTORY MODEL
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
       3  TOTALS
    ====================================================== */
    const totalAmount   = orders.reduce((sum, o) => sum + o.totalPrice, 0);
    const orderIdShort  = receiptOrderId
      ? String(receiptOrderId).slice(-10).toUpperCase()
      : "N/A";
    const dateStr = new Date().toLocaleString("en-NG", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    /* ======================================================
       4  RAW PDF DOWNLOAD - only when ?download=true
    ====================================================== */
    const wantRaw    = req.query.download === "true";
    const downloadUrl =
      "?" + new URLSearchParams({ ...req.query, download: "true" }).toString();

    if (wantRaw) {
      const receiptWidth  = 300;
      const margin        = 20;
      const contentWidth  = receiptWidth - margin * 2;
      const doc           = new PDFDocument({ margin, size: [receiptWidth, 800] });
      const chunks        = [];
      doc.on("data", (c) => chunks.push(c));

      await new Promise((resolve, reject) => {
        doc.on("end", resolve);
        doc.on("error", reject);

        doc.fontSize(14).font("Helvetica-Bold").fillColor("#1E3A8A")
          .text("MELECH STORE", margin, 20, { align: "center", width: contentWidth });
        doc.fontSize(8).font("Helvetica").fillColor("#555")
          .text("Official Sales Receipt", margin, doc.y + 2, {
            align: "center", width: contentWidth });

        const divider = () =>
          doc.moveTo(margin, doc.y + 5)
            .lineTo(receiptWidth - margin, doc.y + 5)
            .dash(2, { space: 2 }).strokeColor("#aaa").stroke().undash();

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
          num: margin, name: margin + 14, qty: margin + 100,
          price: margin + 126, total: margin + 182,
        };

        doc.fontSize(7.5).font("Helvetica-Bold").fillColor("#fff")
          .rect(margin, doc.y, contentWidth, 22).fill("#1E3A8A").stroke();
        const hy = doc.y - 22;
        doc.fillColor("#fff").fontSize(7);
        doc.font("Helvetica-Bold").text("#",        col.num,   hy + 3, { width: 12 });
        doc.font("Helvetica-Bold").text("Item",     col.name,  hy + 3, { width: 82 });
        doc.font("Helvetica-Bold").text("Qty",      col.qty,   hy + 3, { width: 26 });
        doc.font("Helvetica-Bold").text("Unit",     col.price, hy + 3, { width: 52 });
        doc.font("Helvetica-Bold").text("Subtotal", col.total, hy + 3, { width: 52 });
        doc.font("Helvetica").fontSize(6).fillColor("#cce0ff")
          .text("Name / Desc / Cat.", col.name,  hy + 13, { width: 82 })
          .text("Price",              col.price, hy + 13, { width: 52 })
          .text("(Qty x Price)",      col.total, hy + 13, { width: 52 });

        doc.fillColor("#000").font("Helvetica").fontSize(7.5);
        let y = doc.y + 4;

        orders.forEach((o, idx) => {
          const name = o.product.name || "-";
          const cat  = o.product.categoryName ? "[" + o.product.categoryName + "]" : "";
          const raw  = o.product.desc || "";
          const desc = raw.length > 40 ? raw.slice(0, 40) + "..." : raw;
          const nh   = doc.heightOfString(name, { width: 82 });
          const ch   = cat  ? doc.heightOfString(cat,  { width: 82 }) : 0;
          const dh   = desc ? doc.heightOfString(desc, { width: 82 }) : 0;
          const rh   = Math.max(24, nh + ch + dh + 10);

          doc.rect(margin, y, contentWidth, rh)
            .fill(idx % 2 === 0 ? "#F3F4F6" : "#FFF").stroke();
          doc.fillColor("#000");
          doc.font("Helvetica-Bold").fontSize(7)
            .text(String(idx + 1), col.num, y + 4, { width: 12 });
          doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#000")
            .text(name, col.name, y + 4, { width: 82 });

          let ty = y + 4 + nh;
          if (cat) {
            doc.font("Helvetica").fontSize(6.5).fillColor("#1E3A8A")
              .text(cat, col.name, ty, { width: 82 });
            ty += ch;
          }
          if (desc)
            doc.font("Helvetica").fontSize(6.5).fillColor("#555")
              .text(desc, col.name, ty, { width: 82 });

          const mid = y + rh / 2 - 4;
          doc.fillColor("#000").font("Helvetica").fontSize(7.5);
          doc.text(String(o.quantity),                  col.qty,   mid, { width: 26 });
          doc.text("N" + o.price.toLocaleString(),      col.price, mid, { width: 52 });
          doc.text("N" + o.totalPrice.toLocaleString(), col.total, mid, { width: 52 });
          y += rh;
        });

        y += 6;
        doc.moveTo(margin, y).lineTo(receiptWidth - margin, y)
          .strokeColor("#000").stroke();
        y += 6;
        doc.fontSize(9).font("Helvetica-Bold").fillColor("#000")
          .text(
            "TOTAL (" + orders.length + " item" + (orders.length > 1 ? "s" : "") + "):",
            col.num, y, { width: 155 }
          )
          .text("N" + totalAmount.toLocaleString(), col.total, y, { width: 52 });
        y += 20;

        if (paymentStatus === "Unpaid") {
          divider();
          doc.moveDown(0.5);
          doc.fontSize(7.5).font("Helvetica-Bold").fillColor("#b91c1c")
            .text("PAYMENT INSTRUCTIONS", margin, doc.y, {
              align: "center", width: contentWidth });
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
        doc.fontSize(7).font("Helvetica").fillColor("gray")
          .text("Thank you for shopping with MELECH STORE!", margin, doc.y, {
            align: "center", width: contentWidth })
          .text("No signature required - auto-generated receipt", margin, doc.y + 4, {
            align: "center", width: contentWidth });

        doc.end();
      });

      const pdfBuffer = Buffer.concat(chunks);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=receipt-" + orderIdShort + ".pdf"
      );
      return res.send(pdfBuffer);
    }

    /* ======================================================
       5  HTML RECEIPT - all devices
    ====================================================== */
    const statusColor  = paymentStatus === "Paid" ? "#15803d" : "#b91c1c";
    const statusBg     = paymentStatus === "Paid" ? "#f0fdf4" : "#fef2f2";
    const statusBorder = paymentStatus === "Paid" ? "#bbf7d0" : "#fecaca";

    const safeCustomer = customerName.replace(/"/g, "&quot;");
    const safeDateStr  = dateStr.replace(/"/g, "&quot;");
    const safeTotal    = totalAmount.toLocaleString();
    const safeOrderId  = orderIdShort;
    const safeStatus   = paymentStatus;
    const safeDlUrl    = downloadUrl.replace(/"/g, "&quot;");

    const itemRows = orders.map((o, idx) => {
      const name = o.product.name || "-";
      const cat  = o.product.categoryName || "";
      const raw  = o.product.desc || "";
      const desc = raw.length > 60 ? raw.slice(0, 60) + "..." : raw;
      return (
        '<tr class="' + (idx % 2 === 0 ? "r-even" : "r-odd") + '">' +
        '<td class="td-num">' + (idx + 1) + "</td>" +
        '<td class="td-item">' +
          '<span class="i-name">' + name + "</span>" +
          (cat  ? '<span class="i-cat">'  + cat  + "</span>" : "") +
          (desc ? '<span class="i-desc">' + desc + "</span>" : "") +
        "</td>" +
        '<td class="td-c">' + o.quantity + "</td>" +
        '<td class="td-r">&#8358;' + o.price.toLocaleString() + "</td>" +
        '<td class="td-r td-bold">&#8358;' + o.totalPrice.toLocaleString() + "</td>" +
        "</tr>"
      );
    }).join("");

    const payBlock = paymentStatus === "Unpaid"
      ? (
        '<div class="pay-box">' +
        '<div class="pay-title">Payment instructions</div>' +
        '<div class="pay-row"><span class="pay-lbl">Bank</span><span>' + STORE_ACCOUNT.bankName + "</span></div>" +
        '<div class="pay-row"><span class="pay-lbl">Account name</span><span>' + STORE_ACCOUNT.accountName + "</span></div>" +
        '<div class="pay-row"><span class="pay-lbl">Account no.</span><span class="pay-acct">' + STORE_ACCOUNT.accountNumber + "</span></div>" +
        "</div>"
      )
      : "";

    // The entire page is built as a joined array so the string </script>
    // never appears literally in Node.js source, preventing the HTML
    // parser from prematurely ending any inline script block.
    const lines = [];

    lines.push('<!DOCTYPE html>');
    lines.push('<html lang="en">');
    lines.push('<head>');
    lines.push('<meta charset="UTF-8"/>');
    lines.push('<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"/>');
    lines.push('<title>Receipt - MELECH STORE</title>');
    lines.push('<style>');
    lines.push('*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}');
    lines.push('body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#f0f2f5;min-height:100vh;display:flex;flex-direction:column;align-items:center;padding:20px 12px 48px;color:#111827}');
    lines.push('.actions{display:flex;gap:8px;margin-bottom:18px;flex-wrap:wrap;justify-content:center;width:100%;max-width:480px}');
    lines.push('.btn{flex:1;min-width:90px;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:11px 10px;border-radius:10px;font-size:.78rem;font-weight:600;border:none;cursor:pointer;text-decoration:none;letter-spacing:.02em;transition:opacity .15s,transform .1s;white-space:nowrap;-webkit-tap-highlight-color:transparent}');
    lines.push('.btn:disabled{opacity:.55;cursor:not-allowed;transform:none!important}');
    lines.push('.btn:active{transform:scale(.97);opacity:.88}');
    lines.push('.btn-dl{background:#1E3A8A;color:#fff}');
    lines.push('.btn-img{background:#7c3aed;color:#fff}');
    lines.push('.btn-print{background:#fff;color:#374151;border:1.5px solid #e5e7eb}');
    lines.push('.btn-share{background:#16a34a;color:#fff}');
    lines.push('.btn svg{flex-shrink:0}');
    lines.push('.share-wrap{position:relative;flex:1;min-width:90px}');
    lines.push('.share-picker{display:none;position:absolute;bottom:calc(100% + 8px);left:0;right:0;min-width:220px;background:#fff;border:1.5px solid #e5e7eb;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.15);overflow:hidden;z-index:9999}');
    lines.push('.share-opt{display:flex;align-items:center;gap:10px;width:100%;padding:12px 14px;border:none;background:transparent;cursor:pointer;text-align:left;font-family:inherit;transition:background .12s;-webkit-tap-highlight-color:transparent}');
    lines.push('.share-opt:hover,.share-opt:active{background:#f3f4f6}');
    lines.push('.share-opt svg{flex-shrink:0;color:#6b7280}');
    lines.push('.share-opt span{display:flex;flex-direction:column;gap:2px}');
    lines.push('.share-opt strong{font-size:.78rem;color:#111827;font-weight:600}');
    lines.push('.share-opt small{font-size:.68rem;color:#9ca3af;font-weight:400}');
    lines.push('.opt-divider{height:1px;background:#f3f4f6;margin:0 12px}');
    lines.push('.card{background:#fff;width:100%;max-width:480px;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.10)}');
    lines.push('.store-hd{background:#1E3A8A;color:#fff;text-align:center;padding:22px 16px 16px}');
    lines.push('.store-logo{width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.18);display:inline-flex;align-items:center;justify-content:center;font-size:1.1rem;font-weight:700;margin-bottom:8px;letter-spacing:.05em}');
    lines.push('.store-name{font-size:1.1rem;font-weight:700;letter-spacing:.1em}');
    lines.push('.store-sub{font-size:.7rem;opacity:.7;margin-top:3px;letter-spacing:.06em}');
    lines.push('.dash{border:none;border-top:1.5px dashed #e5e7eb;margin:0 16px}');
    lines.push('.meta{padding:14px 18px;display:flex;flex-direction:column;gap:5px}');
    lines.push('.meta-row{display:flex;justify-content:space-between;align-items:baseline;gap:8px;font-size:.78rem;line-height:1.4}');
    lines.push('.meta-lbl{font-weight:600;color:#6b7280;flex-shrink:0}');
    lines.push('.meta-val{color:#111827;text-align:right;word-break:break-all}');
    lines.push('.status-badge{display:inline-block;padding:2px 10px;border-radius:99px;font-size:.72rem;font-weight:700;background:' + statusBg + ';color:' + statusColor + ';border:1px solid ' + statusBorder + '}');
    lines.push('table{width:100%;border-collapse:collapse;font-size:.75rem}');
    lines.push('thead tr{background:#1E3A8A;color:#fff}');
    lines.push('thead th{padding:9px 6px;font-weight:700;font-size:.68rem;letter-spacing:.04em;text-align:left;line-height:1.3}');
    lines.push('thead th small{display:block;font-weight:400;opacity:.65;font-size:.6rem;letter-spacing:0}');
    lines.push('.td-num{text-align:center;color:#9ca3af;font-size:.68rem;padding:8px 4px;width:22px;vertical-align:top}');
    lines.push('.td-item{padding:8px 6px;vertical-align:top;width:42%}');
    lines.push('.td-c{text-align:center;padding:8px 4px;vertical-align:middle;width:14%}');
    lines.push('.td-r{text-align:right;padding:8px 6px;vertical-align:middle;width:20%}');
    lines.push('.td-bold{font-weight:700;color:#111827}');
    lines.push('.r-even{background:#f9fafb}');
    lines.push('.r-odd{background:#fff}');
    lines.push('.i-name{display:block;font-weight:700;font-size:.76rem;color:#1f2937}');
    lines.push('.i-cat{display:block;font-size:.65rem;color:#1E3A8A;font-weight:600;margin-top:2px}');
    lines.push('.i-desc{display:block;font-size:.65rem;color:#6b7280;margin-top:2px}');
    lines.push('.total-bar{display:flex;justify-content:space-between;align-items:center;padding:13px 18px;border-top:2px solid #111827;margin-top:2px}');
    lines.push('.total-lbl{font-size:.85rem;font-weight:700}');
    lines.push('.total-amount{font-size:1.1rem;font-weight:800;color:#1E3A8A}');
    lines.push('.pay-box{margin:0 16px 16px;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:12px 14px;font-size:.75rem}');
    lines.push('.pay-title{font-weight:700;color:#b91c1c;font-size:.74rem;text-align:center;margin-bottom:10px;text-transform:uppercase;letter-spacing:.05em}');
    lines.push('.pay-row{display:flex;justify-content:space-between;gap:8px;padding:3px 0;color:#374151}');
    lines.push('.pay-lbl{font-weight:600;color:#6b7280;flex-shrink:0}');
    lines.push('.pay-acct{font-weight:700;color:#111827;letter-spacing:.04em}');
    lines.push('.footer{text-align:center;padding:12px 16px 18px;font-size:.68rem;color:#9ca3af;line-height:1.7;border-top:1.5px dashed #e5e7eb}');
    lines.push('@media print{body{background:#fff;padding:0}.actions{display:none!important}.card{box-shadow:none;border-radius:0;max-width:100%}}');
    lines.push('@media(min-width:600px){body{padding:32px 24px 64px}.btn{font-size:.84rem}table{font-size:.8rem}}');
    lines.push('</style>');
    lines.push('</head>');
    lines.push('<body>');

    // ── ACTION BAR ──────────────────────────────────────────────────────────
    lines.push('<div class="actions" id="actionBar">');

    // 1. Download PDF
    lines.push('<a class="btn btn-dl" id="btnPdf" href="' + safeDlUrl + '" download="receipt-' + safeOrderId + '.pdf">');
    lines.push('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>');
    lines.push('PDF</a>');

    // 2. Save Image
    lines.push('<button class="btn btn-img" id="btnSaveImg">');
    lines.push('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>');
    lines.push('Save image</button>');

    // 3. Print
    lines.push('<button class="btn btn-print" id="btnPrint">');
    lines.push('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>');
    lines.push('Print</button>');

    // 4. Share + picker
    lines.push('<div class="share-wrap">');
    lines.push('<button class="btn btn-share" id="btnShare" style="width:100%">');
    lines.push('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>');
    lines.push('Share &#9662;</button>');
    lines.push('<div class="share-picker" id="sharePicker">');
    // Option A — image
    lines.push('<button class="share-opt" id="btnShareImg">');
    lines.push('<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>');
    lines.push('<span><strong>Share as Image</strong><small>PNG &middot; Best for WhatsApp &amp; Facebook</small></span>');
    lines.push('</button>');
    lines.push('<div class="opt-divider"></div>');
    // Option B — pdf
    lines.push('<button class="share-opt" id="btnSharePdf">');
    lines.push('<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>');
    lines.push('<span><strong>Share as PDF</strong><small>Full document &middot; Best for email &amp; print</small></span>');
    lines.push('</button>');
    lines.push('</div>'); // end share-picker
    lines.push('</div>'); // end share-wrap

    lines.push('</div>'); // end .actions

    // ── RECEIPT CARD ────────────────────────────────────────────────────────
    lines.push('<div class="card" id="receipt">');
    lines.push('<div class="store-hd">');
    lines.push('<div class="store-logo">MS</div>');
    lines.push('<div class="store-name">MELECH STORE</div>');
    lines.push('<div class="store-sub">Official Sales Receipt</div>');
    lines.push('</div>');
    lines.push('<hr class="dash"/>');
    lines.push('<div class="meta">');
    lines.push('<div class="meta-row"><span class="meta-lbl">Order ID</span><span class="meta-val">#' + safeOrderId + '</span></div>');
    lines.push('<div class="meta-row"><span class="meta-lbl">Date</span><span class="meta-val">' + dateStr + '</span></div>');
    lines.push('<div class="meta-row"><span class="meta-lbl">Customer</span><span class="meta-val">' + customerName + '</span></div>');
    lines.push('<div class="meta-row"><span class="meta-lbl">Payment method</span><span class="meta-val">' + paymentMethod + '</span></div>');
    lines.push('<div class="meta-row"><span class="meta-lbl">Status</span><span class="meta-val"><span class="status-badge">' + paymentStatus + '</span></span></div>');
    lines.push('</div>');
    lines.push('<hr class="dash"/>');
    lines.push('<table>');
    lines.push('<thead><tr>');
    lines.push('<th style="width:22px;text-align:center">#</th>');
    lines.push('<th>Item <small>Name / desc / category</small></th>');
    lines.push('<th style="text-align:center">Qty</th>');
    lines.push('<th style="text-align:right">Unit <small>price</small></th>');
    lines.push('<th style="text-align:right">Subtotal <small>Qty x price</small></th>');
    lines.push('</tr></thead>');
    lines.push('<tbody>' + itemRows + '</tbody>');
    lines.push('</table>');
    lines.push('<div class="total-bar">');
    lines.push('<span class="total-lbl">Total &nbsp;<span style="font-weight:400;font-size:.78rem;color:#6b7280">(' + orders.length + ' item' + (orders.length > 1 ? 's' : '') + ')</span></span>');
    lines.push('<span class="total-amount">&#8358;' + totalAmount.toLocaleString() + '</span>');
    lines.push('</div>');
    lines.push('<hr class="dash"/>');
    lines.push(payBlock);
    lines.push('<div class="footer">Thank you for shopping with MELECH STORE<br/>No signature required &middot; Auto-generated receipt</div>');
    lines.push('</div>'); // end #receipt

    // ── INLINE SCRIPT ───────────────────────────────────────────────────────
    // All logic is inside window.initReceipt() which is called by the
    // html2canvas <script> onload callback below. This guarantees
    // html2canvas is always available before any button is clicked.
    lines.push('<' + 'script>');
    lines.push('window.RECEIPT_DATA = {');
    lines.push('  orderId:  "' + safeOrderId  + '",');
    lines.push('  dateStr:  "' + safeDateStr  + '",');
    lines.push('  customer: "' + safeCustomer + '",');
    lines.push('  total:    "' + safeTotal    + '",');
    lines.push('  status:   "' + safeStatus   + '",');
    lines.push('  dlUrl:    "' + safeDlUrl    + '"');
    lines.push('};');
    lines.push('');
    lines.push('window.initReceipt = function () {');
    lines.push('  var D         = window.RECEIPT_DATA;');
    lines.push('  var actionBar = document.getElementById("actionBar");');
    lines.push('  var btnShare  = document.getElementById("btnShare");');
    lines.push('  var picker    = document.getElementById("sharePicker");');
    lines.push('  var origShare = btnShare.innerHTML;');
    lines.push('');
    // Print button
    lines.push('  document.getElementById("btnPrint").addEventListener("click", function () {');
    lines.push('    window.print();');
    lines.push('  });');
    lines.push('');
    // Feedback helper
    lines.push('  function feedback(btn, html, bg, ms) {');
    lines.push('    var oh = btn.innerHTML; var ob = btn.style.background;');
    lines.push('    btn.innerHTML = html; btn.style.background = bg; btn.disabled = true;');
    lines.push('    setTimeout(function(){ btn.innerHTML=oh; btn.style.background=ob; btn.disabled=false; }, ms);');
    lines.push('  }');
    lines.push('');
    // Download blob helper
    lines.push('  function dlBlob(blob, name) {');
    lines.push('    var u = URL.createObjectURL(blob);');
    lines.push('    var a = document.createElement("a");');
    lines.push('    a.href=u; a.download=name;');
    lines.push('    document.body.appendChild(a); a.click();');
    lines.push('    document.body.removeChild(a); URL.revokeObjectURL(u);');
    lines.push('  }');
    lines.push('');
    // Capture receipt as PNG blob
    lines.push('  function capture() {');
    lines.push('    actionBar.style.display = "none";');
    lines.push('    return window.html2canvas(document.getElementById("receipt"), {');
    lines.push('      scale:2, useCORS:true, backgroundColor:"#ffffff", logging:false');
    lines.push('    }).then(function(canvas){');
    lines.push('      actionBar.style.display = "";');
    lines.push('      return new Promise(function(res){');
    lines.push('        canvas.toBlob(function(blob){ res(blob); }, "image/png", 1.0);');
    lines.push('      });');
    lines.push('    }).catch(function(e){ actionBar.style.display=""; throw e; });');
    lines.push('  }');
    lines.push('');
    // Save Image button
    lines.push('  document.getElementById("btnSaveImg").addEventListener("click", function(){');
    lines.push('    var btn=this; btn.disabled=true; btn.innerHTML="Generating...";');
    lines.push('    capture().then(function(blob){');
    lines.push('      dlBlob(blob, "receipt-"+D.orderId+".png");');
    lines.push('      feedback(btn, "Saved!", "#0f766e", 2500);');
    lines.push('    }).catch(function(){');
    lines.push('      btn.disabled=false; btn.innerHTML="Save image";');
    lines.push('      alert("Could not generate image. Please try again.");');
    lines.push('    });');
    lines.push('  });');
    lines.push('');
    // Share button toggles picker
    lines.push('  btnShare.addEventListener("click", function(e){');
    lines.push('    e.stopPropagation();');
    lines.push('    picker.style.display = picker.style.display === "block" ? "none" : "block";');
    lines.push('  });');
    lines.push('  picker.addEventListener("click", function(e){ e.stopPropagation(); });');
    lines.push('  document.addEventListener("click", function(){ picker.style.display="none"; });');
    lines.push('');
    // Share as Image
    lines.push('  document.getElementById("btnShareImg").addEventListener("click", function(){');
    lines.push('    picker.style.display="none";');
    lines.push('    btnShare.disabled=true; btnShare.innerHTML="Preparing...";');
    lines.push('    capture().then(function(blob){');
    lines.push('      var file=new File([blob],"receipt-"+D.orderId+".png",{type:"image/png"});');
    lines.push('      if(navigator.share && navigator.canShare && navigator.canShare({files:[file]})){');
    lines.push('        return navigator.share({');
    lines.push('          files:[file],');
    lines.push('          title:"MELECH STORE Receipt #"+D.orderId,');
    lines.push('          text:"Receipt from MELECH STORE\\nOrder: #"+D.orderId+"\\nDate: "+D.dateStr+"\\nCustomer: "+D.customer+"\\nTotal: N"+D.total+"\\nStatus: "+D.status');
    lines.push('        }).then(function(){ btnShare.disabled=false; btnShare.innerHTML=origShare; })');
    lines.push('         .catch(function(err){');
    lines.push('           btnShare.disabled=false; btnShare.innerHTML=origShare;');
    lines.push('           if(err.name!=="AbortError"){ dlBlob(blob,"receipt-"+D.orderId+".png"); alert("Share failed. Image downloaded - attach it manually."); }');
    lines.push('         });');
    lines.push('      }');
    lines.push('      dlBlob(blob,"receipt-"+D.orderId+".png");');
    lines.push('      feedback(btnShare,"Image saved - attach in WhatsApp","#0f766e",3000);');
    lines.push('    }).catch(function(){ btnShare.disabled=false; btnShare.innerHTML=origShare; alert("Could not prepare image."); });');
    lines.push('  });');
    lines.push('');
    // Share as PDF
    lines.push('  document.getElementById("btnSharePdf").addEventListener("click", function(){');
    lines.push('    picker.style.display="none";');
    lines.push('    btnShare.disabled=true; btnShare.innerHTML="Fetching PDF...";');
    lines.push('    fetch(D.dlUrl)');
    lines.push('      .then(function(r){ if(!r.ok) throw new Error("fetch failed"); return r.blob(); })');
    lines.push('      .then(function(blob){');
    lines.push('        var file=new File([blob],"receipt-"+D.orderId+".pdf",{type:"application/pdf"});');
    lines.push('        if(navigator.share && navigator.canShare && navigator.canShare({files:[file]})){');
    lines.push('          return navigator.share({');
    lines.push('            files:[file],');
    lines.push('            title:"MELECH STORE Receipt #"+D.orderId,');
    lines.push('            text:"Receipt from MELECH STORE\\nOrder: #"+D.orderId+"\\nTotal: N"+D.total');
    lines.push('          }).then(function(){ btnShare.disabled=false; btnShare.innerHTML=origShare; })');
    lines.push('           .catch(function(err){');
    lines.push('             btnShare.disabled=false; btnShare.innerHTML=origShare;');
    lines.push('             if(err.name!=="AbortError"){ dlBlob(blob,"receipt-"+D.orderId+".pdf"); alert("Share failed. PDF downloaded - attach manually."); }');
    lines.push('           });');
    lines.push('        }');
    lines.push('        dlBlob(blob,"receipt-"+D.orderId+".pdf");');
    lines.push('        feedback(btnShare,"PDF saved - attach manually","#1E3A8A",3000);');
    lines.push('      })');
    lines.push('      .catch(function(){ btnShare.disabled=false; btnShare.innerHTML=origShare; alert("Could not fetch PDF. Try the Download PDF button."); });');
    lines.push('  });');
    lines.push('');
    lines.push('}'); // end window.initReceipt
    lines.push('<' + '/script>');

    // html2canvas loaded LAST. Its onload calls window.initReceipt()
    // so all button handlers are guaranteed to attach only after
    // html2canvas is fully available.
    lines.push('<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js" onload="window.initReceipt()" onerror="window.initReceipt()" crossorigin="anonymous"><' + '/script>');

    lines.push('</body>');
    lines.push('</html>');

    res.setHeader("Content-Type", "text/html");
    return res.send(lines.join("\n"));

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