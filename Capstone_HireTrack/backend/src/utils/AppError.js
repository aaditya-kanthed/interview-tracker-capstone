// Our own error type. The central error handler turns it into a JSON response.
class AppError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }

  static badRequest(message, details) {
    return new AppError(400, message, details);
  }

  static unauthorized(message = 'Please log in') {
    return new AppError(401, message);
  }

  static forbidden(message = 'You are not allowed to do this') {
    return new AppError(403, message);
  }

  static notFound(message = 'Not found') {
    return new AppError(404, message);
  }

  static conflict(message) {
    return new AppError(409, message);
  }
}

module.exports = AppError;
