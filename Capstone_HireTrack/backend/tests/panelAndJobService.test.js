jest.mock('../src/config/prisma', () => require('./mockPrisma')());
jest.mock('../src/services/emailService', () => ({ sendPanelLogin: jest.fn() }));

const bcrypt = require('bcrypt');
const prisma = require('../src/config/prisma');
const emailService = require('../src/services/emailService');
const panelService = require('../src/services/panelService');
const jobService = require('../src/services/jobService');

beforeEach(() => jest.clearAllMocks());

describe('panelService', () => {
  const panelInput = {
    fullName: 'Anil Kumar',
    email: 'anil@example.com',
    mobileCode: '+91',
    mobile: '9876500000',
    organization: 'Acme',
    designation: 'Tech Lead',
  };

  test('createPanel blocks a duplicate email', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 1 });
    await expect(panelService.createPanel(panelInput)).rejects.toMatchObject({ status: 409 });
  });

  test('createPanel saves an inactive PANEL user', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: 30 });
    await panelService.createPanel(panelInput);
    expect(prisma.user.create.mock.calls[0][0].data).toMatchObject({
      ...panelInput,
      role: 'PANEL',
      isActive: false,
    });
  });

  test('listPanels can return only active members', async () => {
    prisma.user.findMany.mockResolvedValue([]);
    await panelService.listPanels({ activeOnly: true });
    expect(prisma.user.findMany.mock.calls[0][0].where).toEqual({ role: 'PANEL', isActive: true });

    await panelService.listPanels();
    expect(prisma.user.findMany.mock.calls[1][0].where).toEqual({ role: 'PANEL' });
  });

  test('sendLoginDetails: 404 when not found', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    await expect(panelService.sendLoginDetails(30)).rejects.toMatchObject({ status: 404 });
  });

  test('sendLoginDetails: activates and emails login email + temporary password', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 30,
      isActive: false,
      email: 'anil@example.com',
      fullName: 'Anil Kumar',
    });
    prisma.user.update.mockResolvedValue({ id: 30, isActive: true });
    emailService.sendPanelLogin.mockResolvedValue(true);

    const result = await panelService.sendLoginDetails(30);

    const { data } = prisma.user.update.mock.calls[0][0];
    const tempPassword = emailService.sendPanelLogin.mock.calls[0][2];
    expect(tempPassword).toMatch(/^[A-Za-z2-9]{4}-[A-Za-z2-9]{4}-[A-Za-z2-9]{4}$/);
    expect(data).toMatchObject({ isActive: true, isVerified: true, mustChangePassword: true });
    expect(data.passwordHash).not.toBe(tempPassword); // only the hash is stored
    expect(await bcrypt.compare(tempPassword, data.passwordHash)).toBe(true);
    expect(result).toMatchObject({ emailSent: true, firstTime: true });
  });

  test('sendLoginDetails on an active member resends a NEW password', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 30,
      isActive: true,
      email: 'a@x.com',
      fullName: 'A',
    });
    prisma.user.update.mockResolvedValue({ id: 30, isActive: true });
    emailService.sendPanelLogin.mockResolvedValue(false);

    const result = await panelService.sendLoginDetails(30);

    expect(result).toMatchObject({ emailSent: false, firstTime: false });
  });
});

describe('jobService', () => {
  test('createJob records which HR created it', async () => {
    await jobService.createJob({ title: 'QA' }, 1);
    expect(prisma.job.create).toHaveBeenCalledWith({ data: { title: 'QA', createdById: 1 } });
  });

  test('listOpenJobs shows only open jobs', async () => {
    await jobService.listOpenJobs();
    expect(prisma.job.findMany.mock.calls[0][0].where).toEqual({ isOpen: true });
  });

  test('listAllJobs includes candidate counts', async () => {
    await jobService.listAllJobs();
    expect(prisma.job.findMany.mock.calls[0][0].include).toEqual({
      _count: { select: { candidates: true } },
    });
  });

  test('updateJob gives 404 for a missing job', async () => {
    prisma.job.findUnique.mockResolvedValue(null);
    await expect(jobService.updateJob(9, { title: 'X' })).rejects.toMatchObject({ status: 404 });
    expect(prisma.job.update).not.toHaveBeenCalled();
  });

  test('updateJob saves changes', async () => {
    prisma.job.findUnique.mockResolvedValue({ id: 9 });
    await jobService.updateJob(9, { title: 'X' });
    expect(prisma.job.update).toHaveBeenCalledWith({ where: { id: 9 }, data: { title: 'X' } });
  });

  test('setJobOpen closes and reopens a job', async () => {
    prisma.job.findUnique.mockResolvedValue({ id: 9 });
    await jobService.setJobOpen(9, false);
    expect(prisma.job.update).toHaveBeenCalledWith({ where: { id: 9 }, data: { isOpen: false } });
  });
});
