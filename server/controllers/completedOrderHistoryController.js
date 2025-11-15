import CompletedOrderHistoryModel from "../models/CompletedOrderHistoryModel.js";
import User from "../models/UserModel.js";
import mongoose from "mongoose";

/**
 * GET /completed-history
 * - Admin: see all orders except ones marked adminHidden
 * - Customer/staff: see only their own orders, excluding ones they hid
 */
export const getCompletedOrders = async (req, res) => {
  try {
    const userId = req.user._id;
    const role = req.user.role;

    let filter = {};

    if (role === "admin") {
      // Admin sees everything except those hidden by admin
      filter = { adminHidden: { $ne: true } };
    } else {
      // Staff/customer sees only their orders not hidden for them
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

    res.status(200).json({ success: true, orders });
  } catch (error) {
    console.error("❌ getCompletedOrders error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching completed orders",
    });
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
      return res.status(404).json({ success: false, message: "Order not found" });
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
      return res.status(200).json({
        success: true,
        message: "Order permanently deleted from database",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Order deleted from your view only",
    });
  } catch (error) {
    console.error("❌ deleteCompletedOrder error:", error);
    res.status(500).json({ success: false, message: "Error deleting order" });
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

    res.status(200).json({ success: true, message: "Orders cleared successfully" });
  } catch (error) {
    console.error("❌ clearCompletedOrders error:", error);
    res.status(500).json({ success: false, message: error.message || "Error clearing orders" });
  }
};

