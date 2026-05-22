const { env } = require('../config/env');
const { errorResponse } = require('../common/response.helper');

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal server error';
  const errors = env.nodeEnv === 'production' ? null : err.errors || err.stack;

  return errorResponse(res, message, statusCode, errors);
};

module.exports = { errorHandler };
