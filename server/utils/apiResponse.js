// server/utils/apiResponse.js
class ApiResponse {
  constructor(statusCode, data, message = "Success") {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
    this.timestamp = new Date().toISOString();
  }
}

export const sendResponse = (res, statusCode, data, message) => {
  res.status(statusCode).json(new ApiResponse(statusCode, data, message));
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
};