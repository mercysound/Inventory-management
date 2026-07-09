// server/routes/maintenanceRoutes.js
// SSE endpoint that non-admin clients connect to.
// When admin triggers maintenance mode, the server pushes a "maintenanceStarted"
// event. All connected clients show a notification then auto-logout.
import express from "express";
import EventEmitter from "events";

// Singleton emitter — shared with settingsController
if (!global.maintenanceEmitter) {
  global.maintenanceEmitter = new EventEmitter();
  global.maintenanceEmitter.setMaxListeners(500);
}

const router = express.Router();

// GET /maintenance/stream
// Client connects with ?token=... (same pattern as placed-orders SSE).
// No auth middleware needed — the admin pushes to ALL connected sessions.
router.get("/stream", (req, res) => {
  res.set({
    "Content-Type":  "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection":    "keep-alive",
  });
  res.flushHeaders?.();

  const send = (name, data) => {
    try { res.write(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`); } catch {}
  };

  // Keep-alive ping every 25s
  const ka = setInterval(() => { try { res.write(": ping\n\n"); } catch {} }, 25000);

  const onStarted = (payload) => send("maintenanceStarted", payload);
  const onEnded   = (payload) => send("maintenanceEnded",   payload);

  global.maintenanceEmitter.on("maintenanceStarted", onStarted);
  global.maintenanceEmitter.on("maintenanceEnded",   onEnded);

  req.on("close", () => {
    clearInterval(ka);
    global.maintenanceEmitter.removeListener("maintenanceStarted", onStarted);
    global.maintenanceEmitter.removeListener("maintenanceEnded",   onEnded);
  });
});

export default router;
