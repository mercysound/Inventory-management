import CompletedOrderHistoryModel from "../models/CompletedOrderHistoryModel.js";
import User from "../models/UserModel.js";
import { sendResponse, sendError } from '../utils/apiResponse.js';
import mongoose from "mongoose";

/**
 * GET /completed-history
 * - Admin: see all orders except ones marked adminHidden
 * - Customer/staff: see only their own orders, excluding ones they hid
 */
export const getCompletedHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const role = req.user.role;

    let filter = {};

    if (role === "admin") {
      // Admin sees everything except admin-hidden
      filter = { adminHidden: { $ne: true } };
    } else {
      // Staff/Customer sees only their own & not hidden from them
      filter = {
        userOrdering: userId,
        hiddenFor: { $ne: userId },
      };
    }

    const orders = await CompletedOrderHistoryModel.find(filter)
      .populate("userOrdering", "name email role")
      .populate({
        path: "productList.productId",
        select: "name categoryId description",
        populate: { path: "categoryId", select: "name" },
      })
      .sort({ createdAt: -1 });

    return sendResponse(res, 200, { orders }, "Completed order history retrieved successfully");
  } catch (err) {
    console.error("getCompletedHistory error:", err);
    return sendError(res, 500, "Failed to fetch completed history");
  }
};


/**
 * DELETE /completed-history/:id
 * - Admin: mark adminHidden = true
 * - Non-admin: push userId into hiddenFor[]
 * - If both sides deleted -> remove from DB
 */
export const deleteCompletedOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const role = req.user.role;

    const order = await CompletedOrderHistoryModel.findById(id);
    if (!order) {
      return sendError(res, 404, "Order not found");
    }

    console.log(`🗑️ Deleting order ${id} by ${role}`);

    if (role === "admin") {
      order.adminHidden = true;
    } else {
      if (!order.hiddenFor.includes(userId)) {
        order.hiddenFor.push(userId);
      }
    }

    await order.save();

    // Check if both sides deleted it
    const customerDeleted = order.hiddenFor
      .map(String)
      .includes(String(order.userOrdering));
    const adminDeleted = order.adminHidden === true;

    if (customerDeleted && adminDeleted) {
      await order.deleteOne();
      console.log(`✅ Permanently deleted order ${id}`);
      return sendResponse(res, 200, null, "Order permanently deleted from database");
    }

    return sendResponse(res, 200, null, "Order deleted from your view only");
  } catch (error) {
    console.error("❌ deleteCompletedOrder error:", error);
    return sendError(res, 500, "Error deleting order");
  }
};

/**
 * DELETE /completed-history/clear/all
 * - Admin: hide all for admin; if customer already hid theirs, delete permanently
 * - Non-admin: hide all theirs; if admin already hid, delete permanently
 */
export const clearCompletedOrders = async (req, res) => {
  try {
    const userId = req.user._id;
    const role = req.user.role;

    if (role === "admin") {
      // Step 1: Mark all admin-hidden
      await CompletedOrderHistoryModel.updateMany({}, { $set: { adminHidden: true } });

      // Step 2: Delete permanently where both sides have hidden
      await CompletedOrderHistoryModel.deleteMany({
        adminHidden: true,
        hiddenFor: { $exists: true, $ne: [] },
      });
    } else {
      // Step 1: Hide for this user
      await CompletedOrderHistoryModel.updateMany(
        { userOrdering: userId },
        { $addToSet: { hiddenFor: userId } }
      );

      // Step 2: Delete permanently where admin + user both hidden
      await CompletedOrderHistoryModel.deleteMany({
        adminHidden: true,
        hiddenFor: userId,
      });
    }

    return sendResponse(res, 200, null, "Orders cleared successfully");
  } catch (error) {
    console.error("❌ clearCompletedOrders error:", error);
    return sendError(res, 500, error.message || "Error clearing orders");
  }
};

