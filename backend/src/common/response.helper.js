const successResponse = (res, message, data = null, statusCode = 200) => {
  const payload = {
    success: true,
    message
  };

  if (data !== null) {
    payload.data = data;
  }

  return res.status(statusCode).json(payload);
};

const errorResponse = (res, message, statusCode = 500, errors = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors
  });
};

module.exports = {
  successResponse,
  errorResponse
};
