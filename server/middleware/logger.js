// server/middleware/logger.js
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  const timestamp = new Date().toISOString();

  // Log incoming request
  console.log(JSON.stringify({
    timestamp,
    method: req.method,
    path: req.path,
    query: req.query,
    userAgent: req.get("User-Agent"),
    ip: req.ip || req.connection.remoteAddress,
  }));

  // Log response when finished
  res.on("finish", () => {
    const duration = Date.now() - start;
    const logData = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?._id || "anonymous",
      contentLength: res.get("Content-Length") || 0,
    };

    // Color code based on status
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