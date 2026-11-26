// "Sign in with Google". Google's library is mocked, so no real Google call is made.
const mockVerifyIdToken = jest.fn();
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({ verifyIdToken: mockVerifyIdToken })),
}));
jest.mock('../src/config/prisma', () => require('./mockPrisma')());

const jwt = require('jsonwebtoken');
const request = require('supertest');
const prisma = require('../src/config/prisma');
const authService = require('../src/services/authService');
const app = require('../src/app');

// What Google's verified token contains
function googleSays(payload) {
  mockVerifyIdToken.mockResolvedValue({ getPayload: () => payload });
}
const riya = { email: 'Riya@Gmail.com', email_verified: true, name: 'Riya Sharma' };

beforeEach(() => {
  jest.clearAllMocks();
  prisma.user.update.mockImplementation(({ data }) =>
    Promise.resolve({ ...existingUser, ...data }),
  );
});

let existingUser;

describe('loginWithGoogle', () => {
  test('checks the token was made for THIS app (audience = our Client ID)', async () => {
    googleSays(riya);
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: 1, role: 'CANDIDATE', email: 'riya@gmail.com' });

    await authService.loginWithGoogle('google-token');

    expect(mockVerifyIdToken).toHaveBeenCalledWith({
      idToken: 'google-token',
      audience: 'test-client.apps.googleusercontent.com',
    });
  });

  test('a new person becomes a verified CANDIDATE and gets our login token', async () => {
    googleSays(riya);
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockImplementation(({ data }) => Promise.resolve({ id: 7, ...data }));

    const result = await authService.loginWithGoogle('google-token');

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        fullName: 'Riya Sharma',
        email: 'riya@gmail.com',
        role: 'CANDIDATE',
        isVerified: true,
      },
    });
    expect(jwt.verify(result.token, process.env.JWT_SECRET)).toMatchObject({
      sub: '7',
      role: 'CANDIDATE',
    });
  });

  test('uses the email name when Google gives no full name', async () => {
    googleSays({ email: 'amit@gmail.com', email_verified: true });
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockImplementation(({ data }) => Promise.resolve({ id: 8, ...data }));
    const result = await authService.loginWithGoogle('google-token');
    expect(result.user.fullName).toBe('amit');
  });

  test('an existing HR user logs in with their own role (never becomes a candidate)', async () => {
    existingUser = { id: 1, email: 'riya@gmail.com', role: 'HR', isActive: true, isVerified: true };
    googleSays(riya);
    prisma.user.findUnique.mockResolvedValue(existingUser);

    const result = await authService.loginWithGoogle('google-token');

    expect(result.user.role).toBe('HR');
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  test('a registered but unverified candidate is verified by Google', async () => {
    existingUser = {
      id: 3,
      email: 'riya@gmail.com',
      role: 'CANDIDATE',
      isActive: true,
      isVerified: false,
    };
    googleSays(riya);
    prisma.user.findUnique.mockResolvedValue(existingUser);

    const result = await authService.loginWithGoogle('google-token');

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 3 },
      data: { isVerified: true, tokenHash: null, tokenExpiresAt: null },
    });
    expect(result.user.id).toBe(3);
  });

  test('an inactive panel member is blocked', async () => {
    existingUser = { id: 4, role: 'PANEL', isActive: false, isVerified: false };
    googleSays(riya);
    prisma.user.findUnique.mockResolvedValue(existingUser);
    await expect(authService.loginWithGoogle('google-token')).rejects.toMatchObject({
      status: 403,
    });
  });

  test('a Google account with an unverified email is rejected', async () => {
    googleSays({ ...riya, email_verified: false });
    await expect(authService.loginWithGoogle('google-token')).rejects.toMatchObject({
      status: 401,
    });
  });

  test('a fake or expired Google token is rejected', async () => {
    mockVerifyIdToken.mockRejectedValue(new Error('Wrong recipient'));
    await expect(authService.loginWithGoogle('fake')).rejects.toThrow('Google sign-in failed');
  });

  test('gives a clear error when GOOGLE_CLIENT_ID is not set', async () => {
    const saved = process.env.GOOGLE_CLIENT_ID;
    process.env.GOOGLE_CLIENT_ID = 'your-google-client-id.apps.googleusercontent.com';
    let isolated;
    jest.isolateModules(() => {
      isolated = require('../src/services/authService');
    });
    process.env.GOOGLE_CLIENT_ID = saved;
    await expect(isolated.loginWithGoogle('google-token')).rejects.toThrow('not set up');
  });
});

describe('Google routes', () => {
  test('GET /api/auth/config tells the page the Client ID', async () => {
    const res = await request(app).get('/api/auth/config');
    expect(res.body).toEqual({ googleClientId: 'test-client.apps.googleusercontent.com' });
  });

  test('POST /api/auth/google needs a credential', async () => {
    const res = await request(app).post('/api/auth/google').send({});
    expect(res.status).toBe(400);
  });

  test('POST /api/auth/google logs the user in', async () => {
    googleSays(riya);
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockImplementation(({ data }) => Promise.resolve({ id: 9, ...data }));
    const res = await request(app)
      .post('/api/auth/google')
      .send({ credential: 'x'.repeat(40) });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('riya@gmail.com');
  });
});
