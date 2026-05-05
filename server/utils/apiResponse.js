// server/utils/apiResponse.js
class ApiResponse {
  constructor(statusCode, data, message = "Success", meta = null) {
    this.success = statusCode < 400;
    this.statusCode = statusCode;
    this.message = message;
    this.timestamp = new Date().toISOString();

    if (meta) {
      this.meta = meta;
    }

    if (data !== undefined && data !== null) {
      if (Array.isArray(data) || typeof data !== "object") {
        this.data = data;
      } else {
        Object.assign(this, data);
      }
    }
  }
}

export const sendResponse = (res, statusCode, data, message, meta = null) => {
  res.status(statusCode).json(new ApiResponse(statusCode, data, message, meta));
};

export const sendError = (res, statusCode, message, errors = null) => {
  const response = {
    success: false,
    statusCode,
    message,
    timestamp: new Date().toISOString(),
  };

  if (errors) {
    response.errors = errors;
  }

  res.status(statusCode).json(response);
  console.log("Error Sent:", message);
};