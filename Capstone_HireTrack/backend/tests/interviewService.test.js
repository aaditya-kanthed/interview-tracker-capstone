jest.mock('../src/config/prisma', () => require('./mockPrisma')());
jest.mock('../src/services/emailService', () => ({
  sendInterviewScheduled: jest.fn(),
  sendPanelAssigned: jest.fn(),
}));

const prisma = require('../src/config/prisma');
const emailService = require('../src/services/emailService');
const interviewService = require('../src/services/interviewService');

const request = {
  round: 'L1',
  scheduledAt: new Date('2030-01-10T10:00:00Z'),
  panelIds: [30, 31],
  focusAreas: 'Core Java, SQL',
};

const candidate = (extra = {}) => ({
  id: 11,
  stage: 'L1_TECHNICAL',
  status: 'IN_PROGRESS',
  user: { fullName: 'Riya', email: 'riya@example.com' },
  ...extra,
});

const panels = [
  { id: 30, fullName: 'Anil', email: 'anil@example.com' },
  { id: 31, fullName: 'Meera', email: 'meera@example.com' },
];

beforeEach(() => jest.clearAllMocks());

describe('scheduleInterview', () => {
  test('404 when the candidate does not exist', async () => {
    prisma.candidate.findUnique.mockResolvedValue(null);
    await expect(interviewService.scheduleInterview(11, request)).rejects.toMatchObject({
      status: 404,
    });
  });

  test('cannot schedule for a rejected candidate', async () => {
    prisma.candidate.findUnique.mockResolvedValue(candidate({ status: 'REJECTED' }));
    await expect(interviewService.scheduleInterview(11, request)).rejects.toThrow(
      'no longer in the process',
    );
  });

  test('L1 can only be scheduled in the L1 stage', async () => {
    prisma.candidate.findUnique.mockResolvedValue(candidate({ stage: 'SCREENING' }));
    await expect(interviewService.scheduleInterview(11, request)).rejects.toThrow(
      'Move the candidate to L1_TECHNICAL first',
    );
  });

  test('all panel members must exist and be active', async () => {
    prisma.candidate.findUnique.mockResolvedValue(candidate());
    prisma.user.findMany.mockResolvedValue([panels[0]]); // only 1 of 2 found
    await expect(interviewService.scheduleInterview(11, request)).rejects.toThrow(
      'must exist and be active',
    );
  });

  test('creates the interview and emails the candidate and every panel member', async () => {
    prisma.candidate.findUnique.mockResolvedValue(candidate());
    prisma.user.findMany.mockResolvedValue(panels);
    prisma.interview.create.mockResolvedValue({ id: 5 });

    const result = await interviewService.scheduleInterview(11, request);

    expect(result).toEqual({ id: 5 });
    expect(prisma.interview.create.mock.calls[0][0].data.panels).toEqual({
      create: [{ panelId: 30 }, { panelId: 31 }],
    });
    expect(emailService.sendInterviewScheduled).toHaveBeenCalledWith('riya@example.com', {
      candidateName: 'Riya',
      round: 'L1',
      scheduledAt: request.scheduledAt,
      panelNames: ['Anil', 'Meera'],
      meetingLink: undefined,
    });
    expect(prisma.interview.create.mock.calls[0][0].data.meetingLink).toBeNull();
    expect(emailService.sendPanelAssigned).toHaveBeenCalledTimes(2);
    expect(emailService.sendPanelAssigned).toHaveBeenCalledWith(
      'meera@example.com',
      expect.objectContaining({ panelName: 'Meera', candidateName: 'Riya' }),
    );
  });

  test('saves the Google Meet link and sends it to the candidate and panel', async () => {
    const link = 'https://meet.google.com/abc-defg-hij';
    prisma.candidate.findUnique.mockResolvedValue(candidate());
    prisma.user.findMany.mockResolvedValue(panels);
    prisma.interview.create.mockImplementation(({ data }) => Promise.resolve({ id: 6, ...data }));

    await interviewService.scheduleInterview(11, { ...request, meetingLink: link });

    expect(prisma.interview.create.mock.calls[0][0].data.meetingLink).toBe(link);
    expect(emailService.sendInterviewScheduled.mock.calls[0][1].meetingLink).toBe(link);
    expect(emailService.sendPanelAssigned.mock.calls[0][1].meetingLink).toBe(link);
  });
});

describe('interview form validation', () => {
  const { interviewSchema } = require('../src/validators/schemas');
  const base = {
    round: 'L1',
    scheduledAt: '2030-01-10T10:00:00Z',
    panelIds: [1],
    focusAreas: 'Java',
  };

  test('Meet link is optional', () => {
    expect(interviewSchema.safeParse({ ...base, meetingLink: '' }).success).toBe(true);
    expect(interviewSchema.safeParse(base).success).toBe(true);
  });

  test('accepts an https Meet link', () => {
    const r = interviewSchema.safeParse({
      ...base,
      meetingLink: 'https://meet.google.com/abc-defg-hij',
    });
    expect(r.success).toBe(true);
  });

  test.each(['javascript:alert(1)', 'http://meet.google.com/abc', 'meet.google.com/abc'])(
    'rejects unsafe or incomplete link %s',
    (link) => {
      expect(interviewSchema.safeParse({ ...base, meetingLink: link }).success).toBe(false);
    },
  );
});

describe('listInterviewsForPanel', () => {
  test('only returns interviews this panel member is part of', async () => {
    prisma.interview.findMany.mockResolvedValue([]);
    await interviewService.listInterviewsForPanel(30);
    const query = prisma.interview.findMany.mock.calls[0][0];
    expect(query.where).toEqual({ panels: { some: { panelId: 30 } } });
    expect(query.include.feedbacks).toEqual({ where: { panelId: 30 } });
  });
});

describe('submitFeedback', () => {
  const feedback = {
    comments: 'Good basics',
    strengths: 'OOP',
    weaknesses: 'SQL',
    areasCovered: 'Java',
    rating: 4,
    result: 'SELECTED',
  };

  test('404 when the interview does not exist', async () => {
    prisma.interview.findUnique.mockResolvedValue(null);
    await expect(interviewService.submitFeedback(5, 30, feedback)).rejects.toMatchObject({
      status: 404,
    });
  });

  test('only assigned panel members can give feedback', async () => {
    prisma.interview.findUnique.mockResolvedValue({ panels: [{ panelId: 31 }], feedbacks: [] });
    await expect(interviewService.submitFeedback(5, 30, feedback)).rejects.toMatchObject({
      status: 403,
    });
  });

  test('feedback can be submitted only once', async () => {
    prisma.interview.findUnique.mockResolvedValue({
      panels: [{ panelId: 30 }],
      feedbacks: [{ panelId: 30 }],
    });
    await expect(interviewService.submitFeedback(5, 30, feedback)).rejects.toMatchObject({
      status: 409,
    });
  });

  test('saves the feedback', async () => {
    prisma.interview.findUnique.mockResolvedValue({ panels: [{ panelId: 30 }], feedbacks: [] });
    prisma.feedback.create.mockResolvedValue({ id: 1 });
    await interviewService.submitFeedback(5, 30, feedback);
    expect(prisma.feedback.create).toHaveBeenCalledWith({
      data: { ...feedback, interviewId: 5, panelId: 30 },
    });
  });
});
