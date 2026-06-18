import AllOrdersPlacedModel from "../models/AllOrdersPlacedModel.js";
import CompletedOrderHistoryModel from "../models/CompletedOrderHistoryModel.js";
import ProductModel from "../models/ProductModel.js";
import { sendCustomerProcessingEmail } from "../utils/email/customerProcessing.js";
import { sendCustomerDeliveredEmail } from "../utils/email/customerOrderDelivered.js";
import { sendCustomerCancelledEmail } from "../utils/email/customerOrderCancelled.js";
import { sendResponse, sendError } from "../utils/apiResponse.js";
import orderNotifier from "../utils/orderNotifier.js";

// ─────────────────────────────────────────────────────────────────────────────
// normalizeProductList — always prefers stored snapshot strings over live
// populated product data so deleted products never surface as "Unknown".
// ─────────────────────────────────────────────────────────────────────────────
const normalizeProductList = (productList = []) =>
  productList.map((item) => {
    const snap = item.toObject ? item.toObject() : { ...item };
    const live = snap.productId;
    return {
      ...snap,
      productName:        snap.productName        || live?.name              || "Unknown Product",
      categoryName:       snap.categoryName       || live?.categoryId?.name  || "Unknown Category",
      productDescription: snap.productDescription || live?.description       || "",
      productId: live
        ? {
            ...(live.toObject ? live.toObject() : live),
            name:        snap.productName        || live.name              || "Unknown Product",
            description: snap.productDescription || live.description       || "",
            categoryId:  live.categoryId
              ? {
                  ...(live.categoryId.toObject ? live.categoryId.toObject() : live.categoryId),
                  name: snap.categoryName || live.categoryId?.name || "Unknown Category",
                }
              : { name: snap.categoryName || "Unknown Category" },
          }
        : {
            _id:         snap.productId,
            name:        snap.productName        || "Unknown Product",
            description: snap.productDescription || "",
            categoryId:  { name: snap.categoryName || "Unknown Category" },
          },
    };
  });

// Email handler map — cancel is handled separately below
const emailHandlers = {
  processing: sendCustomerProcessingEmail,
  delivered:  sendCustomerDeliveredEmail,
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /placed-orders
// Admin sees all; delegated staff also sees all; customer/wholesale see own only
// ─────────────────────────────────────────────────────────────────────────────
export const getAllPlacedOrders = async (req, res) => {
  try {
    let query = {};
    // admin and delegated staff both see all placed orders
    const canSeeAll = req.user.role === "admin" || req.isDelegatedStaff === true;
    if (!canSeeAll) {
      query.userOrdering = req.user._id;
    }

    const orders = await AllOrdersPlacedModel.find(query)
      .populate("userOrdering", "name role email")
      .populate({
        path: "productList.productId",
        select: "name categoryId description isDeleted",
        populate: { path: "categoryId", select: "name" },
      })
      .sort({ createdAt: -1 });

    const normalized = orders.map((o) => {
      const obj = o.toObject();
      obj.productList = normalizeProductList(obj.productList);
      return obj;
    });

    return sendResponse(res, 200, { orders: normalized }, "Placed orders retrieved successfully");
  } catch (error) {
    console.error("getAllPlacedOrders error:", error);
    return sendError(res, 500, "Error fetching placed orders");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /placed-orders/:id
// Search a single placed order by its ID — for delegated staff and admin.
// ─────────────────────────────────────────────────────────────────────────────
export const getPlacedOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await AllOrdersPlacedModel.findById(id)
      .populate("userOrdering", "name role email")
      .populate({
        path: "productList.productId",
        select: "name categoryId description isDeleted",
        populate: { path: "categoryId", select: "name" },
      });

    if (!order) return sendError(res, 404, "Order not found");

    const obj = order.toObject();
    obj.productList = normalizeProductList(obj.productList);

    return sendResponse(res, 200, { order: obj }, "Order retrieved successfully");
  } catch (error) {
    // Mongoose will throw a CastError for a malformed ID
    if (error.name === "CastError") {
      return sendError(res, 404, "Order not found — invalid ID format");
    }
    console.error("getPlacedOrderById error:", error);
    return sendError(res, 500, "Error fetching order");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /placed-orders/:id/status
// Admin OR delegated staff updates delivery status.
//
// Delegation audit trail:
//   - changedBy:          the user who made the change
//   - changedByRole:      "admin" or "staff"
//   - changedByName:      name snapshot at time of change
//   - isDelegatedAction:  true when a delegated staff (not admin) made the change
//   - staffDelegatedFor:  same as changedBy (for query convenience)
//
// Refund access:
//   - If a delegated staff cancels an order, they are recorded as changedBy.
//   - The refund button is accessible to whoever cancelled it (changedBy) OR
//     any admin. The completedOrderHistoryController.markRefundMade enforces this.
//
// When status = "cancelled":
//   1. Restore stock
//   2. Move to CompletedOrderHistory with cancelled=true + audit fields
//   3. Delete from AllOrdersPlaced
//   4. Send cancellation email to buyer
//
// When status = "delivered":
//   Move to CompletedOrderHistory with deliveryStatus="delivered" + audit fields
//
// When status = "processing":
//   Update in-place + send processing email + real-time SSE
// ─────────────────────────────────────────────────────────────────────────────
export const updateDeliveryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { deliveryStatus } = req.body;

    const order = await AllOrdersPlacedModel.findById(id)
      .populate("userOrdering", "name email role");

    if (!order) return sendError(res, 404, "Order not found");

    const previousStatus = order.deliveryStatus;

    // ── Who is making this change? ────────────────────────────────────────
    const changer = req.user;
    const isDelegated = req.isDelegatedStaff === true;

    // Shared audit fields written into every CompletedOrderHistory entry
    const auditFields = {
      changedBy:         changer._id,
      changedByRole:     changer.role,
      changedByName:     changer.name || "",
      isDelegatedAction: isDelegated,
      staffDelegatedFor: isDelegated ? changer._id : null,
    };

    // ── CANCEL flow ───────────────────────────────────────────────────────
    if (deliveryStatus.toLowerCase() === "cancelled") {
      // 1. Restore stock
      for (const item of order.productList) {
        await ProductModel.findByIdAndUpdate(
          item.productId,
          { $inc: { stock: item.quantity } }
        );
      }

      // 2. Move to CompletedOrderHistory
      await CompletedOrderHistoryModel.create({
        userOrdering:            order.userOrdering?._id || order.userOrdering,
        buyerName:               order.buyerName,
        paymentMethod:           order.paymentMethod,
        deliveryStatus:          "cancelled",
        cancelled:               true,
        cancelledAt:             new Date(),
        refundMade:              false,
        refundExcludeFromRevenue: false,
        totalPrice:              order.totalPrice,
        allQuantity:             order.allQuantity,
        productList:             order.productList,
        paid:                    order.paid || true,
        ...auditFields,
      });

      // 3. Delete from active placed orders
      await AllOrdersPlacedModel.findByIdAndDelete(id);

      // 4. Send cancellation email to buyer
      try {
        if (order.userOrdering?.email) {
          await sendCustomerCancelledEmail({
            customerEmail: order.userOrdering.email,
            customerName:  order.userOrdering.name || order.buyerName || "Customer",
            orderId:       order._id,
            totalPrice:    order.totalPrice,
          });
        }
      } catch (emailErr) {
        console.error("Cancel email failed:", emailErr.message);
      }

      // Real-time SSE notification to buyer
      orderNotifier.emit("placedOrderUpdated", {
        orderId: id,
        userId:  String(order.userOrdering?._id || order.userOrdering),
        status:  "cancelled",
      });

      const who = isDelegated ? `Delegated staff (${changer.name})` : "Admin";
      return sendResponse(
        res, 200, null,
        `Order cancelled by ${who}. Stock restored and buyer has been notified.`
      );
    }

    // ── DELIVERED flow ────────────────────────────────────────────────────
    if (deliveryStatus.toLowerCase() === "delivered") {
      try {
        if (order.userOrdering?.email) {
          await sendCustomerDeliveredEmail({
            customerEmail: order.userOrdering.email,
            customerName:  order.userOrdering.name || order.buyerName || "Customer",
            orderId:       order._id,
          });
        }
      } catch (emailErr) {
        console.error("Delivered email failed:", emailErr.message);
      }

      await CompletedOrderHistoryModel.create({
        userOrdering:   order.userOrdering?._id || order.userOrdering,
        buyerName:      order.buyerName,
        paymentMethod:  order.paymentMethod,
        deliveryStatus: "delivered",
        totalPrice:     order.totalPrice,
        allQuantity:    order.allQuantity,
        productList:    order.productList,
        ...auditFields,
      });

      await AllOrdersPlacedModel.findByIdAndDelete(id);

      orderNotifier.emit("placedOrderUpdated", {
        orderId: id,
        userId:  String(order.userOrdering?._id || order.userOrdering),
        status:  "delivered",
      });

      return sendResponse(res, 200, null, "Order marked as delivered and moved to history.");
    }

    // ── PROCESSING or other status ─────────────────────────────────────────
    order.deliveryStatus = deliveryStatus;
    await order.save();

    if (previousStatus !== deliveryStatus && emailHandlers[deliveryStatus.toLowerCase()]) {
      try {
        await emailHandlers[deliveryStatus.toLowerCase()]({
          customerEmail: order.userOrdering?.email,
          customerName:  order.userOrdering?.name || order.buyerName || "Customer",
          orderId:       order._id,
        });
      } catch (emailErr) {
        console.error("Status email failed:", emailErr.message);
      }
    }

    orderNotifier.emit("placedOrderUpdated", {
      orderId: id,
      userId:  String(order.userOrdering?._id || order.userOrdering),
      status:  deliveryStatus,
    });

    return sendResponse(res, 200, null, "Delivery status updated successfully.");
  } catch (error) {
    console.error("updateDeliveryStatus error:", error);
    return sendError(res, 500, "Error updating delivery status");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /placed-orders/clear  — admin clears all
// ─────────────────────────────────────────────────────────────────────────────
export const clearAllPlacedOrders = async (req, res) => {
  try {
    await AllOrdersPlacedModel.deleteMany({});
    return sendResponse(res, 200, null, "All placed orders cleared successfully");
  } catch (error) {
    console.error("clearAllPlacedOrders error:", error);
    return sendError(res, 500, "Error clearing orders");
  }
};
