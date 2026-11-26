jest.mock('../src/config/prisma', () => require('./mockPrisma')());
jest.mock('../src/services/emailService', () => ({ sendSetPassword: jest.fn() }));

const path = require('path');
const prisma = require('../src/config/prisma');
const emailService = require('../src/services/emailService');
const candidateService = require('../src/services/candidateService');
const { UPLOAD_DIR } = require('../src/middlewares/upload');

const resume = { filename: 'abc.pdf' };
const candidateActor = { id: 7, role: 'CANDIDATE' };
const hrActor = { id: 1, role: 'HR' };

const profileInput = (extra = {}) => ({
  mobileCode: '+91',
  mobile: '9876543210',
  totalExperience: 3,
  relevantExperience: 2,
  currentCtc: 500000,
  expectedCtc: 700000,
  noticePeriodDays: 30,
  preferredLocation: 'Pune',
  source: 'LINKEDIN',
  jobId: 2,
  ...extra,
});

beforeEach(() => {
  jest.clearAllMocks();
  prisma.job.findUnique.mockResolvedValue({ id: 2, isOpen: true });
  prisma.candidate.findUnique.mockResolvedValue(null);
  prisma.user.findFirst.mockResolvedValue(null);
  prisma.user.findUnique.mockResolvedValue(null);
  prisma.candidate.create.mockImplementation(({ data }) => Promise.resolve({ id: 11, ...data }));
});

describe('createProfile', () => {
  test('requires a resume', async () => {
    await expect(
      candidateService.createProfile(profileInput(), undefined, candidateActor),
    ).rejects.toThrow('Resume (PDF) is required');
  });

  test('rejects a closed job', async () => {
    prisma.job.findUnique.mockResolvedValue({ id: 2, isOpen: false });
    await expect(
      candidateService.createProfile(profileInput(), resume, candidateActor),
    ).rejects.toThrow('closed');
  });

  test('rejects a job that does not exist', async () => {
    prisma.job.findUnique.mockResolvedValue(null);
    await expect(
      candidateService.createProfile(profileInput(), resume, candidateActor),
    ).rejects.toMatchObject({ status: 404 });
  });

  test('allows only one application per candidate', async () => {
    prisma.candidate.findUnique.mockResolvedValue({ id: 3 });
    await expect(
      candidateService.createProfile(profileInput(), resume, candidateActor),
    ).rejects.toThrow('Only one job application');
  });

  test('blocks a mobile number used by another user', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 99 });
    await expect(
      candidateService.createProfile(profileInput(), resume, candidateActor),
    ).rejects.toThrow('mobile number is already registered');
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { mobileCode: '+91', mobile: '9876543210', NOT: { id: 7 } },
    });
  });

  test('candidate applies for themselves', async () => {
    const result = await candidateService.createProfile(profileInput(), resume, candidateActor);

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { mobileCode: '+91', mobile: '9876543210' },
    });
    expect(result).toMatchObject({ id: 11, userId: 7, resumeFile: 'abc.pdf', jobId: 2 });
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(emailService.sendSetPassword).not.toHaveBeenCalled();
  });

  test('HR must give the candidate name and email', async () => {
    await expect(candidateService.createProfile(profileInput(), resume, hrActor)).rejects.toThrow(
      'Full name and email are required',
    );
  });

  test('HR cannot reuse an existing email', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 50 });
    await expect(
      candidateService.createProfile(
        profileInput({ fullName: 'Amit', email: 'amit@example.com' }),
        resume,
        hrActor,
      ),
    ).rejects.toMatchObject({ status: 409 });
  });

  test('HR creates the account and the candidate gets a set-password email', async () => {
    prisma.user.create.mockResolvedValue({ id: 20 });

    const result = await candidateService.createProfile(
      profileInput({ fullName: 'Amit', email: 'amit@example.com' }),
      resume,
      hrActor,
    );

    expect(prisma.user.create.mock.calls[0][0].data).toMatchObject({
      fullName: 'Amit',
      email: 'amit@example.com',
      role: 'CANDIDATE',
    });
    expect(result.userId).toBe(20);
    expect(result).not.toHaveProperty('fullName'); // name lives on User, not Candidate
    expect(emailService.sendSetPassword).toHaveBeenCalledWith(
      'amit@example.com',
      'Amit',
      expect.any(String),
    );
  });
});

describe('listCandidates', () => {
  test('applies filters, search and paging', async () => {
    prisma.candidate.count.mockResolvedValue(25);
    prisma.candidate.findMany.mockResolvedValue([{ id: 1 }]);

    const result = await candidateService.listCandidates({
      jobId: 2,
      stage: 'L1_TECHNICAL',
      status: undefined,
      search: 'riya',
      page: 2,
      size: 10,
    });

    const query = prisma.candidate.findMany.mock.calls[0][0];
    expect(query.where.jobId).toBe(2);
    expect(query.where.stage).toBe('L1_TECHNICAL');
    expect(query.where.user.OR[0].fullName.contains).toBe('riya');
    expect(query.skip).toBe(10);
    expect(query.take).toBe(10);
    expect(result).toEqual({ total: 25, page: 2, size: 10, items: [{ id: 1 }] });
  });

  test('without search there is no name filter', async () => {
    prisma.candidate.count.mockResolvedValue(0);
    prisma.candidate.findMany.mockResolvedValue([]);
    await candidateService.listCandidates({ page: 1, size: 20 });
    expect(prisma.candidate.findMany.mock.calls[0][0].where.user).toBeUndefined();
  });
});

describe('getStats', () => {
  test('counts candidates per stage and status, filling missing ones with 0', async () => {
    prisma.candidate.groupBy
      .mockResolvedValueOnce([
        { stage: 'PROFILING', _count: { _all: 3 } },
        { stage: 'L1_TECHNICAL', _count: { _all: 2 } },
      ])
      .mockResolvedValueOnce([
        { status: 'IN_PROGRESS', _count: { _all: 4 } },
        { status: 'SELECTED', _count: { _all: 1 } },
      ]);

    const stats = await candidateService.getStats();

    expect(stats.total).toBe(5);
    expect(stats.byStage).toEqual({
      PROFILING: 3,
      SCREENING: 0,
      L1_TECHNICAL: 2,
      L2_TECHNICAL: 0,
      HR_ROUND: 0,
    });
    expect(stats.byStatus).toEqual({
      PROFILING_COMPLETED: 0,
      IN_PROGRESS: 4,
      SELECTED: 1,
      REJECTED: 0,
    });
  });
});

describe('getCandidate permissions', () => {
  const stored = {
    id: 11,
    userId: 7,
    resumeFile: 'abc.pdf',
    interviews: [{ panels: [{ panelId: 30 }] }],
  };

  beforeEach(() => prisma.candidate.findUnique.mockResolvedValue(stored));

  test('404 when the candidate does not exist', async () => {
    prisma.candidate.findUnique.mockResolvedValue(null);
    await expect(candidateService.getCandidate(1, hrActor)).rejects.toMatchObject({
      status: 404,
    });
  });

  test('HR can see everything, including feedback', async () => {
    await candidateService.getCandidate(11, hrActor);
    const { include } = prisma.candidate.findUnique.mock.calls[0][0];
    expect(include.interviews.include.feedbacks).toBeDefined();
  });

  test('candidate sees their own profile but never feedback', async () => {
    await expect(candidateService.getCandidate(11, candidateActor)).resolves.toBe(stored);
    const { include } = prisma.candidate.findUnique.mock.calls[0][0];
    expect(include.interviews.include.feedbacks).toBeUndefined();
  });

  test("candidate cannot see someone else's profile", async () => {
    await expect(
      candidateService.getCandidate(11, { id: 8, role: 'CANDIDATE' }),
    ).rejects.toMatchObject({ status: 403 });
  });

  test('assigned panel member can see the candidate', async () => {
    await expect(candidateService.getCandidate(11, { id: 30, role: 'PANEL' })).resolves.toBe(
      stored,
    );
  });

  test('other panel members cannot', async () => {
    await expect(
      candidateService.getCandidate(11, { id: 31, role: 'PANEL' }),
    ).rejects.toMatchObject({ status: 403 });
  });

  test('getResumePath returns a file inside the uploads folder', async () => {
    const file = await candidateService.getResumePath(11, hrActor);
    expect(file).toBe(path.join(UPLOAD_DIR, 'abc.pdf'));
  });
});

describe('getMyProfile', () => {
  test('404 when the candidate has not applied', async () => {
    prisma.candidate.findUnique.mockResolvedValue(null);
    await expect(candidateService.getMyProfile(candidateActor)).rejects.toThrow('not applied');
  });

  test('returns the candidate linked to the logged-in user', async () => {
    const stored = { id: 11, userId: 7, interviews: [] };
    prisma.candidate.findUnique.mockResolvedValue(stored);
    await expect(candidateService.getMyProfile(candidateActor)).resolves.toBe(stored);
  });
});
