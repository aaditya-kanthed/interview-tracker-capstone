// JWT login check + role check (replaces Spring Security)
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');
const AppError = require('../utils/AppError');

// While a user still has a temporary password, only these APIs are allowed
const ALLOWED_WITH_TEMP_PASSWORD = ['/api/auth/change-password', '/api/auth/account'];

function authenticate(req, _res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) return next(AppError.unauthorized());

  let payload;
  try {
    payload = jwt.verify(token, jwtSecret);
  } catch {
    return next(AppError.unauthorized('Session expired, please log in again'));
  }
  req.user = { id: Number(payload.sub), role: payload.role };
  if (payload.mcp && !ALLOWED_WITH_TEMP_PASSWORD.includes(req.originalUrl.split('?')[0])) {
    return next(AppError.forbidden('Please change your temporary password first'));
  }
  return next();
}

// Usage: authorize('HR') or authorize('HR', 'PANEL')
function authorize(...roles) {
  return (req, _res, next) =>
    roles.includes(req.user?.role) ? next() : next(AppError.forbidden());
}

module.exports = { authenticate, authorize };
