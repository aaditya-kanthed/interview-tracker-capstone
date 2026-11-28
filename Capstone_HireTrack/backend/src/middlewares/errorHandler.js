// Centralized exception handling (replaces @ControllerAdvice)
const fs = require('fs');
const multer = require('multer');
const logger = require('../config/logger');
const AppError = require('../utils/AppError');

function notFound(req, _res, next) {
  next(AppError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

function toResponse(err) {
  if (err instanceof AppError) return [err.status, { error: err.message, details: err.details }];
  if (err instanceof multer.MulterError) return [400, { error: err.message }];
  if (err.type === 'entity.parse.failed') return [400, { error: 'Invalid JSON body' }];
  if (err.code === 'P2002') return [409, { error: 'This record already exists' }];
  if (err.code === 'P2025') return [404, { error: 'Record not found' }];
  // PostgreSQL is not running, or DATABASE_URL in .env is wrong
  if (err.name === 'PrismaClientInitializationError') {
    return [503, { error: 'Cannot connect to the database. Please try again in a moment.' }];
  }
  return null;
}

function errorHandler(err, req, res, _next) {
  // If a resume was uploaded but the request failed, delete the file again
  if (req.file) fs.unlink(req.file.path, () => {});

  const known = toResponse(err);
  if (known) {
    const [status, body] = known;
    if (status >= 500) {
      logger.error(
        `${req.method} ${req.originalUrl} -> ${status}: database unreachable. Is PostgreSQL running? Check DATABASE_URL in .env`,
      );
    } else {
      logger.warn(`${req.method} ${req.originalUrl} -> ${status} ${body.error}`);
    }
    return res.status(status).json(body);
  }
  logger.error(err);
  return res.status(500).json({ error: 'Something went wrong. Please try again.' });
}

module.exports = { notFound, errorHandler };
