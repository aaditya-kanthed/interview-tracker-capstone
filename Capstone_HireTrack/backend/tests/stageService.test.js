// Unit tests for the core business logic. The database and email are MOCKED
// (jest.mock = Mockito), so these tests run without PostgreSQL.
jest.mock('../src/config/prisma', () => ({
  candidate: { findUnique: jest.fn(), update: jest.fn() },
}));
jest.mock('../src/services/emailService', () => ({ sendStatusUpdate: jest.fn() }));

const prisma = require('../src/config/prisma');
const emailService = require('../src/services/emailService');
const stageService = require('../src/services/stageService');

// Test data builder
function candidate(overrides = {}) {
  return {
    id: 1,
    stage: 'SCREENING',
    status: 'IN_PROGRESS',
    user: { email: 'riya@example.com' },
    interviews: [],
    ...overrides,
  };
}

const l1Interview = (feedbackCount) => ({
  round: 'L1',
  panels: [{ panelId: 7 }, { panelId: 8 }],
  feedbacks: Array.from({ length: feedbackCount }, (_, i) => ({ id: i + 1 })),
});

beforeEach(() => {
  jest.clearAllMocks();
  prisma.candidate.update.mockImplementation(({ data }) =>
    Promise.resolve({ id: 1, stage: 'X', status: 'Y', ...data }),
  );
});

describe('moveToNextStage', () => {
  test('moves Screening -> L1 Technical and emails the candidate', async () => {
    prisma.candidate.findUnique.mockResolvedValue(candidate());

    const result = await stageService.moveToNextStage(1);

    expect(result.stage).toBe('L1_TECHNICAL');
    expect(prisma.candidate.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { stage: 'L1_TECHNICAL', status: 'IN_PROGRESS' },
    });
    expect(emailService.sendStatusUpdate).toHaveBeenCalledTimes(1);
  });

  test('blocks L1 -> L2 when a panel member has not given feedback', async () => {
    prisma.candidate.findUnique.mockResolvedValue(
      candidate({ stage: 'L1_TECHNICAL', interviews: [l1Interview(1)] }),
    );

    await expect(stageService.moveToNextStage(1)).rejects.toThrow(
      'All panel members must submit L1 feedback first',
    );
    expect(prisma.candidate.update).not.toHaveBeenCalled();
  });

  test('allows L1 -> L2 when all feedback is in', async () => {
    prisma.candidate.findUnique.mockResolvedValue(
      candidate({ stage: 'L1_TECHNICAL', interviews: [l1Interview(2)] }),
    );
    const result = await stageService.moveToNextStage(1);
    expect(result.stage).toBe('L2_TECHNICAL');
  });

  test('blocks L1 -> L2 when no L1 interview was scheduled', async () => {
    prisma.candidate.findUnique.mockResolvedValue(candidate({ stage: 'L1_TECHNICAL' }));
    await expect(stageService.moveToNextStage(1)).rejects.toThrow('has not been scheduled');
  });

  test('cannot move past the HR round', async () => {
    prisma.candidate.findUnique.mockResolvedValue(candidate({ stage: 'HR_ROUND' }));
    await expect(stageService.moveToNextStage(1)).rejects.toThrow('Make the final decision');
  });

  test('cannot move a rejected candidate', async () => {
    prisma.candidate.findUnique.mockResolvedValue(candidate({ status: 'REJECTED' }));
    await expect(stageService.moveToNextStage(1)).rejects.toThrow('already REJECTED');
  });

  test('returns 404 when the candidate does not exist', async () => {
    prisma.candidate.findUnique.mockResolvedValue(null);
    await expect(stageService.moveToNextStage(99)).rejects.toMatchObject({ status: 404 });
  });
});

describe('reject', () => {
  test('can reject at any stage with comments', async () => {
    prisma.candidate.findUnique.mockResolvedValue(candidate({ stage: 'PROFILING' }));
    const result = await stageService.reject(1, 'Not a fit for the role');
    expect(result.status).toBe('REJECTED');
    expect(result.finalComments).toBe('Not a fit for the role');
  });
});

describe('finalDecision', () => {
  test('selects a candidate in the HR round', async () => {
    prisma.candidate.findUnique.mockResolvedValue(candidate({ stage: 'HR_ROUND' }));
    const result = await stageService.finalDecision(1, {
      decision: 'SELECTED',
      comments: 'Strong overall',
    });
    expect(result.status).toBe('SELECTED');
  });

  test('is not allowed before the HR round', async () => {
    prisma.candidate.findUnique.mockResolvedValue(candidate({ stage: 'L2_TECHNICAL' }));
    await expect(
      stageService.finalDecision(1, { decision: 'SELECTED', comments: 'Good' }),
    ).rejects.toThrow('only be made in the HR round');
  });
});
