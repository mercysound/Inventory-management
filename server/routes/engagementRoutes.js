// server/routes/engagementRoutes.js
import express from "express";
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware.js";
import {
  startSession, recordAction, endSession,
  getSessions, getDailyStats,
  deleteSession, bulkDeleteSessions, deleteAllSessions,
} from "../controllers/engagementController.js";

const router = express.Router();

// ── Session tracking — any authenticated user ─────────────────────────────
router.post("/session/start",  authMiddleware, startSession);
router.post("/session/action", authMiddleware, recordAction);
router.post("/session/end",    authMiddleware, endSession);

// ── Admin dashboard reads ──────────────────────────────────────────────────
router.get("/sessions", authMiddleware, authorizeRoles("admin"), getSessions);
router.get("/daily",    authMiddleware, authorizeRoles("admin"), getDailyStats);

// ── Admin deletes ──────────────────────────────────────────────────────────
router.delete("/sessions/all",  authMiddleware, authorizeRoles("admin"), deleteAllSessions);
router.delete("/sessions/bulk", authMiddleware, authorizeRoles("admin"), bulkDeleteSessions);
router.delete("/sessions/:id",  authMiddleware, authorizeRoles("admin"), deleteSession);

export default router;
