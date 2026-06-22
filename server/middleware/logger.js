// server/middleware/logger.js
//
// Request / response logger.
// Filters out high-frequency noise to keep the terminal readable:
//   - SSE stream connections (/stream) — persistent keep-alive, not real requests
//   - GET / with no meaningful content (ping responses)
//   - The /settings/theme public endpoint called on every page load
//   - The /settings/my-delegation staff check called on every sidebar mount

const SILENT_PATHS = [
  "/api/placed-orders/stream",
  "/api/orders/stream",
  "/api/settings/theme",
  "/api/settings/my-delegation",
];

// Returns true for requests that should NOT be logged
const isSilent = (req) => {
  const path = req.path || "";

  // SSE streams — persistent connections, logs nothing useful
  if (path.includes("/stream")) return true;

  // Exact path matches
  if (SILENT_PATHS.includes(path)) return true;

  return false;
};

export const requestLogger = (req, res, next) => {
  if (isSilent(req)) return next(); // skip silently

  const start     = new Date();
  const timestamp = start.toISOString();

  // Log incoming request
  console.log(JSON.stringify({
    timestamp,
    method:    req.method,
    path:      req.path,
    query:     Object.keys(req.query).length ? req.query : undefined,
    userAgent: req.get("User-Agent"),
    ip:        req.ip || req.connection?.remoteAddress,
  }));

  // Log response when finished
  res.on("finish", () => {
    const duration = Date.now() - start.getTime();
    const logData  = {
      timestamp:     new Date().toISOString(),
      method:        req.method,
      path:          req.path,
      statusCode:    res.statusCode,
      duration:      `${duration}ms`,
      userId:        req.user?._id || "anonymous",
      contentLength: res.get("Content-Length") || 0,
    };

    if (res.statusCode >= 500) {
      console.error(JSON.stringify({ ...logData, level: "error" }));
    } else if (res.statusCode >= 400) {
      console.warn(JSON.stringify({ ...logData, level: "warn" }));
    } else {
      console.log(JSON.stringify({ ...logData, level: "info" }));
    }
  });

  next();
};
