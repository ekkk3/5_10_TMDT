const { errorResponse } = require('../common/response.helper');

const notFoundHandler = (req, res) => {
  return errorResponse(res, `Route ${req.originalUrl} not found`, 404);
};

module.exports = { notFoundHandler };
