import CompletedOrderHistoryModel from "../models/CompletedOrderHistoryModel.js";
import { sendResponse, sendError } from "../utils/apiResponse.js";
import orderNotifier from "../utils/orderNotifier.js";

// ─────────────────────────────────────────────────────────────────────────────
// normalizeProductList
//
// After populate, `item.productId` may be null (hard-deleted product).
// We always prefer the stored snapshot strings (productName, categoryName,
// productDescription) that were saved at order-completion time, and only
// fall back to the live populated object when the snapshot is absent.
// This guarantees receipt/history details are always intact regardless of
// whether the product was soft-deleted or permanently deleted afterwards.
// ─────────────────────────────────────────────────────────────────────────────
const normalizeProductList = (productList = []) =>
  productList.map((item) => {
    const snap = item.toObject ? item.toObject() : { ...item };
    const live = snap.productId; // populated Product doc or null
    return {
      ...snap,
      productName:        snap.productName        || live?.name         || "Unknown Product",
      categoryName:       snap.categoryName       || live?.categoryId?.name || "Unknown Category",
      productDescription: snap.productDescription || live?.description  || "",
      // Keep productId as a plain object for any fields the frontend may use,
      // but inject the resolved strings so the UI never sees nulls.
      productId: live
        ? {
            ...( live.toObject ? live.toObject() : live ),
            name:        snap.productName        || live.name         || "Unknown Product",
            description: snap.productDescription || live.description  || "",
            categoryId:  live.categoryId
              ? {
                  ...(live.categoryId.toObject ? live.categoryId.toObject() : live.categoryId),
                  name: snap.categoryName || live.categoryId?.name || "Unknown Category",
                }
              : { name: snap.categoryName || "Unknown Category" },
          }
        : {
            // Product was hard-deleted — reconstruct a minimal object from snapshot
            _id:         snap.productId,   // may be an ObjectId string
            name:        snap.productName        || "Unknown Product",
            description: snap.productDescription || "",
            categoryId:  { name: snap.categoryName || "Unknown Category" },
          },
    };
  });

// ─────────────────────────────────────────────────────────────────────────────
// GET /completed-history
//
// Admin:
//   Sees everything not explicitly hidden by admin.
//
// Staff (delegated):
//   Sees ONLY history entries where they personally made the status change
//   (isDelegatedAction = true AND changedBy = staffId).
//   This ensures staff only see the work they did, not admin or other staff actions.
//
// Staff (non-delegated / regular staff walk-in orders):
//   Sees their own walk-in sale history (userOrdering = staffId) — unchanged.
//   NOTE: A staff member may appear in both buckets if they are also a delegated
//   staff, so we use $or to merge both sets cleanly.
//
// Customer / Wholesale:
//   Sees their own non-cancelled orders, plus cancelled+refunded ones.
// ─────────────────────────────────────────────────────────────────────────────
export const getCompletedHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const role   = req.user.role;

    let query = {};

    if (role === "admin") {
      // Admin sees everything except what they've explicitly hidden
      query = { adminHidden: { $ne: true } };

    } else if (role === "staff") {
      // Staff sees:
      //   (a) Their own walk-in sale entries (userOrdering = them)
      //   (b) Delegated-action entries where they changed the status
      // Both sets respect the hiddenFor filter.
      query = {
        hiddenFor: { $nin: [userId] },
        $or: [
          // Their own walk-in sales
          {
            userOrdering: userId,
            isDelegatedAction: { $ne: true },
          },
          // Delegated actions they performed on customer orders
          {
            isDelegatedAction: true,
            changedBy: userId,
          },
        ],
      };

    } else {
      // Customer / wholesale — their own orders only
      query = {
        userOrdering: userId,
        hiddenFor:    { $nin: [userId] },
        $or: [
          { cancelled: { $ne: true } },
          { cancelled: true, refundMade: true },
        ],
      };
    }

    const orders = await CompletedOrderHistoryModel.find(query)
      .populate("userOrdering", "name email role")
      .populate("changedBy", "name role")
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

    return sendResponse(res, 200, { orders: normalized }, "Completed history retrieved successfully");
  } catch (error) {
    console.error("getCompletedHistory error:", error);
    return sendError(res, 500, "Error fetching completed history");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /completed-history/cancelled-pending
// Returns cancelled orders that have NOT yet been refunded — for the
// buyer's PendingOrdersModal (so they can see "cancelled" status there
// until admin marks refund)
// ─────────────────────────────────────────────────────────────────────────────
export const getCancelledPendingRefund = async (req, res) => {
  try {
    const userId = req.user._id;

    const orders = await CompletedOrderHistoryModel.find({
      userOrdering: userId,
      cancelled:    true,
      refundMade:   false,
    })
      .populate("userOrdering", "name email role")
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

    return sendResponse(res, 200, { orders: normalized }, "Cancelled pending refund orders retrieved");
  } catch (error) {
    console.error("getCancelledPendingRefund error:", error);
    return sendError(res, 500, "Error fetching cancelled orders");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /completed-history/:id/refund
// Marks refund as done — ONE TIME, IRREVERSIBLE.
//
// Who can do this:
//   - Any admin (always)
//   - The delegated staff who originally cancelled this order
//     (checked via changedBy === req.user._id AND isDelegatedAction = true)
//
// After this:
//   - refundMade = true, refundMadeAt = now
//   - refundExcludeFromRevenue = true
//   - deliveryStatus = "refunded"
//   - The order now appears in buyer's history as "refunded"
//   - The order disappears from buyer's PendingOrdersModal
// ─────────────────────────────────────────────────────────────────────────────
export const markRefundMade = async (req, res) => {
  try {
    const { id } = req.params;
    const callerId   = String(req.user._id);
    const callerRole = req.user.role;

    const order = await CompletedOrderHistoryModel.findById(id);
    if (!order) return sendError(res, 404, "Order not found");

    if (!order.cancelled) {
      return sendError(res, 400, "This order was not cancelled — refund not applicable");
    }

    if (order.refundMade) {
      return sendError(res, 400, "Refund has already been marked for this order. This cannot be undone.");
    }

    // Access check — admin always allowed; delegated staff only if they cancelled this order
    if (callerRole !== "admin") {
      const cancelledByThisStaff =
        order.isDelegatedAction === true &&
        order.changedBy &&
        String(order.changedBy) === callerId;

      if (!cancelledByThisStaff) {
        return sendError(
          res, 403,
          "Forbidden: Only the admin or the staff member who cancelled this order can mark the refund."
        );
      }
    }

    order.refundMade               = true;
    order.refundMadeAt             = new Date();
    order.refundExcludeFromRevenue = true;
    order.deliveryStatus           = "refunded";
    await order.save();

    // Notify the buyer in real-time so their pending modal removes this
    // order immediately without needing to close and reopen it.
    orderNotifier.emit("placedOrderUpdated", {
      orderId: String(order._id),
      userId:  String(order.userOrdering),
      status:  "refunded",
    });

    return sendResponse(res, 200, { order }, "Refund marked successfully. This order will no longer count towards revenue.");
  } catch (error) {
    console.error("markRefundMade error:", error);
    return sendError(res, 500, "Error marking refund");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /completed-history/:id
// Admin: sets adminHidden = true
// Customer: adds userId to hiddenFor array
// ─────────────────────────────────────────────────────────────────────────────
export const deleteCompletedOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const role   = req.user.role;
    const userId = req.user._id;

    const order = await CompletedOrderHistoryModel.findById(id);
    if (!order) return sendError(res, 404, "Order not found");

    if (role === "admin") {
      // Block deletion of cancelled orders that haven't been refunded yet.
      // The admin must mark the refund first so the buyer gets proper closure.
      if (order.cancelled && !order.refundMade) {
        return sendError(
          res, 403,
          "This order cannot be removed yet. Please mark the refund as completed first — the buyer is still waiting for their refund confirmation."
        );
      }
      order.adminHidden = true;
      await order.save();
      return sendResponse(res, 200, null, "Order hidden from admin view");
    }

    if (!order.hiddenFor.includes(userId)) {
      order.hiddenFor.push(userId);
      await order.save();
    }
    return sendResponse(res, 200, null, "Order removed from your history");
  } catch (error) {
    console.error("deleteCompletedOrder error:", error);
    return sendError(res, 500, "Error deleting order");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /completed-history/clear/all
// ─────────────────────────────────────────────────────────────────────────────
export const clearAllCompletedOrders = async (req, res) => {
  try {
    const role   = req.user.role;
    const userId = req.user._id;

    if (role === "admin") {
      await CompletedOrderHistoryModel.updateMany({}, { adminHidden: true });
    } else {
      await CompletedOrderHistoryModel.updateMany(
        { userOrdering: userId },
        { $addToSet: { hiddenFor: userId } }
      );
    }
    return sendResponse(res, 200, null, "All orders cleared from your view");
  } catch (error) {
    console.error("clearAllCompletedOrders error:", error);
    return sendError(res, 500, "Error clearing orders");
  }
};
