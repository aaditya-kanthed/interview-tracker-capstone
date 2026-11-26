const crypto = require('crypto');
const AppError = require('./AppError');

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Turns "/candidates/12" into the number 12, or rejects bad ids like "abc"
function parseId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw AppError.badRequest('Invalid id');
  return id;
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Secure one-time link token (email verification, set password).
// We email the raw token but store only its hash in the database.
function createOneTimeToken() {
  const token = crypto.randomBytes(32).toString('hex');
  return { token, tokenHash: hashToken(token), tokenExpiresAt: new Date(Date.now() + ONE_DAY_MS) };
}

// Readable temporary password, e.g. "Kp7m-Rt4x-Wq9z" (no 0/O/1/l/I to avoid confusion)
function createTempPassword() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const group = () =>
    letters[crypto.randomInt(letters.length)] +
    letters[crypto.randomInt(letters.length)] +
    digits[crypto.randomInt(digits.length)] +
    letters[crypto.randomInt(letters.length)];
  return `${group()}-${group()}-${group()}`;
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
}

module.exports = { parseId, hashToken, createOneTimeToken, createTempPassword, escapeHtml };
