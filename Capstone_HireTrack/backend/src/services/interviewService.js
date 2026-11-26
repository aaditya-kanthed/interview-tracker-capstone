const prisma = require('../config/prisma');
const AppError = require('../utils/AppError');
const { ROLES, STATUS } = require('../utils/constants');
const emailService = require('./emailService');

const STAGE_FOR_ROUND = { L1: 'L1_TECHNICAL', L2: 'L2_TECHNICAL' };

async function loadActivePanels(panelIds) {
  const panels = await prisma.user.findMany({
    where: { id: { in: panelIds }, role: ROLES.PANEL, isActive: true },
  });
  if (panels.length !== panelIds.length) {
    throw AppError.badRequest('Every selected panel member must exist and be active');
  }
  return panels;
}

async function scheduleInterview(
  candidateId,
  { round, scheduledAt, panelIds, focusAreas, meetingLink },
) {
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: { user: true },
  });
  if (!candidate) throw AppError.notFound('Candidate not found');
  if (candidate.status === STATUS.REJECTED || candidate.status === STATUS.SELECTED) {
    throw AppError.badRequest('Candidate is no longer in the process');
  }
  if (candidate.stage !== STAGE_FOR_ROUND[round]) {
    throw AppError.badRequest(`Move the candidate to ${STAGE_FOR_ROUND[round]} first`);
  }
  const panels = await loadActivePanels(panelIds);

  const interview = await prisma.interview.create({
    data: {
      candidateId,
      round,
      scheduledAt,
      focusAreas,
      meetingLink: meetingLink || null,
      panels: { create: panelIds.map((panelId) => ({ panelId })) },
    },
  });

  await emailService.sendInterviewScheduled(candidate.user.email, {
    candidateName: candidate.user.fullName,
    round,
    scheduledAt,
    panelNames: panels.map((p) => p.fullName),
    meetingLink: interview.meetingLink,
  });
  for (const panel of panels) {
    await emailService.sendPanelAssigned(panel.email, {
      panelName: panel.fullName,
      candidateName: candidate.user.fullName,
      round,
      scheduledAt,
      meetingLink: interview.meetingLink,
    });
  }
  return interview;
}

// Panel dashboard: my interviews with candidate, JD and focus areas
function listInterviewsForPanel(panelId) {
  return prisma.interview.findMany({
    where: { panels: { some: { panelId } } },
    include: {
      candidate: {
        include: { user: { select: { fullName: true, email: true } }, job: true },
      },
      feedbacks: { where: { panelId } }, // only MY feedback
    },
    orderBy: { scheduledAt: 'asc' },
  });
}

async function submitFeedback(interviewId, panelId, data) {
  const interview = await prisma.interview.findUnique({
    where: { id: interviewId },
    include: { panels: true, feedbacks: true },
  });
  if (!interview) throw AppError.notFound('Interview not found');
  if (!interview.panels.some((p) => p.panelId === panelId)) {
    throw AppError.forbidden('You are not a panel member for this interview');
  }
  if (interview.feedbacks.some((f) => f.panelId === panelId)) {
    throw AppError.conflict('You have already submitted feedback');
  }
  return prisma.feedback.create({ data: { ...data, interviewId, panelId } });
}

module.exports = { scheduleInterview, listInterviewsForPanel, submitFeedback };
