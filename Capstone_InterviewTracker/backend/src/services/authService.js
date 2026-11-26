const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const prisma = require('../config/prisma');
const { jwtSecret, jwtExpiresIn, googleClientId } = require('../config/env');
const AppError = require('../utils/AppError');
const { createOneTimeToken, hashToken } = require('../utils/helpers');
const { ROLES } = require('../utils/constants');
const emailService = require('./emailService');

const CLEAR_TOKEN = { tokenHash: null, tokenExpiresAt: null };

async function registerCandidate({ fullName, email, password }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw AppError.conflict('An account with this email already exists');

  const { token, tokenHash, tokenExpiresAt } = createOneTimeToken();
  const user = await prisma.user.create({
    data: {
      fullName,
      email,
      role: ROLES.CANDIDATE,
      passwordHash: await bcrypt.hash(password, 10),
      tokenHash,
      tokenExpiresAt,
    },
  });
  await emailService.sendVerification(email, fullName, token);
  return { id: user.id, email: user.email };
}

async function findUserByToken(token) {
  const user = await prisma.user.findFirst({
    where: { tokenHash: hashToken(token), tokenExpiresAt: { gt: new Date() } },
  });
  if (!user) throw AppError.badRequest('This link is invalid or has expired');
  return user;
}

async function verifyEmail(token) {
  const user = await findUserByToken(token);
  await prisma.user.update({ where: { id: user.id }, data: { isVerified: true, ...CLEAR_TOKEN } });
}

// Used by panel members (and candidates created by HR) from the emailed link
async function setPassword(token, password) {
  const user = await findUserByToken(token);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await bcrypt.hash(password, 10),
      isVerified: true,
      mustChangePassword: false,
      ...CLEAR_TOKEN,
    },
  });
}

// Our own JWT + the user details the frontend needs.
// mustChangePassword goes into the token so the server can block everything else until it's done.
function issueLogin(user) {
  const mustChangePassword = Boolean(user.mustChangePassword);
  const payload = {
    sub: String(user.id),
    role: user.role,
    ...(mustChangePassword && { mcp: true }),
  };
  const token = jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiresIn });
  return {
    token,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      mustChangePassword,
    },
  };
}

// Logged-in user changes their own password (also used after a temporary password)
async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw AppError.unauthorized();
  // Accounts made with Google may have no password yet; everyone else must prove the old one
  if (user.passwordHash && !(await bcrypt.compare(currentPassword || '', user.passwordHash))) {
    throw AppError.badRequest('Current password is wrong', {
      currentPassword: ['Current password is wrong'],
    });
  }
  if (currentPassword && currentPassword === newPassword) {
    throw AppError.badRequest('Choose a new password', {
      newPassword: ['New password must be different from the current one'],
    });
  }
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await bcrypt.hash(newPassword, 10), mustChangePassword: false },
  });
  return issueLogin(updated); // fresh token without the "must change" mark
}

async function getAccount(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw AppError.unauthorized();
  return { hasPassword: Boolean(user.passwordHash), mustChangePassword: user.mustChangePassword };
}

async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  const ok = user?.passwordHash && (await bcrypt.compare(password, user.passwordHash));
  if (!ok) throw AppError.unauthorized('Wrong email or password');
  if (!user.isVerified) throw AppError.forbidden('Please verify your email first');
  if (!user.isActive) throw AppError.forbidden('Your account is not active');
  return issueLogin(user);
}

// ---------- Sign in with Google ----------
const googleClient = new OAuth2Client();

// Checks the token Google gave the browser: real signature, made for OUR app, not expired
async function verifyGoogleToken(credential) {
  if (!googleClientId) throw AppError.badRequest('Google sign-in is not set up on this server');
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: googleClientId,
    });
    return ticket.getPayload();
  } catch {
    throw AppError.unauthorized('Google sign-in failed. Please try again.');
  }
}

async function loginWithGoogle(credential) {
  const google = await verifyGoogleToken(credential);
  if (!google?.email || !google.email_verified) {
    throw AppError.unauthorized('Your Google email address is not verified');
  }
  const email = google.email.toLowerCase();
  let user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    // New person: Google sign-up is only for candidates. HR adds HR and panel members.
    user = await prisma.user.create({
      data: {
        fullName: google.name || email.split('@')[0],
        email,
        role: ROLES.CANDIDATE,
        isVerified: true,
      },
    });
  } else {
    if (!user.isActive)
      throw AppError.forbidden('Your account is not active yet. Ask HR to activate it.');
    if (!user.isVerified) {
      // Google has proved they own this email, so no verification link is needed
      user = await prisma.user.update({
        where: { id: user.id },
        data: { isVerified: true, ...CLEAR_TOKEN },
      });
    }
  }
  return issueLogin(user);
}

module.exports = {
  registerCandidate,
  verifyEmail,
  setPassword,
  login,
  loginWithGoogle,
  changePassword,
  getAccount,
};
