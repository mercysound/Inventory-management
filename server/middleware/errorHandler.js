// server/middleware/errorHandler.js
export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  // Log errors for monitoring
  console.error({
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    statusCode,
    message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    userId: req.user?._id || "anonymous",
    userAgent: req.get("User-Agent"),
  });

  // Handle specific error types
  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      statusCode: 400,
      message: "Validation Error",
      errors: Object.values(err.errors).map(e => e.message),
      timestamp: new Date().toISOString(),
    });
  }

  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      statusCode: 400,
      message: "Invalid ID format",
      timestamp: new Date().toISOString(),
    });
  }

  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      statusCode: 409,
      message: "Duplicate field value",
      timestamp: new Date().toISOString(),
    });
  }

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};