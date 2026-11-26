// CORE BUSINESS LOGIC: moving a candidate through the interview stages.
// Profiling -> Screening -> L1 Technical -> L2 Technical -> HR Round -> Selected / Rejected
const prisma = require('../config/prisma');
const AppError = require('../utils/AppError');
const { STATUS, ROUND_FOR_STAGE } = require('../utils/constants');
const emailService = require('./emailService');

const NEXT_STAGE = {
  PROFILING: 'SCREENING',
  SCREENING: 'L1_TECHNICAL',
  L1_TECHNICAL: 'L2_TECHNICAL',
  L2_TECHNICAL: 'HR_ROUND',
};

async function loadCandidate(id) {
  const candidate = await prisma.candidate.findUnique({
    where: { id },
    include: { user: true, interviews: { include: { panels: true, feedbacks: true } } },
  });
  if (!candidate) throw AppError.notFound('Candidate not found');
  return candidate;
}

function assertStillInProcess(candidate) {
  if (candidate.status === STATUS.SELECTED || candidate.status === STATUS.REJECTED) {
    throw AppError.badRequest(`Candidate is already ${candidate.status}`);
  }
}

// L1/L2 can only be passed after EVERY assigned panel member gave feedback
function assertFeedbackComplete(candidate) {
  const round = ROUND_FOR_STAGE[candidate.stage];
  if (!round) return; // Profiling / Screening have no panel interview

  const interview = candidate.interviews.find((i) => i.round === round);
  if (!interview) throw AppError.badRequest(`${round} interview has not been scheduled yet`);
  if (interview.feedbacks.length < interview.panels.length) {
    throw AppError.badRequest(`All panel members must submit ${round} feedback first`);
  }
}

async function saveAndNotify(candidate, data) {
  const updated = await prisma.candidate.update({ where: { id: candidate.id }, data });
  await emailService.sendStatusUpdate(candidate.user.email, {
    candidateName: candidate.user.fullName,
    stage: updated.stage,
    status: updated.status,
  });
  return updated;
}

async function moveToNextStage(candidateId) {
  const candidate = await loadCandidate(candidateId);
  assertStillInProcess(candidate);

  const next = NEXT_STAGE[candidate.stage];
  if (!next) throw AppError.badRequest('Candidate is in the HR round. Make the final decision.');
  assertFeedbackComplete(candidate);

  return saveAndNotify(candidate, { stage: next, status: STATUS.IN_PROGRESS });
}

// HR can reject at ANY stage
async function reject(candidateId, comments) {
  const candidate = await loadCandidate(candidateId);
  assertStillInProcess(candidate);
  return saveAndNotify(candidate, { status: STATUS.REJECTED, finalComments: comments });
}

// Final decision only in the HR round, with mandatory comments
async function finalDecision(candidateId, { decision, comments }) {
  const candidate = await loadCandidate(candidateId);
  assertStillInProcess(candidate);
  if (candidate.stage !== 'HR_ROUND') {
    throw AppError.badRequest('Final decision can only be made in the HR round');
  }
  return saveAndNotify(candidate, { status: decision, finalComments: comments });
}

module.exports = { moveToNextStage, reject, finalDecision, NEXT_STAGE };
