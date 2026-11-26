const path = require('path');
const prisma = require('../config/prisma');
const AppError = require('../utils/AppError');
const { ROLES, STAGES, STATUS } = require('../utils/constants');
const { createOneTimeToken } = require('../utils/helpers');
const { UPLOAD_DIR } = require('../middlewares/upload');
const emailService = require('./emailService');
const jobService = require('./jobService');

const USER_FIELDS = { id: true, fullName: true, email: true, mobileCode: true, mobile: true };

const FULL_DETAILS = {
  user: { select: USER_FIELDS },
  job: true,
  interviews: {
    include: { panels: { include: { panel: { select: { id: true, fullName: true } } } } },
  },
};

// HR creates the candidate's account (inside the transaction `tx`).
// Returns the one-time token so we can email a "set password" link after saving.
async function createUserForCandidate(tx, { fullName, email }) {
  if (!fullName || !email) throw AppError.badRequest('Full name and email are required');
  if (await tx.user.findUnique({ where: { email } })) {
    throw AppError.conflict('A user with this email already exists');
  }
  const { token, tokenHash, tokenExpiresAt } = createOneTimeToken();
  const user = await tx.user.create({
    data: { fullName, email, role: ROLES.CANDIDATE, tokenHash, tokenExpiresAt },
  });
  return { userId: user.id, token };
}

// Rules: one application per candidate + no two users with the same mobile number
async function assertNoDuplicates(existingUserId, { mobileCode, mobile }) {
  if (
    existingUserId &&
    (await prisma.candidate.findUnique({ where: { userId: existingUserId } }))
  ) {
    throw AppError.conflict('Only one job application is allowed per candidate');
  }
  const where = { mobileCode, mobile };
  if (existingUserId) where.NOT = { id: existingUserId };
  if (await prisma.user.findFirst({ where })) {
    throw AppError.conflict('This mobile number is already registered');
  }
}

async function createProfile(input, resumeFile, actor) {
  if (!resumeFile) throw AppError.badRequest('Resume (PDF) is required');
  await jobService.getOpenJob(input.jobId);

  const { fullName, email, mobileCode, mobile, ...profile } = input;
  const isCandidate = actor.role === ROLES.CANDIDATE;
  await assertNoDuplicates(isCandidate ? actor.id : null, { mobileCode, mobile });

  // All writes succeed together or not at all (no half-created users)
  const { candidate, newUser } = await prisma.$transaction(async (tx) => {
    const created = isCandidate ? null : await createUserForCandidate(tx, { fullName, email });
    const userId = created ? created.userId : actor.id;
    await tx.user.update({ where: { id: userId }, data: { mobileCode, mobile } });
    const saved = await tx.candidate.create({
      data: { ...profile, userId, resumeFile: resumeFile.filename }, // status = PROFILING_COMPLETED
    });
    return { candidate: saved, newUser: created };
  });

  if (newUser) await emailService.sendSetPassword(email, fullName, newUser.token);
  return candidate;
}

async function listCandidates({ jobId, stage, status, search, page, size }) {
  const where = {
    jobId,
    stage,
    status,
    ...(search && {
      user: {
        OR: [
          { fullName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      },
    }),
  };
  const [total, items] = await prisma.$transaction([
    prisma.candidate.count({ where }),
    prisma.candidate.findMany({
      where,
      include: { user: { select: USER_FIELDS }, job: { select: { id: true, title: true } } },
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * size,
      take: size,
    }),
  ]);
  return { total, page, size, items };
}

// HR dashboard numbers: how many candidates are in each stage and each status
async function getStats() {
  const [byStageRows, byStatusRows] = await prisma.$transaction([
    prisma.candidate.groupBy({ by: ['stage'], _count: { _all: true }, orderBy: { stage: 'asc' } }),
    prisma.candidate.groupBy({
      by: ['status'],
      _count: { _all: true },
      orderBy: { status: 'asc' },
    }),
  ]);
  const countBy = (rows, key, keys) => {
    const found = Object.fromEntries(rows.map((r) => [r[key], r._count._all]));
    return Object.fromEntries(keys.map((k) => [k, found[k] || 0]));
  };
  const byStatus = countBy(byStatusRows, 'status', Object.values(STATUS));
  return {
    total: Object.values(byStatus).reduce((sum, n) => sum + n, 0),
    byStage: countBy(byStageRows, 'stage', STAGES),
    byStatus,
  };
}

const isAssignedPanel = (candidate, panelId) =>
  candidate.interviews.some((i) => i.panels.some((p) => p.panelId === panelId));

// HR sees everything. Candidate sees own profile. Panel sees assigned candidates.
// Feedback is loaded ONLY for HR, so candidates can never see it.
async function getCandidate(id, viewer) {
  const include =
    viewer.role === ROLES.HR
      ? {
          ...FULL_DETAILS,
          interviews: {
            include: {
              ...FULL_DETAILS.interviews.include,
              feedbacks: { include: { panel: { select: { fullName: true } } } },
            },
          },
        }
      : FULL_DETAILS;
  const candidate = await prisma.candidate.findUnique({ where: { id }, include });
  if (!candidate) throw AppError.notFound('Candidate not found');

  const allowed =
    viewer.role === ROLES.HR ||
    (viewer.role === ROLES.CANDIDATE && candidate.userId === viewer.id) ||
    (viewer.role === ROLES.PANEL && isAssignedPanel(candidate, viewer.id));
  if (!allowed) throw AppError.forbidden();
  return candidate;
}

async function getMyProfile(viewer) {
  const mine = await prisma.candidate.findUnique({ where: { userId: viewer.id } });
  if (!mine) throw AppError.notFound('You have not applied for a job yet');
  return getCandidate(mine.id, viewer);
}

async function getResumePath(id, viewer) {
  const candidate = await getCandidate(id, viewer); // same permission rules
  return path.join(UPLOAD_DIR, path.basename(candidate.resumeFile));
}

module.exports = {
  createProfile,
  listCandidates,
  getStats,
  getCandidate,
  getMyProfile,
  getResumePath,
};
