// server/middleware/validate.js
export const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false
    });

    if (error) {
      const errors = error.details.map(e => ({
        field: e.path.join('.'),
        message: e.message.replace(/"/g, ''),
        value: e.context.value
      }));

      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Validation failed",
        errors,
        timestamp: new Date().toISOString(),
      });
    }

    req.body = value;
    next();
  };
};

// Query parameter validation
export const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map(e => ({
        field: e.path.join('.'),
        message: e.message.replace(/"/g, ''),
      }));

      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Invalid query parameters",
        errors,
        timestamp: new Date().toISOString(),
      });
    }

    req.query = value;
    next();
  };
};