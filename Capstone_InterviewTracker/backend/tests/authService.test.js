jest.mock('../src/config/prisma', () => require('./mockPrisma')());
jest.mock('../src/services/emailService', () => ({ sendVerification: jest.fn() }));

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../src/config/prisma');
const emailService = require('../src/services/emailService');
const authService = require('../src/services/authService');

beforeEach(() => jest.clearAllMocks());

describe('registerCandidate', () => {
  const input = { fullName: 'Riya Sharma', email: 'riya@example.com', password: 'secret123' };

  test('rejects an email that is already registered', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 1 });
    await expect(authService.registerCandidate(input)).rejects.toMatchObject({ status: 409 });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  test('saves a hashed password and sends a verification email', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: 5, email: input.email });

    const result = await authService.registerCandidate(input);

    const saved = prisma.user.create.mock.calls[0][0].data;
    expect(saved.role).toBe('CANDIDATE');
    expect(saved.passwordHash).not.toBe('secret123');
    expect(await bcrypt.compare('secret123', saved.passwordHash)).toBe(true);
    expect(saved.tokenHash).toHaveLength(64);
    expect(emailService.sendVerification).toHaveBeenCalledWith(
      input.email,
      'Riya Sharma',
      expect.any(String),
    );
    expect(result).toEqual({ id: 5, email: input.email });
  });
});

describe('verifyEmail and setPassword', () => {
  test('reject an unknown or expired link', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    await expect(authService.verifyEmail('bad-token')).rejects.toMatchObject({ status: 400 });
    await expect(authService.setPassword('bad-token', 'newpass123')).rejects.toMatchObject({
      status: 400,
    });
  });

  test('verifyEmail marks the user verified and clears the token', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 3 });
    await authService.verifyEmail('good-token');
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 3 },
      data: { isVerified: true, tokenHash: null, tokenExpiresAt: null },
    });
  });

  test('setPassword stores a hash of the new password', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 4 });
    await authService.setPassword('good-token', 'newpass123');
    const { data } = prisma.user.update.mock.calls[0][0];
    expect(await bcrypt.compare('newpass123', data.passwordHash)).toBe(true);
    expect(data.isVerified).toBe(true);
    expect(data.tokenHash).toBeNull();
  });
});

describe('login', () => {
  let user;
  beforeAll(async () => {
    user = {
      id: 9,
      fullName: 'HR Admin',
      email: 'hr@example.com',
      role: 'HR',
      isVerified: true,
      isActive: true,
      passwordHash: await bcrypt.hash('correct-pass', 4),
    };
  });

  test('wrong email gives 401', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(authService.login({ email: 'x@y.com', password: 'a' })).rejects.toMatchObject({
      status: 401,
    });
  });

  test('wrong password gives 401', async () => {
    prisma.user.findUnique.mockResolvedValue(user);
    await expect(authService.login({ email: user.email, password: 'wrong' })).rejects.toMatchObject(
      { status: 401 },
    );
  });

  test('user without a password yet (panel not set up) gives 401', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...user, passwordHash: null });
    await expect(
      authService.login({ email: user.email, password: 'correct-pass' }),
    ).rejects.toMatchObject({ status: 401 });
  });

  test('unverified email gives 403', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...user, isVerified: false });
    await expect(
      authService.login({ email: user.email, password: 'correct-pass' }),
    ).rejects.toThrow('verify your email');
  });

  test('inactive account gives 403', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...user, isActive: false });
    await expect(
      authService.login({ email: user.email, password: 'correct-pass' }),
    ).rejects.toThrow('not active');
  });

  test('correct details return a token with the user id and role', async () => {
    prisma.user.findUnique.mockResolvedValue(user);
    const result = await authService.login({ email: user.email, password: 'correct-pass' });
    const payload = jwt.verify(result.token, process.env.JWT_SECRET);
    expect(payload).toMatchObject({ sub: '9', role: 'HR' });
    expect(result.user).toEqual({
      id: 9,
      fullName: 'HR Admin',
      email: 'hr@example.com',
      role: 'HR',
      mustChangePassword: false,
    });
    expect(payload.mcp).toBeUndefined();
  });

  test('a temporary password marks the token "must change password"', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...user, mustChangePassword: true });
    const result = await authService.login({ email: user.email, password: 'correct-pass' });
    expect(result.user.mustChangePassword).toBe(true);
    expect(jwt.verify(result.token, process.env.JWT_SECRET).mcp).toBe(true);
  });
});

describe('changePassword', () => {
  let stored;
  beforeEach(async () => {
    stored = {
      id: 9,
      fullName: 'Anil',
      email: 'anil@example.com',
      role: 'PANEL',
      mustChangePassword: true,
      passwordHash: await bcrypt.hash('Temp-Pass-1234', 4),
    };
    prisma.user.findUnique.mockResolvedValue(stored);
    prisma.user.update.mockImplementation(({ data }) => Promise.resolve({ ...stored, ...data }));
  });

  test('rejects a wrong current password', async () => {
    await expect(
      authService.changePassword(9, { currentPassword: 'nope', newPassword: 'NewPass123' }),
    ).rejects.toMatchObject({ status: 400, details: { currentPassword: expect.any(Array) } });
  });

  test('rejects reusing the same password', async () => {
    await expect(
      authService.changePassword(9, {
        currentPassword: 'Temp-Pass-1234',
        newPassword: 'Temp-Pass-1234',
      }),
    ).rejects.toThrow('Choose a new password');
  });

  test('saves the new password, clears the flag and returns a clean token', async () => {
    const result = await authService.changePassword(9, {
      currentPassword: 'Temp-Pass-1234',
      newPassword: 'MyOwnPass123',
    });
    const { data } = prisma.user.update.mock.calls[0][0];
    expect(data.mustChangePassword).toBe(false);
    expect(await bcrypt.compare('MyOwnPass123', data.passwordHash)).toBe(true);
    expect(result.user.mustChangePassword).toBe(false);
    expect(jwt.verify(result.token, process.env.JWT_SECRET).mcp).toBeUndefined();
  });

  test('a Google account without a password can set one without a current password', async () => {
    stored.passwordHash = null;
    await expect(
      authService.changePassword(9, { newPassword: 'FirstPass123' }),
    ).resolves.toHaveProperty('token');
  });

  test('unknown user gives 401', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(
      authService.changePassword(1, { newPassword: 'x'.repeat(8) }),
    ).rejects.toMatchObject({ status: 401 });
  });
});

describe('getAccount', () => {
  test('tells whether the user has a password and must change it', async () => {
    prisma.user.findUnique.mockResolvedValue({ passwordHash: 'h', mustChangePassword: true });
    await expect(authService.getAccount(1)).resolves.toEqual({
      hasPassword: true,
      mustChangePassword: true,
    });
  });

  test('unknown user gives 401', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(authService.getAccount(1)).rejects.toMatchObject({ status: 401 });
  });
});
