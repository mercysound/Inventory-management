import PDFDocument from "pdfkit";
import OrderModel from "../models/OrderModel.js";
import ProductModel from "../models/ProductModel.js";
import AllOrdersPlacedModel from "../models/AllOrdersPlacedModel.js";
import CompletedOrderHistoryModel from "../models/CompletedOrderHistoryModel.js";
import SettingsModel from "../models/SettingsModel.js";
import { sendAdminOrderPlacedEmail } from "../utils/email/adminOrderPlaced.js";
import { sendResponse, sendError } from "../utils/apiResponse.js";
import { getPaginationParams, getPaginationMeta } from "../utils/pagination.js";
import { getAdminEmail } from "../controllers/settingsController.js";
import mongoose from "mongoose";

// ── Helper: fetch live bank/payment details from settings ─────────────────────
// Falls back to empty strings — if admin hasn't filled them in, the payment
// section simply shows nothing on the invoice.
const getBankDetails = async () => {
  try {
    const s = await SettingsModel.findOne({}).sort({ createdAt: 1 })
      .select("bankName accountName accountNumber bankName2 accountName2 accountNumber2 storeName");
    return {
      storeName:      s?.storeName      || "MELECH STORE",
      bankName:       s?.bankName       || "",
      accountName:    s?.accountName    || "",
      accountNumber:  s?.accountNumber  || "",
      bankName2:      s?.bankName2      || "",
      accountName2:   s?.accountName2   || "",
      accountNumber2: s?.accountNumber2 || "",
    };
  } catch {
    return { storeName: "MELECH STORE", bankName: "", accountName: "", accountNumber: "", bankName2: "", accountName2: "", accountNumber2: "" };
  }
};


/**
 * addOrder - add a single product to current user's cart (order)
 */
const addOrder = async (req, res) => {
  try {
    const { productId, quantity, total, price, priceMode, isWholesale } = req.body;
    const userId = req.user._id;
    const userRole = req.user.role;

    const product = await ProductModel.findById(productId);
    if (!product) return sendError(res, 404, "Product not found in order");
    if (quantity > product.stock) return sendError(res, 400, "Not enough stock");

    const ONE_HOUR = new Date(Date.now() + 60 * 60 * 1000);

    // Wholesale-role users always get wholesale pricing
    const forceWholesale = userRole === "wholesale";
    const requestedMode = ["retail", "wholesale"].includes(priceMode) ? priceMode : (isWholesale ? "wholesale" : "retail");
    const finalPriceMode = forceWholesale ? "wholesale" : requestedMode;

    const unitPrice = finalPriceMode === "wholesale"
      ? (product.wholesalePrice ?? product.price)
      : product.price;

    // ── Atomic upsert: findOneAndUpdate with upsert:true prevents duplicate
    // documents when the user taps + rapidly (two concurrent requests both
    // see no existing doc and try to create one — classic race condition).
    const order = await OrderModel.findOneAndUpdate(
      { userOrdering: userId, product: productId },
      {
        $inc: { quantity: quantity },
        $set: {
          price:         unitPrice,
          priceMode:     finalPriceMode,
          cartExpiresAt: ONE_HOUR,
          paymentStatus: "Unpaid",
          paid:          false,
        },
        $setOnInsert: {
          userOrdering: userId,
          product:      productId,
          totalPrice:   quantity * unitPrice,
          orderDate:    new Date(),
        },
      },
      { new: true, upsert: true, runValidators: false }
    );

    // Recalculate totalPrice based on final quantity (after increment)
    order.totalPrice = order.quantity * order.price;
    await order.save();

    // Validate final quantity against stock
    if (order.quantity > product.stock) {
      // Rollback the increment
      await OrderModel.findByIdAndUpdate(order._id, {
        $inc: { quantity: -quantity },
        $set: { totalPrice: (order.quantity - quantity) * order.price },
      });
      return sendError(res, 400, "Not enough stock available");
    }

    return sendResponse(res, 200, order, "Order added successfully");
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
    const userId    = req.user._id;
    const { productId } = req.params;
    const order = await OrderModel.findOne({ userOrdering: userId, product: productId });
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
    const { quantity, total, price, priceMode } = req.body;

    const order = await OrderModel.findById(orderId).populate("product");
    if (!order) return sendError(res, 404, "Order not found");
    if (String(order.userOrdering) !== String(req.user._id)) return sendError(res, 403, "Unauthorized");

    const qty = Number(quantity);
    if (!qty || qty < 1) return sendError(res, 400, "Quantity must be at least 1");

    const product = await ProductModel.findById(order.product._id);
    if (!product) return sendError(res, 404, "Product not found");
    if (qty > product.stock) return sendError(res, 400, "Not enough stock available");

    const finalPriceMode = ["retail", "wholesale"].includes(priceMode) ? priceMode : order.priceMode || "retail";
    // Wholesale-role users always stay on wholesale pricing
    const enforcedPriceMode = req.user.role === "wholesale" ? "wholesale" : finalPriceMode;
    const unitPrice = enforcedPriceMode === "wholesale"
      ? (product.wholesalePrice ?? product.price)
      : product.price;

    order.quantity      = qty;
    order.price         = unitPrice;
    order.priceMode     = enforcedPriceMode;
    order.totalPrice    = total || unitPrice * qty;
    order.cartExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
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
    if (["staff", "customer", "wholesale"].includes(req.user.role)) {
      query = { userOrdering: userId };
    }

    const { skip, limit, page, sort } = getPaginationParams(req);
    const total  = await OrderModel.countDocuments(query);
    const orders = await OrderModel.find(query)
      .populate({
        path:   "product",
        select: "name description price wholesalePrice image categoryId",
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
      priceMode:        o.priceMode || 'retail',
      userOrdering:     o.userOrdering,
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

    // Reject suspended accounts at the pre-payment gate — before Paystack opens.
    // This is the cleanest point to catch suspension: no money has changed hands yet.
    if (req.user.isActive === false) {
      return sendError(res, 403,
        "Your account has been temporarily suspended and cannot process payments. Please contact support."
      );
    }

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

/**
 * completeOrder - saves payment and summary, marks paymentStatus as Paid.
 * For Paystack payments, accepts paystackReference so we can refund automatically
 * if stock fails AFTER payment has been charged.
 */
const completeOrder = async (req, res) => {
  const {
    paymentMethod, buyerName, paystackReference, isWholesale,
    fulfillmentType, deliveryAddress, deliveryRecipientName, deliveryPhone,
  } = req.body;
  const userId = req.user._id;
  const role   = req.user.role;

  if (!paymentMethod) return sendError(res, 400, "Payment method is required");

  // ── Server-side validation of fulfillment fields ──────────────────────────
  // Only customer and wholesale roles place online orders with fulfillment choice.
  // Staff walk-in sales always go direct to history and never have fulfillment.
  const isOnlineOrder = role === "customer" || role === "wholesale";

  if (isOnlineOrder) {
    const fType = fulfillmentType === "delivery" ? "delivery" : "pickup";

    if (fType === "delivery") {
      // Sanitise and validate delivery fields — never trust client input
      const cleanAddress   = typeof deliveryAddress   === "string" ? deliveryAddress.trim()   : "";
      const cleanRecipient = typeof deliveryRecipientName === "string" ? deliveryRecipientName.trim() : "";
      const cleanPhone     = typeof deliveryPhone     === "string" ? deliveryPhone.trim()     : "";

      if (!cleanAddress)   return sendError(res, 400, "Delivery address is required for delivery orders");
      if (!cleanRecipient) return sendError(res, 400, "Recipient name is required for delivery orders");
      if (!cleanPhone)     return sendError(res, 400, "Recipient phone number is required for delivery orders");
      // Basic phone validation — must be at least 7 digits
      if (!/^\+?[\d\s\-()]{7,20}$/.test(cleanPhone)) {
        return sendError(res, 400, "Please enter a valid phone number for delivery");
      }
    }
  }

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
    // Build product snapshot list — ensure we persist product name/description/category
    const productList = [];
    for (const o of orders) {
      const productRef = o.product && typeof o.product === "object" && o.product._id
        ? o.product._id
        : o.product;

      let name = o.product && typeof o.product === "object" ? o.product.name || "" : "";
      let description = o.product && typeof o.product === "object" ? o.product.description || "" : "";
      let categoryName = o.product && typeof o.product === "object" ? o.product.categoryId?.name || "" : "";

      if ((!name || !description || !categoryName) && mongoose.Types.ObjectId.isValid(productRef)) {
        try {
          const p = await ProductModel.findById(productRef).select("name description categoryId").lean();
          if (p) {
            name = name || p.name || "";
            description = description || p.description || "";
            categoryName = categoryName || p.categoryId?.name || "";
          }
        } catch (e) {
          // ignore lookup failure — we'll fall back to stored fields below
        }
      }

      productList.push({
        productId:          productRef,
        productName:        name || o.productName || "Unknown Product",
        productDescription: description || o.productDescription || "",
        categoryName:       categoryName || o.categoryName || "",
        quantity:           o.quantity,
        price:              o.price,
        totalPrice:         o.quantity * o.price,
        priceMode:          o.priceMode,
      });
    }

    let placed;

    // ── customer OR wholesale → placed orders (admin manages delivery) ────
    if (role === "customer" || role === "wholesale") {
      const fType        = fulfillmentType === "delivery" ? "delivery" : "pickup";
      const cleanAddress   = fType === "delivery" ? String(deliveryAddress || "").trim() : null;
      const cleanRecipient = fType === "delivery" ? String(deliveryRecipientName || "").trim() : null;
      const cleanPhone     = fType === "delivery" ? String(deliveryPhone || "").trim() : null;

      placed = await AllOrdersPlacedModel.create([{
        userOrdering:  userId,
        buyerName:     buyerName || (role === "wholesale" ? "Wholesale Customer" : "Customer"),
        paymentMethod,
        totalPrice,
        allQuantity,
        productList,
        paid:           true,
        deliveryStatus: "pending",
        fulfillmentType:       fType,
        deliveryAddress:       cleanAddress,
        deliveryRecipientName: cleanRecipient,
        deliveryPhone:         cleanPhone,
      }], { session });

      // Notify admin of new order — fire-and-forget (after transaction commits)
      setImmediate(async () => {
        try {
          const adminEmail = await getAdminEmail();
          if (adminEmail) {
            await sendAdminOrderPlacedEmail({
              adminEmail,
              buyerName: buyerName || (role === "wholesale" ? "Wholesale Customer" : "Customer"),
              totalPrice,
              orderId:         placed[0]._id,
              role,
              fulfillmentType: placed[0].fulfillmentType,
              deliveryAddress: placed[0].deliveryAddress,
              deliveryRecipientName: placed[0].deliveryRecipientName,
              deliveryPhone:   placed[0].deliveryPhone,
            });
          }
        } catch (e) {
          console.error("Admin order email failed:", e.message);
        }
      });


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


/* generateInvoice - produce a PDF invoice for current user's active orders. */
const escapeHtml = (value) => {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

const generateInvoice = async (req, res) => {
  try {
    // Fetch live bank/payment details from settings — used in HTML + PDF
    const bank = await getBankDetails();

    const {
      customerName = "Guest Customer",
      paymentMethod = "Not Specified",
      mode = "preview",
      orderSource = "online",
      orderId,
      historyReceipt,
    } = req.query;

    const safeCustomerName = escapeHtml(customerName);
    const safePaymentMethod = escapeHtml(paymentMethod);
    const safeOrderSource = escapeHtml(orderSource);

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
        quantity:  o.quantity,
        price:     o.price,
        totalPrice: o.quantity * o.price,
        priceMode: o.priceMode || "retail",  // ← needed for roleBadge in preview
      }));
    }

    /* ======================================================
       2  FINAL -> FROM HISTORY MODEL
    ====================================================== */
    if (mode === "final") {
      const normalizedSource = String(orderSource || "").toLowerCase();
      const query = orderId ? { _id: orderId } : { userOrdering: req.user._id };
      const populateOpts = {
        path: "productList.productId",
        select: "name description categoryId",
        populate: { path: "categoryId", select: "name" },
      };

      const tryFindOrder = async (Model) => Model
        .findOne(query)
        .populate("userOrdering", "name role email")
        .populate(populateOpts)
        .sort({ createdAt: -1 });

      let order = null;
      if (normalizedSource === "staff") {
        order = await tryFindOrder(CompletedOrderHistoryModel);
      } else if (normalizedSource === "online") {
        order = await tryFindOrder(AllOrdersPlacedModel);
      } else if (historyReceipt) {
        order = await tryFindOrder(CompletedOrderHistoryModel);
      } else {
        order = await tryFindOrder(AllOrdersPlacedModel);
      }

      if (!order && orderId) {
        order = await tryFindOrder(CompletedOrderHistoryModel);
      }
      if (!order) {
        order = await tryFindOrder(AllOrdersPlacedModel);
      }

      if (!order) return res.status(404).json({ message: "Order not found" });

      receiptOrderId = order._id;

      // ── Override name + payment from the actual order document ────────────
      // Query params customerName / paymentMethod are only reliable for brand-new
      // receipts generated immediately after checkout (where we pass them directly).
      // For history receipts, always use the stored values so they are never blank.
      const resolvedCustomerName  = order.buyerName
        || order.userOrdering?.name
        || (safeCustomerName !== "Guest Customer" ? safeCustomerName : null)
        || "Customer";
      const resolvedPaymentMethod = order.paymentMethod
        || (safePaymentMethod !== "Not Specified" ? safePaymentMethod : null)
        || "Not Specified";

      // Determine buyer role badge (WS / RT) and price mode
      const buyerRole   = order.userOrdering?.role || null;
      const isCancelled = order.cancelled === true;
      const cancelledAt = order.cancelledAt ? new Date(order.cancelledAt) : null;
      const refundMade  = order.refundMade  === true;

      // For delegated-staff orders, include the staff info
      const changedByName = order.changedByName || null;
      const changedById   = order.changedBy ? String(order.changedBy).slice(-8).toUpperCase() : null;
      const isDelegated   = order.isDelegatedAction === true;

      orders = order.productList.map((i) => ({
        product: {
          name: i.productName || i.productId?.name || i.productDescription || i.categoryName || "Unknown Product",
          desc: i.productDescription || (i.categoryName ? `Category: ${i.categoryName}` : "") || i.productId?.description || "",
          categoryName: i.categoryName || i.productId?.categoryId?.name || "",
        },
        quantity:   i.quantity,
        price:      i.price,
        totalPrice: i.totalPrice,
        priceMode:  i.priceMode,
      }));

      // Expose resolved values for the render sections below
      Object.assign(req, {
        _resolvedCustomerName:  resolvedCustomerName,
        _resolvedPaymentMethod: resolvedPaymentMethod,
        _buyerRole:   buyerRole,
        _isCancelled: isCancelled,
        _cancelledAt: cancelledAt,
        _refundMade:  refundMade,
        _changedByName: changedByName,
        _changedById:   changedById,
        _isDelegated:   isDelegated,
        _orderCreatedAt: order.createdAt,
        // Fulfillment fields
        _fulfillmentType:         order.fulfillmentType         || "pickup",
        _deliveryAddress:         order.deliveryAddress         || null,
        _deliveryRecipientName:   order.deliveryRecipientName   || null,
        _deliveryPhone:           order.deliveryPhone           || null,
      });
    }

    if (!orders.length)
      return res.status(404).json({ message: "No orders found" });

    /* ======================================================
       3  RESOLVE FINAL DISPLAY VALUES
          For preview mode: use query-param values (user just typed them).
          For final/history mode: use the stored order values resolved above.
    ====================================================== */
    const displayName    = req._resolvedCustomerName  || safeCustomerName;
    const displayPayment = req._resolvedPaymentMethod || safePaymentMethod;
    const buyerRole      = req._buyerRole   || null;
    const isCancelled    = req._isCancelled || false;
    const cancelledAt    = req._cancelledAt || null;
    const refundMade     = req._refundMade  || false;
    const changedByName  = req._changedByName || null;
    const changedById    = req._changedById   || null;
    const isDelegated    = req._isDelegated   || false;
    const orderCreatedAt = req._orderCreatedAt || null;
    // Fulfillment display values
    const fulfillmentType       = req._fulfillmentType       || "pickup";
    const deliveryAddress       = req._deliveryAddress       || null;
    const deliveryRecipientName = req._deliveryRecipientName || null;
    const deliveryPhone         = req._deliveryPhone         || null;
    const isDelivery            = fulfillmentType === "delivery";

    // Role badge label: WS for wholesale, RT for retail customer, Staff for staff
    // For walk-in (staff) orders, determine from first product's priceMode
    const firstPriceMode = orders[0]?.priceMode || "retail";
    let roleBadge = "";
    if (buyerRole === "wholesale") roleBadge = "WS";
    else if (buyerRole === "customer") roleBadge = "RT";
    else if (buyerRole === "staff") roleBadge = firstPriceMode === "wholesale" ? "WS" : "RT";
    // For preview mode — infer from logged-in user's role
    else if (mode === "preview") {
      if (req.user?.role === "wholesale") roleBadge = "WS";
      else if (req.user?.role === "customer") roleBadge = "RT";
      else if (req.user?.role === "staff") roleBadge = firstPriceMode === "wholesale" ? "WS" : "RT";
    }
    const totalAmount  = orders.reduce((sum, o) => sum + o.totalPrice, 0);
    const orderIdShort = receiptOrderId
      ? String(receiptOrderId).slice(-10).toUpperCase()
      : "N/A";
    const dateStr = orderCreatedAt
      ? new Date(orderCreatedAt).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })
      : new Date().toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });

    /* ======================================================
       4  RAW PDF DOWNLOAD - only when ?download=true
          React modal Download button hits this with ?download=true
    ====================================================== */
    const wantRaw = req.query.download === "true";

    if (wantRaw) {
      const receiptWidth = 300;
      const margin       = 20;
      const contentWidth = receiptWidth - margin * 2;
      const doc          = new PDFDocument({ margin, size: [receiptWidth, 800] });
      const chunks       = [];
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
          ["Customer:", displayName],
          ["Payment:", displayPayment],
          ["Status:", isCancelled ? "CANCELLED" : paymentStatus],
          ...(roleBadge ? [["PT:", roleBadge === "WS" ? "WSP" : "RTP"]] : []),
          ...(buyerRole === "staff" && changedByName ? [["Staff:", changedByName + (changedById ? "  #" + changedById : "")]] : []),
          ...(buyerRole === "staff" && !changedByName && req.user?.role === "staff" ? [["Staff:", (req.user.name || "Staff") + "  #" + String(req.user._id).slice(-8).toUpperCase()]] : []),
        ].forEach(([label, value]) => {
          const ly = doc.y;
          doc.font("Helvetica-Bold").text(label, margin, ly, { continued: false, width: 70 });
          doc.font("Helvetica").text(value, margin + 72, ly, { width: contentWidth - 72 });
          doc.moveDown(0.3);
        });

        // ── Cancellation block (PDF) ────────────────────────────────────────
        if (isCancelled) {
          divider();
          doc.moveDown(0.5);
          doc.fontSize(7.5).font("Helvetica-Bold").fillColor("#b91c1c")
            .text("ORDER CANCELLED", margin, doc.y, { align: "center", width: contentWidth });
          doc.font("Helvetica").fontSize(7).fillColor("#374151").moveDown(0.3);
          if (cancelledAt) {
            const cly = doc.y;
            doc.font("Helvetica-Bold").text("Cancelled on:", margin, cly, { width: 75 });
            doc.font("Helvetica").text(new Date(cancelledAt).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" }), margin + 77, cly, { width: contentWidth - 77 });
            doc.moveDown(0.3);
          }
          if (refundMade) {
            doc.font("Helvetica-Bold").fillColor("#7c3aed").text("Refund: Completed", margin, doc.y, { width: contentWidth });
          } else {
            doc.font("Helvetica-Bold").fillColor("#b91c1c").text("Refund: Pending — contact store", margin, doc.y, { width: contentWidth });
          }
          doc.fillColor("#000").moveDown(0.3);
        }

        // ── Delivery block (PDF) ────────────────────────────────────────────
        if (isDelivery) {
          divider();
          doc.moveDown(0.5);
          doc.fontSize(7.5).font("Helvetica-Bold").fillColor("#92400e")
            .text("🚚 DELIVERY ORDER", margin, doc.y, { align: "center", width: contentWidth });
          doc.font("Helvetica").fontSize(7).fillColor("#374151").moveDown(0.3);
          if (deliveryRecipientName) {
            const ly = doc.y;
            doc.font("Helvetica-Bold").text("Recipient:", margin, ly, { width: 70 });
            doc.font("Helvetica").text(deliveryRecipientName, margin + 72, ly, { width: contentWidth - 72 });
            doc.moveDown(0.3);
          }
          if (deliveryPhone) {
            const ly = doc.y;
            doc.font("Helvetica-Bold").text("Phone:", margin, ly, { width: 70 });
            doc.font("Helvetica").text(deliveryPhone, margin + 72, ly, { width: contentWidth - 72 });
            doc.moveDown(0.3);
          }
          if (deliveryAddress) {
            const ly = doc.y;
            doc.font("Helvetica-Bold").text("Address:", margin, ly, { width: 70 });
            doc.font("Helvetica").text(deliveryAddress, margin + 72, ly, { width: contentWidth - 72 });
            doc.moveDown(0.3);
          }
          doc.fontSize(6.5).font("Helvetica").fillColor("#92400e")
            .text("Transport fare is separate — our team will contact you to arrange delivery cost.", margin, doc.y, { width: contentWidth });
          doc.fillColor("#000").moveDown(0.3);
        }

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
          .text("Name / Cat. / Desc", col.name,  hy + 13, { width: 82 })
          .text("Price",              col.price, hy + 13, { width: 52 })
          .text("(Qty x Price)",      col.total, hy + 13, { width: 52 });

        doc.fillColor("#000").font("Helvetica").fontSize(7.5);
        let y = doc.y + 4;

        orders.forEach((o, idx) => {
          const rawName = o.product?.name || o.productName || o.product?.desc || o.productDescription || o.product?.categoryName || o.categoryName || "Unknown item";
          const name = escapeHtml(rawName);
          const cat  = o.product?.categoryName || o.categoryName ? "[" + escapeHtml(o.product?.categoryName || o.categoryName) + "]" : "";
          const raw  = escapeHtml(o.product?.desc || o.productDescription || (o.product?.categoryName || o.categoryName ? `Category: ${o.product?.categoryName || o.categoryName}` : ""));
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

        if (paymentStatus === "Unpaid" && req.user.role === "staff") {
          divider();
          doc.moveDown(0.5);
          doc.fontSize(7.5).font("Helvetica-Bold").fillColor("#b91c1c")
            .text("PAYMENT INSTRUCTIONS", margin, doc.y, {
              align: "center", width: contentWidth });
          doc.font("Helvetica").fillColor("#000").moveDown(0.3);

          const pdfAccounts = [];
          if (bank.bankName || bank.accountName || bank.accountNumber) {
            pdfAccounts.push([
              ["Bank:", bank.bankName],
              ["Account Name:", bank.accountName],
              ["Account No:", bank.accountNumber],
            ]);
          }
          if (bank.bankName2 || bank.accountName2 || bank.accountNumber2) {
            pdfAccounts.push([
              ["Bank:", bank.bankName2],
              ["Account Name:", bank.accountName2],
              ["Account No:", bank.accountNumber2],
            ]);
          }

          pdfAccounts.forEach((rows, ai) => {
            if (ai > 0) {
              doc.moveDown(0.4);
              doc.fontSize(7).font("Helvetica-Bold").fillColor("#555")
                .text("— OR —", margin, doc.y, { align: "center", width: contentWidth });
              doc.moveDown(0.3);
            }
            rows.forEach(([label, value]) => {
              if (!value) return;
              const ly = doc.y;
              doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#000").text(label, margin, ly, { width: 75 });
              doc.font("Helvetica").text(value, margin + 77, ly, { width: contentWidth - 77 });
              doc.moveDown(0.3);
            });
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
       5  HTML RECEIPT - pure display, no scripts at all.
          CSP blocks inline scripts and external CDNs inside
          the iframe, so we serve clean HTML only.
          All action buttons (Download, Print) live in the
          React ReceiptModal component outside the iframe.
    ====================================================== */

    const statusColor  = (isCancelled) ? "#b91c1c" : (paymentStatus === "Paid" ? "#15803d" : "#b91c1c");
    const statusBg     = (isCancelled) ? "#fef2f2" : (paymentStatus === "Paid" ? "#f0fdf4" : "#fef2f2");
    const statusBorder = (isCancelled) ? "#fecaca" : (paymentStatus === "Paid" ? "#bbf7d0" : "#fecaca");
    const statusLabel  = isCancelled ? "CANCELLED" : paymentStatus;

    const itemRows = orders.map((o, idx) => {
      const rawName = o.product.name || o.product.desc || o.product.categoryName || "Unknown item";
      const name = escapeHtml(rawName);
      const cat = escapeHtml(o.product.categoryName || "");
      const rawDesc = escapeHtml(o.product.desc || (o.product.categoryName ? `Category: ${o.product.categoryName}` : ""));
      const desc = rawDesc.length > 60 ? rawDesc.slice(0, 60) + "..." : rawDesc;
      return (
        '<tr class="' + (idx % 2 === 0 ? "r-even" : "r-odd") + '">' +
        '<td class="td-num">' + (idx + 1) + "</td>" +
        '<td class="td-item">' +
          '<span class="i-name">' + name + "</span>" +
          (cat ? '<span class="i-cat">' + cat + "</span>" : "") +
          (desc ? '<span class="i-desc">' + desc + "</span>" : "") +
        "</td>" +
        '<td class="td-c">' + o.quantity + "</td>" +
        '<td class="td-r">&#8358;' + o.price.toLocaleString() + "</td>" +
        '<td class="td-r td-bold">&#8358;' + o.totalPrice.toLocaleString() + "</td>" +
        "</tr>"
      );
    }).join("");

    // Build HTML payment block dynamically from settings
    const htmlPayRows = (name, number, bankN) => {
      const rows = [];
      if (bankN)   rows.push('<div class="pay-row"><span class="pay-lbl">Bank</span><span class="pay-acct">' + escapeHtml(bankN)   + "</span></div>");
      if (name)    rows.push('<div class="pay-row"><span class="pay-lbl">Account name</span><span class="pay-acct">' + escapeHtml(name)   + "</span></div>");
      if (number)  rows.push('<div class="pay-row"><span class="pay-lbl">Account no.</span><span class="pay-acct">' + escapeHtml(number) + "</span></div>");
      return rows.join("");
    };

    const hasAccount1 = bank.bankName || bank.accountName || bank.accountNumber;
    const hasAccount2 = bank.bankName2 || bank.accountName2 || bank.accountNumber2;

    const payBlock = (paymentStatus === "Unpaid" && req.user.role === "staff" && (hasAccount1 || hasAccount2))
      ? (
        '<div class="pay-box">' +
        '<div class="pay-title">Payment instructions</div>' +
        (hasAccount1 ? htmlPayRows(bank.accountName, bank.accountNumber, bank.bankName) : "") +
        (hasAccount1 && hasAccount2
          ? '<div class="pay-row" style="margin:4px 0;border-top:1px dashed #d1d5db;padding-top:4px"><span style="color:#6b7280;font-size:.72rem;font-style:italic">— or transfer to —</span></div>'
          : "") +
        (hasAccount2 ? htmlPayRows(bank.accountName2, bank.accountNumber2, bank.bankName2) : "") +
        "</div>"
      )
      : "";

    // Pure HTML — zero JavaScript, zero external scripts.
    // CSP compliance guaranteed.
    const html = [
      '<!DOCTYPE html>',
      '<html lang="en">',
      '<head>',
      '<meta charset="UTF-8"/>',
      '<meta name="viewport" content="width=device-width,initial-scale=1"/>',
      '<title>Receipt - MELECH STORE</title>',
      '<style>',
      '*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}',
      'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#f0f2f5;min-height:100vh;display:flex;flex-direction:column;align-items:center;padding:16px 12px 32px;color:#111827}',
      '.card{background:#fff;width:100%;max-width:480px;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.10)}',
      '.store-hd{background:#1E3A8A;color:#fff;text-align:center;padding:22px 16px 16px}',
      '.store-logo{width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.18);display:inline-flex;align-items:center;justify-content:center;font-size:1.1rem;font-weight:700;margin-bottom:8px;letter-spacing:.05em}',
      '.store-name{font-size:1.1rem;font-weight:700;letter-spacing:.1em}',
      '.store-sub{font-size:.7rem;opacity:.7;margin-top:3px;letter-spacing:.06em}',
      '.dash{border:none;border-top:1.5px dashed #e5e7eb;margin:0 16px}',
      '.meta{padding:14px 18px;display:flex;flex-direction:column;gap:5px}',
      '.meta-row{display:flex;justify-content:space-between;align-items:baseline;gap:8px;font-size:.78rem;line-height:1.4}',
      '.meta-lbl{font-weight:600;color:#6b7280;flex-shrink:0}',
      '.meta-val{color:#111827;text-align:right;word-break:break-all}',
      '.status-badge{display:inline-block;padding:2px 10px;border-radius:99px;font-size:.72rem;font-weight:700;background:' + statusBg + ';color:' + statusColor + ';border:1px solid ' + statusBorder + '}',
      'table{width:100%;border-collapse:collapse;font-size:.75rem}',
      'thead tr{background:#1E3A8A;color:#fff}',
      'thead th{padding:9px 6px;font-weight:700;font-size:.68rem;letter-spacing:.04em;text-align:left;line-height:1.3}',
      'thead th small{display:block;font-weight:400;opacity:.65;font-size:.6rem;letter-spacing:0}',
      '.td-num{text-align:center;color:#9ca3af;font-size:.68rem;padding:8px 4px;width:22px;vertical-align:top}',
      '.td-item{padding:8px 6px;vertical-align:top;width:42%}',
      '.td-c{text-align:center;padding:8px 4px;vertical-align:middle;width:14%}',
      '.td-r{text-align:right;padding:8px 6px;vertical-align:middle;width:20%}',
      '.td-bold{font-weight:700;color:#111827}',
      '.r-even{background:#f9fafb}',
      '.r-odd{background:#fff}',
      '.i-name{display:block;font-weight:700;font-size:.76rem;color:#1f2937}',
      '.i-cat{display:block;font-size:.65rem;color:#1E3A8A;font-weight:600;margin-top:2px}',
      '.i-desc{display:block;font-size:.65rem;color:#6b7280;margin-top:2px}',
      '.total-bar{display:flex;justify-content:space-between;align-items:center;padding:13px 18px;border-top:2px solid #111827;margin-top:2px}',
      '.total-lbl{font-size:.85rem;font-weight:700}',
      '.total-amount{font-size:1.1rem;font-weight:800;color:#1E3A8A}',
      '.pay-box{margin:0 16px 16px;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:12px 14px;font-size:.75rem}',
      '.pay-title{font-weight:700;color:#b91c1c;font-size:.74rem;text-align:center;margin-bottom:10px;text-transform:uppercase;letter-spacing:.05em}',
      '.pay-row{display:flex;justify-content:space-between;gap:8px;padding:3px 0;color:#374151}',
      '.pay-lbl{font-weight:600;color:#6b7280;flex-shrink:0}',
      '.pay-acct{font-weight:700;color:#111827;letter-spacing:.04em}',
      '.footer{text-align:center;padding:12px 16px 18px;font-size:.68rem;color:#9ca3af;line-height:1.7;border-top:1.5px dashed #e5e7eb}',
      '@media print{body{background:#fff;padding:0}.card{box-shadow:none;border-radius:0;max-width:100%}}',
      '</style>',
      '</head>',
      '<body>',
      '<div class="card">',

      // Store header
      '<div class="store-hd">',
      '<div class="store-logo">MS</div>',
      '<div class="store-name">MELECH STORE</div>',
      '<div class="store-sub">Official Sales Receipt</div>',
      '</div>',

      '<hr class="dash"/>',

      // Order meta
      '<div class="meta">',
      '<div class="meta-row"><span class="meta-lbl">Order ID</span><span class="meta-val">#' + orderIdShort + '</span></div>',
      '<div class="meta-row"><span class="meta-lbl">Date</span><span class="meta-val">' + dateStr + '</span></div>',
      '<div class="meta-row"><span class="meta-lbl">Customer</span><span class="meta-val">' + escapeHtml(displayName) + '</span></div>',
      '<div class="meta-row"><span class="meta-lbl">Payment method</span><span class="meta-val">' + escapeHtml(displayPayment) + '</span></div>',
      '<div class="meta-row"><span class="meta-lbl">Status</span><span class="meta-val"><span class="status-badge">' + statusLabel + '</span></span></div>',
      // PT row — WSP or RTP, subtle abbreviation
      ...(roleBadge ? [
        '<div class="meta-row"><span class="meta-lbl">PT</span><span class="meta-val"><span style="background:' + (roleBadge === "WS" ? "#fef3c7" : "#eff6ff") + ';color:' + (roleBadge === "WS" ? "#92400e" : "#1d4ed8") + ';border:1px solid ' + (roleBadge === "WS" ? "#fde68a" : "#bfdbfe") + ';padding:1px 8px;border-radius:99px;font-size:.7rem;font-weight:700;">' + (roleBadge === "WS" ? "WSP" : "RTP") + '</span></span></div>',
      ] : []),
      // Staff info row — for walk-in (staff-created) orders
      ...(buyerRole === "staff" && changedByName ? [
        '<div class="meta-row"><span class="meta-lbl">Staff</span><span class="meta-val">' + escapeHtml(changedByName) + (changedById ? ' <span style="font-size:.68rem;color:#9ca3af">#' + changedById + '</span>' : '') + '</span></div>',
      ] : []),
      ...(buyerRole === "staff" && !changedByName && req.user?.role === "staff" ? [
        '<div class="meta-row"><span class="meta-lbl">Staff</span><span class="meta-val">' + escapeHtml(req.user.name || "Staff") + ' <span style="font-size:.68rem;color:#9ca3af">#' + String(req.user._id).slice(-8).toUpperCase() + '</span></span></div>',
      ] : []),
      '</div>',

      // ── Cancellation notice block ──────────────────────────────────────────
      ...(isCancelled ? [
        '<hr class="dash"/>',
        '<div style="margin:0 16px 0;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:12px 14px;">',
        '<div style="font-weight:700;color:#b91c1c;font-size:.74rem;text-align:center;margin-bottom:8px;text-transform:uppercase;letter-spacing:.05em;">⚠️ Order Cancelled</div>',
        ...(cancelledAt ? ['<div style="display:flex;justify-content:space-between;font-size:.75rem;padding:3px 0;"><span style="font-weight:600;color:#6b7280;">Cancelled on</span><span>' + new Date(cancelledAt).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" }) + '</span></div>'] : []),
        '<div style="display:flex;justify-content:space-between;font-size:.75rem;padding:3px 0;"><span style="font-weight:600;color:#6b7280;">Refund</span><span style="font-weight:700;color:' + (refundMade ? "#7c3aed" : "#b91c1c") + '">' + (refundMade ? "✅ Completed" : "⏳ Pending — contact store") + '</span></div>',
        '</div>',
        '<div style="height:12px"></div>',
      ] : []),

      // ── Delivery info block ────────────────────────────────────────────────
      ...(isDelivery ? [
        '<hr class="dash"/>',
        '<div style="margin:0 16px 0;background:#fffbeb;border:1px solid #f59e0b;border-radius:10px;padding:10px 14px;">',
        '<div style="font-weight:700;color:#92400e;font-size:.72rem;text-align:center;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em;">🚚 Delivery Order</div>',
        '<table width="100%" cellpadding="0" cellspacing="0" style="font-size:.73rem;color:#374151;">',
        '<tr><td style="font-weight:600;color:#6b7280;white-space:nowrap;padding:2px 8px 2px 0;width:30%">Recipient</td><td style="text-align:right;padding:2px 0;">' + escapeHtml(deliveryRecipientName || "—") + '</td></tr>',
        '<tr><td style="font-weight:600;color:#6b7280;white-space:nowrap;padding:2px 8px 2px 0;">Phone</td><td style="text-align:right;padding:2px 0;">' + escapeHtml(deliveryPhone || "—") + '</td></tr>',
        '<tr><td style="font-weight:600;color:#6b7280;white-space:nowrap;padding:2px 8px 2px 0;vertical-align:top;">Address</td><td style="text-align:right;padding:2px 0;">' + escapeHtml(deliveryAddress || "—") + '</td></tr>',
        '</table>',
        '<div style="margin-top:6px;font-size:.67rem;color:#92400e;font-style:italic;">Transport fare is separate — our team will contact you to arrange delivery cost.</div>',
        '</div>',
        '<div style="height:10px"></div>',
      ] : []),

      '<hr class="dash"/>',

      // Items table
      '<table>',
      '<thead><tr>',
      '<th style="width:22px;text-align:center">#</th>',
      '<th>Item <small>Name / category / desc</small></th>',
      '<th style="text-align:center">Qty</th>',
      '<th style="text-align:right">Unit <small>price</small></th>',
      '<th style="text-align:right">Subtotal <small>Qty x price</small></th>',
      '</tr></thead>',
      '<tbody>' + itemRows + '</tbody>',
      '</table>',

      // Total
      '<div class="total-bar">',
      '<span class="total-lbl">Total &nbsp;<span style="font-weight:400;font-size:.78rem;color:#6b7280">(' + orders.length + ' item' + (orders.length > 1 ? 's' : '') + ')</span></span>',
      '<span class="total-amount">&#8358;' + totalAmount.toLocaleString() + '</span>',
      '</div>',

      '<hr class="dash"/>',

      payBlock,

      // Footer
      '<div class="footer">',
      'Thank you for shopping with MELECH STORE<br/>',
      'No signature required &middot; Auto-generated receipt',
      '</div>',

      '</div>', // end .card
      '</body>',
      '</html>',
    ].join("\n");

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
      return sendResponse(res, 200, { deleted: true }, "Order removed successfully");
    }

    order.quantity     -= 1;
    order.totalPrice    = order.price * order.quantity;
    order.cartExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await order.save();
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

/**
 * setPriceMode - toggle all cart items between wholesale and retail pricing
 * When toggled, recalculates prices based on the product's configured rates
 */
const setPriceMode = async (req, res) => {
  try {
    const { mode } = req.params;
    const userId = req.user._id;

    if (!["retail", "wholesale"].includes(mode)) {
      return sendError(res, 400, "Invalid price mode. Must be 'retail' or 'wholesale'");
    }

    // Fetch all user's cart orders
    const orders = await OrderModel.find({ userOrdering: userId }).populate("product");
    if (!orders.length) {
      // Empty cart — nothing to reprice, but this is not an error.
      // Wholesale users hit this on every page load before adding items.
      return sendResponse(res, 200, { success: true, updated: 0 }, "Cart is empty — nothing to update");
    }

    // Update each order with the new price tier
    for (const order of orders) {
      const product = order.product;
      let newPrice;

      if (mode === "wholesale") {
        // Use wholesale price if available; fallback to retail
        newPrice = product.wholesalePrice ?? product.price;
      } else {
        // mode === "retail"
        newPrice = product.price;
      }

      order.price = newPrice;
      order.totalPrice = newPrice * order.quantity;
      order.priceMode = mode;
      order.cartExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await order.save();
    }

    return sendResponse(res, 200, { mode, updated: orders.length }, `Cart pricing switched to ${mode}`);
  } catch (error) {
    console.error("setPriceMode error:", error);
    return sendError(res, 500, "Failed to set price mode");
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
  setPriceMode
};