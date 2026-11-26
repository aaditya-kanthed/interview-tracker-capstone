const prisma = require('../config/prisma');
const AppError = require('../utils/AppError');

function createJob(data, hrUserId) {
  return prisma.job.create({ data: { ...data, createdById: hrUserId } });
}

// Shown on the public homepage
function listOpenJobs() {
  return prisma.job.findMany({ where: { isOpen: true }, orderBy: { createdAt: 'desc' } });
}

// HR job list: open and closed, with how many candidates applied
function listAllJobs() {
  return prisma.job.findMany({
    include: { _count: { select: { candidates: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

async function getJob(id) {
  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) throw AppError.notFound('Job not found');
  return job;
}

// Used when a candidate applies: the job must exist AND be open
async function getOpenJob(id) {
  const job = await getJob(id);
  if (!job.isOpen) throw AppError.badRequest('This job is closed for applications');
  return job;
}

async function updateJob(id, data) {
  await getJob(id); // 404 if it does not exist
  return prisma.job.update({ where: { id }, data });
}

async function setJobOpen(id, isOpen) {
  await getJob(id);
  return prisma.job.update({ where: { id }, data: { isOpen } });
}

module.exports = {
  createJob,
  listOpenJobs,
  listAllJobs,
  getJob,
  getOpenJob,
  updateJob,
  setJobOpen,
};
