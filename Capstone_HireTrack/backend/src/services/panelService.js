const bcrypt = require('bcrypt');
const prisma = require('../config/prisma');
const AppError = require('../utils/AppError');
const { ROLES } = require('../utils/constants');
const { createTempPassword } = require('../utils/helpers');
const emailService = require('./emailService');

const PANEL_FIELDS = {
  id: true,
  fullName: true,
  email: true,
  mobileCode: true,
  mobile: true,
  organization: true,
  designation: true,
  isActive: true,
  mustChangePassword: true,
};

async function createPanel(data) {
  const sameEmail = await prisma.user.findUnique({ where: { email: data.email } });
  if (sameEmail) throw AppError.conflict('A user with this email already exists');

  // Created as inactive. HR activates later -> email with login email + temporary password.
  return prisma.user.create({
    data: { ...data, role: ROLES.PANEL, isActive: false },
    select: PANEL_FIELDS,
  });
}

function listPanels({ activeOnly = false } = {}) {
  return prisma.user.findMany({
    where: { role: ROLES.PANEL, ...(activeOnly && { isActive: true }) },
    select: PANEL_FIELDS,
    orderBy: { fullName: 'asc' },
  });
}

// Activates the panel member (first time) or resends new login details (later).
// A new temporary password is created each time; only its hash is stored.
// The panel member must choose their own password after logging in.
async function sendLoginDetails(id) {
  const panel = await prisma.user.findFirst({ where: { id, role: ROLES.PANEL } });
  if (!panel) throw AppError.notFound('Panel member not found');

  const tempPassword = createTempPassword();
  const updated = await prisma.user.update({
    where: { id },
    data: {
      isActive: true,
      isVerified: true,
      mustChangePassword: true,
      passwordHash: await bcrypt.hash(tempPassword, 10),
      tokenHash: null,
      tokenExpiresAt: null,
    },
    select: PANEL_FIELDS,
  });
  const emailSent = await emailService.sendPanelLogin(panel.email, panel.fullName, tempPassword);
  return { ...updated, emailSent, firstTime: !panel.isActive };
}

module.exports = { createPanel, listPanels, sendLoginDetails };
