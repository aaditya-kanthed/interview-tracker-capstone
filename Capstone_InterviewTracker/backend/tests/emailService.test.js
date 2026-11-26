// Nodemailer is mocked, so no real email is sent
const mockSendMail = jest.fn();
const mockVerify = jest.fn();
jest.mock('nodemailer', () => ({
  createTransport: () => ({ sendMail: mockSendMail, verify: mockVerify }),
}));

const env = require('../src/config/env');
const emailService = require('../src/services/emailService');

const realSmtp = { ...env.smtp };

beforeEach(() => {
  mockSendMail.mockReset().mockResolvedValue({});
  mockVerify.mockReset().mockResolvedValue(true);
  Object.assign(env.smtp, { host: 'smtp.test', user: 'me@test.com', pass: 'app-password' });
});
afterAll(() => Object.assign(env.smtp, realSmtp));

const lastMail = () => mockSendMail.mock.calls[0][0];

describe('emails', () => {
  test('verification email greets the candidate by name and signs off from HR', async () => {
    await emailService.sendVerification('a@example.com', 'Riya Sharma', 'tok123');
    expect(lastMail().html).toContain('Dear Riya Sharma,');
    expect(lastMail().html).toContain('Warm regards');
    expect(lastMail().text).toContain('Dear Riya Sharma,');
  });

  test('test email (no name) uses a neutral greeting', async () => {
    await emailService.sendTestEmail('me@example.com');
    expect(lastMail().html).toContain('Dear there,');
  });

  test('panel login email greets the member and shows login email + temporary password', async () => {
    await emailService.sendPanelLogin('anil@example.com', 'Anil Kumar', 'Kp7m-Rt4x-Wq9z');
    const { html, subject } = lastMail();
    expect(subject).toContain('Welcome to the interview panel');
    expect(html).toContain('Dear Anil Kumar,');
    expect(html).toContain('anil@example.com');
    expect(html).toContain('Kp7m-Rt4x-Wq9z');
    expect(html).toContain('/login.html');
  });

  test('selected / rejected candidates get a kind, personal message', async () => {
    await emailService.sendStatusUpdate('c@example.com', {
      candidateName: 'Riya',
      stage: 'HR_ROUND',
      status: 'SELECTED',
    });
    expect(lastMail().html).toContain('Dear Riya,');
    expect(lastMail().html).toContain('Congratulations');

    mockSendMail.mockClear();
    await emailService.sendStatusUpdate('c@example.com', {
      candidateName: 'Amit',
      stage: 'SCREENING',
      status: 'REJECTED',
    });
    expect(lastMail().html).toContain('Thank you for the time');
  });

  test('verification email has a button with the verify link and a plain-text copy', async () => {
    await emailService.sendVerification('a@example.com', 'Riya', 'tok123');
    expect(lastMail().to).toBe('a@example.com');
    expect(lastMail().html).toContain('/api/auth/verify-email?token=tok123');
    expect(lastMail().html).toContain('Verify email');
    expect(lastMail().text).toContain('/api/auth/verify-email?token=tok123');
    expect(lastMail().text).not.toContain('<');
  });

  test('set-password email escapes the name (no HTML injection)', async () => {
    await emailService.sendSetPassword('a@example.com', '<script>x</script>', 'tok');
    expect(lastMail().html).not.toContain('<script>');
    expect(lastMail().html).toContain('/set-password.html?token=tok');
  });

  test('interview scheduled email greets the candidate and lists the panel names', async () => {
    await emailService.sendInterviewScheduled('c@example.com', {
      candidateName: 'Riya',
      round: 'L1',
      scheduledAt: new Date('2030-01-10T10:00:00Z'),
      panelNames: ['Anil', 'Meera'],
    });
    expect(lastMail().subject).toBe('Your L1 interview is scheduled');
    expect(lastMail().html).toContain('Anil, Meera');
    expect(lastMail().html).toContain('Dear Riya,');
  });

  test('interview emails include a "Join Google Meet" button when there is a link', async () => {
    const link = 'https://meet.google.com/abc-defg-hij';
    await emailService.sendInterviewScheduled('c@example.com', {
      candidateName: 'Riya',
      round: 'L1',
      scheduledAt: new Date('2030-01-10T10:00:00Z'),
      panelNames: ['Anil'],
      meetingLink: link,
    });
    expect(lastMail().html).toContain('Join Google Meet');
    expect(lastMail().html).toContain(`href="${link}"`);

    mockSendMail.mockClear();
    await emailService.sendPanelAssigned('p@example.com', {
      panelName: 'Anil',
      candidateName: 'Riya',
      round: 'L1',
      scheduledAt: new Date(),
      meetingLink: link,
    });
    expect(lastMail().html).toContain('Join Google Meet');
    expect(lastMail().html).toContain('/panel-dashboard.html');
  });

  test('panel assigned email greets the panel member and names the candidate', async () => {
    await emailService.sendPanelAssigned('p@example.com', {
      panelName: 'Meera',
      candidateName: 'Riya',
      round: 'L2',
      scheduledAt: new Date(),
    });
    expect(lastMail().subject).toContain('Riya');
    expect(lastMail().html).toContain('/panel-dashboard.html');
    expect(lastMail().html).toContain('Dear Meera,');
  });

  test('status update email shows readable stage and status names', async () => {
    await emailService.sendStatusUpdate('c@example.com', {
      stage: 'HR_ROUND',
      status: 'IN_PROGRESS',
    });
    expect(lastMail().html).toContain('HR Round');
    expect(lastMail().html).toContain('In Progress');
  });

  test('status update falls back to the raw value for unknown names', async () => {
    await emailService.sendStatusUpdate('c@example.com', { stage: 'NEW_STAGE', status: 'ODD' });
    expect(lastMail().html).toContain('NEW_STAGE');
  });

  test('test email can be sent', async () => {
    await expect(emailService.sendTestEmail('me@example.com')).resolves.toBe(true);
    expect(lastMail().subject).toBe('Test email from InterviewTracker');
  });

  test('a failed email returns false and does not throw', async () => {
    mockSendMail.mockRejectedValue(new Error('SMTP down'));
    await expect(emailService.sendVerification('a@example.com', 'A', 't')).resolves.toBe(false);
  });
});

describe('SMTP setup checks', () => {
  test('placeholder values from .env.example count as "not configured"', async () => {
    Object.assign(env.smtp, { user: 'your-smtp-username', pass: 'your-smtp-password' });
    expect(emailService.isConfigured()).toBe(false);
    await expect(emailService.verifyConnection()).resolves.toBe(false);
    expect(mockVerify).not.toHaveBeenCalled();
  });

  test('missing values count as "not configured"', () => {
    Object.assign(env.smtp, { host: undefined });
    expect(emailService.isConfigured()).toBe(false);
  });

  test('verifyConnection returns true when the SMTP login works', async () => {
    await expect(emailService.verifyConnection()).resolves.toBe(true);
  });

  test('verifyConnection returns false when the SMTP login fails', async () => {
    mockVerify.mockRejectedValue(new Error('Invalid login'));
    await expect(emailService.verifyConnection()).resolves.toBe(false);
  });
});
