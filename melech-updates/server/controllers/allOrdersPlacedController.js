import AllOrdersPlacedModel from "../models/AllOrdersPlacedModel.js";
import CompletedOrderHistoryModel from "../models/CompletedOrderHistoryModel.js";
import ProductModel from "../models/ProductModel.js";
import { sendCustomerProcessingEmail } from "../utils/email/customerProcessing.js";
import { sendCustomerDeliveredEmail } from "../utils/email/customerOrderDelivered.js";
import { sendCustomerCancelledEmail } from "../utils/email/customerOrderCancelled.js";
import { sendResponse, sendError } from "../utils/apiResponse.js";

// Email handler map — cancel is handled separately below
const emailHandlers = {
  processing: sendCustomerProcessingEmail,
  delivered:  sendCustomerDeliveredEmail,
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /placed-orders
// Admin sees all; customer/wholesale see only their own
// ─────────────────────────────────────────────────────────────────────────────
export const getAllPlacedOrders = async (req, res) => {
  try {
    let query = {};
    if (req.user.role !== "admin") {
      query.userOrdering = req.user._id;
    }

    const orders = await AllOrdersPlacedModel.find(query)
      .populate("userOrdering", "name role email")
      .populate({
        path: "productList.productId",
        select: "name categoryId description",
        populate: { path: "categoryId", select: "name" },
      })
      .sort({ createdAt: -1 });

    return sendResponse(res, 200, { orders }, "Placed orders retrieved successfully");
  } catch (error) {
    console.error("getAllPlacedOrders error:", error);
    return sendError(res, 500, "Error fetching placed orders");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /placed-orders/:id/status
// Admin updates delivery status. When status = "cancelled":
//   1. Restore stock for every product in the order
//   2. Move order to CompletedOrderHistory with cancelled=true, deliveryStatus="cancelled"
//   3. Delete from AllOrdersPlaced
//   4. Send cancellation email to the buyer
//   5. Order stays visible in buyer's Pending modal until admin marks refund
// When status = "delivered":
//   Move to CompletedOrderHistory with deliveryStatus="delivered"
// ─────────────────────────────────────────────────────────────────────────────
export const updateDeliveryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { deliveryStatus } = req.body;

    const order = await AllOrdersPlacedModel.findById(id)
      .populate("userOrdering", "name email role");

    if (!order) return sendError(res, 404, "Order not found");

    const previousStatus = order.deliveryStatus;

    // ── CANCEL flow ──────────────────────────────────────────────────────
    if (deliveryStatus.toLowerCase() === "cancelled") {
      // 1. Restore stock for every product in this order
      for (const item of order.productList) {
        await ProductModel.findByIdAndUpdate(
          item.productId,
          { $inc: { stock: item.quantity } }
        );
      }

      // 2. Move to CompletedOrderHistory with cancelled flag
      await CompletedOrderHistoryModel.create({
        userOrdering: order.userOrdering?._id || order.userOrdering,
        buyerName:    order.buyerName,
        paymentMethod: order.paymentMethod,
        deliveryStatus: "cancelled",
        cancelled:    true,
        cancelledAt:  new Date(),
        refundMade:   false,
        refundExcludeFromRevenue: false, // will become true when refund is confirmed
        totalPrice:   order.totalPrice,
        allQuantity:  order.allQuantity,
        productList:  order.productList,
        paid:         order.paid || true,
      });

      // 3. Delete from active placed orders
      await AllOrdersPlacedModel.findByIdAndDelete(id);

      // 4. Send cancellation email
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

      return sendResponse(
        res, 200, null,
        "Order cancelled. Stock restored and buyer has been notified."
      );
    }

    // ── DELIVERED flow ────────────────────────────────────────────────────
    if (deliveryStatus.toLowerCase() === "delivered") {
      // Send email
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

      // Move to history
      await CompletedOrderHistoryModel.create({
        userOrdering:  order.userOrdering?._id || order.userOrdering,
        buyerName:     order.buyerName,
        paymentMethod: order.paymentMethod,
        deliveryStatus: "delivered",
        totalPrice:    order.totalPrice,
        allQuantity:   order.allQuantity,
        productList:   order.productList,
      });

      await AllOrdersPlacedModel.findByIdAndDelete(id);

      return sendResponse(res, 200, null, "Order marked as delivered and moved to history.");
    }

    // ── PROCESSING or other status ────────────────────────────────────────
    order.deliveryStatus = deliveryStatus;
    await order.save();

    // Send email for processing
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

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /placed-orders/:id — admin deletes single order
// ─────────────────────────────────────────────────────────────────────────────
export const deletePlacedOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await AllOrdersPlacedModel.findByIdAndDelete(id);
    if (!deleted) return sendError(res, 404, "Order not found");
    return sendResponse(res, 200, null, "Order deleted successfully");
  } catch (error) {
    console.error("deletePlacedOrder error:", error);
    return sendError(res, 500, "Error deleting order");
  }
};
