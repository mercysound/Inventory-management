// server/controllers/expiringOrdersController.js
import AllOrdersPlacedModel from "../models/AllOrdersPlacedModel.js";
import SettingsModel from "../models/SettingsModel.js";
import { sendResponse, sendError } from "../utils/apiResponse.js";

// ─────────────────────────────────────────────────────────────────────────────
// GET /expiring-orders
// Returns all active placed orders that have exceeded the configured expiry time.
// Also returns the current expiry settings so the frontend can display them.
// ─────────────────────────────────────────────────────────────────────────────
export const getExpiringOrders = async (req, res) => {
  try {
    let settings = await SettingsModel.findOne({ key: "global" });
    if (!settings) settings = await SettingsModel.create({ key: "global" });

    const { orderExpiryHours } = settings;
    const expiryThreshold = new Date(Date.now() - orderExpiryHours * 60 * 60 * 1000);

    // Active orders placed BEFORE the expiry threshold
    const orders = await AllOrdersPlacedModel.find({
      deliveryStatus: { $in: ["pending", "processing"] },
      createdAt: { $lt: expiryThreshold },
    })
      .populate("userOrdering", "name email role")
      .populate({
        path: "productList.productId",
        select: "name categoryId",
        populate: { path: "categoryId", select: "name" },
      })
      .sort({ createdAt: 1 }); // oldest first — most urgent at top

    // Annotate each order with how many hours it has been waiting
    const annotated = orders.map((o) => {
      const obj         = o.toObject();
      const hoursElapsed = Math.floor((Date.now() - new Date(o.createdAt)) / (1000 * 60 * 60));
      obj.hoursElapsed  = hoursElapsed;
      return obj;
    });

    return sendResponse(res, 200, {
      orders: annotated,
      settings: {
        orderExpiryHours,
        reminderMode:          settings.reminderMode,
        reminderIntervalHours: settings.reminderIntervalHours,
        adminNotificationEmail: settings.adminNotificationEmail,
      },
    }, "Expiring orders retrieved successfully");
  } catch (error) {
    console.error("getExpiringOrders error:", error);
    return sendError(res, 500, "Failed to fetch expiring orders");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /expiring-orders/count
// Lightweight endpoint — just returns the count for the notification bell badge
// ─────────────────────────────────────────────────────────────────────────────
export const getExpiringOrdersCount = async (req, res) => {
  try {
    let settings = await SettingsModel.findOne({ key: "global" });
    if (!settings) settings = await SettingsModel.create({ key: "global" });

    const { orderExpiryHours } = settings;
    const expiryThreshold = new Date(Date.now() - orderExpiryHours * 60 * 60 * 1000);

    const count = await AllOrdersPlacedModel.countDocuments({
      deliveryStatus: { $in: ["pending", "processing"] },
      createdAt: { $lt: expiryThreshold },
    });

    return sendResponse(res, 200, { count }, "Count retrieved");
  } catch (error) {
    console.error("getExpiringOrdersCount error:", error);
    return sendError(res, 500, "Failed to fetch count");
  }
};
