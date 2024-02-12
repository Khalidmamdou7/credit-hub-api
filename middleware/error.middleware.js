const logger = require('../configs/logger');

module.exports = function errorMiddleware(error, req, res, next) {
  logger.error(error.message, error)

  res.status(error.code || 500)
    .json({
      status: 'error',
      code: error.code || 500,
      message: error.message,
      details: error.details,
    })
}