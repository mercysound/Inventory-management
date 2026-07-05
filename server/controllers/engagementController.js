// server/controllers/engagementController.js
import CustomerSessionModel  from "../models/CustomerSessionModel.js";
import DailyEngagementModel  from "../models/DailyEngagementModel.js";
import { sendResponse, sendError } from "../utils/apiResponse.js";

// ─────────────────────────────────────────────────────────────────────────────
// POST /engagement/session/start
// Called when a user starts a session (on app load).
// Returns sessionId so the frontend can track events against it.
// ─────────────────────────────────────────────────────────────────────────────
export const startSession = async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return sendError(res, 400, "sessionId required");

    // Upsert — if session already exists keep it
    const session = await CustomerSessionModel.findOneAndUpdate(
      { sessionId },
      {
        $setOnInsert: {
          customerId: req.user?._id || null,
          sessionId,
          startedAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    return sendResponse(res, 200, { sessionId: session.sessionId }, "Session started");
  } catch (err) {
    console.error("startSession error:", err.message);
    return sendError(res, 500, "Failed to start session");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /engagement/session/action
// Records an engagement action within the session.
// Body: { sessionId, action, productId? }
// action values: "product_view" | "add_to_cart" | "start_checkout"
// ─────────────────────────────────────────────────────────────────────────────
export const recordAction = async (req, res) => {
  try {
    const { sessionId, action, productId } = req.body;
    if (!sessionId || !action) return sendError(res, 400, "sessionId and action required");

    const ENGAGEMENT_ACTIONS = ["product_view", "add_to_cart", "start_checkout"];
    if (!ENGAGEMENT_ACTIONS.includes(action)) return sendError(res, 400, "Invalid action");

    const entry = { action, ts: new Date() };
    if (productId) entry.productId = productId;

    await CustomerSessionModel.findOneAndUpdate(
      { sessionId },
      {
        $push: { actions: entry },
        $set:  { engaged: true, endedAt: new Date() },
      }
    );

    return sendResponse(res, 200, null, "Action recorded");
  } catch (err) {
    console.error("recordAction error:", err.message);
    return sendError(res, 500, "Failed to record action");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /engagement/session/end
// Closes the session — sets endedAt (which starts the 30-day TTL clock),
// marks purchased status, records cart snapshot.
// ─────────────────────────────────────────────────────────────────────────────
export const endSession = async (req, res) => {
  try {
    const { sessionId, purchased = false, totalSpent = 0, cartItems = [] } = req.body;
    if (!sessionId) return sendError(res, 400, "sessionId required");

    await CustomerSessionModel.findOneAndUpdate(
      { sessionId },
      {
        $set: {
          endedAt:    new Date(),
          purchased:  Boolean(purchased),
          totalSpent: Number(totalSpent),
          cartItems,
        },
      }
    );

    return sendResponse(res, 200, null, "Session ended");
  } catch (err) {
    console.error("endSession error:", err.message);
    return sendError(res, 500, "Failed to end session");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /engagement/sessions  (admin only)
// Returns paginated raw session list with filters.
// Query: page, limit, dateFrom, dateTo, engagedOnly, purchasedOnly
// ─────────────────────────────────────────────────────────────────────────────
export const getSessions = async (req, res) => {
  try {
    const {
      page        = 1,
      limit       = 50,
      dateFrom,
      dateTo,
      engagedOnly,
      abandonedOnly,  // engaged but no purchase
    } = req.query;

    const query = {};
    if (dateFrom || dateTo) {
      query.startedAt = {};
      if (dateFrom) query.startedAt.$gte = new Date(dateFrom);
      if (dateTo)   query.startedAt.$lte = new Date(new Date(dateTo).setHours(23, 59, 59, 999));
    }
    if (engagedOnly  === "true") query.engaged   = true;
    if (abandonedOnly === "true") { query.engaged = true; query.purchased = false; }

    const skip  = (Number(page) - 1) * Number(limit);
    const total = await CustomerSessionModel.countDocuments(query);
    const sessions = await CustomerSessionModel.find(query)
      .sort({ startedAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate("customerId", "name email role");

    return sendResponse(res, 200, {
      sessions,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    }, "Sessions retrieved");
  } catch (err) {
    console.error("getSessions error:", err.message);
    return sendError(res, 500, "Failed to fetch sessions");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /engagement/daily  (admin only)
// Returns daily aggregate stats for chart rendering.
// Query: days (default 30)
// ─────────────────────────────────────────────────────────────────────────────
export const getDailyStats = async (req, res) => {
  try {
    const days  = Math.min(365, Math.max(1, Number(req.query.days) || 30));
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().slice(0, 10);

    const stats = await DailyEngagementModel.find({ date: { $gte: sinceStr } })
      .sort({ date: 1 });

    return sendResponse(res, 200, { stats }, "Daily stats retrieved");
  } catch (err) {
    console.error("getDailyStats error:", err.message);
    return sendError(res, 500, "Failed to fetch daily stats");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /engagement/sessions/:id   (admin only)
// ─────────────────────────────────────────────────────────────────────────────
export const deleteSession = async (req, res) => {
  try {
    await CustomerSessionModel.findByIdAndDelete(req.params.id);
    return sendResponse(res, 200, null, "Session deleted");
  } catch (err) {
    console.error("deleteSession error:", err.message);
    return sendError(res, 500, "Failed to delete session");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /engagement/sessions/bulk   (admin only)
// Body: { ids: string[] }
// ─────────────────────────────────────────────────────────────────────────────
export const bulkDeleteSessions = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || !ids.length) return sendError(res, 400, "ids array required");
    await CustomerSessionModel.deleteMany({ _id: { $in: ids } });
    return sendResponse(res, 200, null, `${ids.length} session(s) deleted`);
  } catch (err) {
    console.error("bulkDeleteSessions error:", err.message);
    return sendError(res, 500, "Failed to delete sessions");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /engagement/sessions/all   (admin only)
// Body: { confirm: "DELETE_ALL" }
// ─────────────────────────────────────────────────────────────────────────────
export const deleteAllSessions = async (req, res) => {
  try {
    if (req.body.confirm !== "DELETE_ALL") {
      return sendError(res, 400, 'Send { confirm: "DELETE_ALL" } to confirm this destructive action');
    }
    const result = await CustomerSessionModel.deleteMany({});
    return sendResponse(res, 200, { deleted: result.deletedCount }, "All sessions deleted");
  } catch (err) {
    console.error("deleteAllSessions error:", err.message);
    return sendError(res, 500, "Failed to delete all sessions");
  }
};
