const fs = require('fs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { z } = require('zod');
const { authenticate, authorize } = require('../src/middlewares/auth');
const validate = require('../src/middlewares/validate');
const { errorHandler, notFound } = require('../src/middlewares/errorHandler');
const AppError = require('../src/utils/AppError');
const { parseId, escapeHtml, createOneTimeToken, hashToken } = require('../src/utils/helpers');

// Small fake "res" object like Express gives us
function fakeRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe('authenticate', () => {
  test('no Authorization header gives 401', () => {
    const next = jest.fn();
    authenticate({ headers: {} }, {}, next);
    expect(next.mock.calls[0][0]).toMatchObject({ status: 401 });
  });

  test('an invalid token gives 401', () => {
    const next = jest.fn();
    authenticate({ headers: { authorization: 'Bearer not-a-real-token' } }, {}, next);
    expect(next.mock.calls[0][0].message).toMatch('Session expired');
  });

  test('a valid token puts the user on req.user', () => {
    const token = jwt.sign({ sub: '5', role: 'PANEL' }, process.env.JWT_SECRET);
    const req = { headers: { authorization: `Bearer ${token}` } };
    const next = jest.fn();
    authenticate(req, {}, next);
    expect(next).toHaveBeenCalledWith();
    expect(req.user).toEqual({ id: 5, role: 'PANEL' });
  });
});

describe('temporary password guard', () => {
  const tempToken = () => jwt.sign({ sub: '5', role: 'PANEL', mcp: true }, process.env.JWT_SECRET);

  test('blocks normal APIs until the temporary password is changed', () => {
    const next = jest.fn();
    const req = {
      headers: { authorization: `Bearer ${tempToken()}` },
      originalUrl: '/api/interviews/mine',
    };
    authenticate(req, {}, next);
    expect(next.mock.calls[0][0]).toMatchObject({ status: 403 });
  });

  test('allows the change-password API', () => {
    const next = jest.fn();
    const req = {
      headers: { authorization: `Bearer ${tempToken()}` },
      originalUrl: '/api/auth/change-password',
    };
    authenticate(req, {}, next);
    expect(next).toHaveBeenCalledWith();
  });
});

describe('authorize', () => {
  test('allows a listed role', () => {
    const next = jest.fn();
    authorize('HR', 'PANEL')({ user: { role: 'PANEL' } }, {}, next);
    expect(next).toHaveBeenCalledWith();
  });

  test('blocks other roles with 403', () => {
    const next = jest.fn();
    authorize('HR')({ user: { role: 'CANDIDATE' } }, {}, next);
    expect(next.mock.calls[0][0]).toMatchObject({ status: 403 });
  });
});

describe('validate', () => {
  const schema = z.object({ age: z.coerce.number().min(18) });

  test('puts cleaned data on req.validated', () => {
    const req = { query: { age: '21' } };
    const next = jest.fn();
    validate(schema, 'query')(req, {}, next);
    expect(req.validated).toEqual({ age: 21 });
    expect(next).toHaveBeenCalledWith();
  });

  test('returns field errors when the data is wrong', () => {
    const next = jest.fn();
    validate(schema)({ body: { age: 10 } }, {}, next);
    const err = next.mock.calls[0][0];
    expect(err.status).toBe(400);
    expect(err.details.age).toBeDefined();
  });

  test('treats a missing body as empty', () => {
    const next = jest.fn();
    validate(schema)({}, {}, next);
    expect(next.mock.calls[0][0].status).toBe(400);
  });
});

describe('errorHandler', () => {
  const req = { method: 'GET', originalUrl: '/api/x' };

  test.each([
    [AppError.conflict('Duplicate'), 409, 'Duplicate'],
    [new multer.MulterError('LIMIT_FILE_SIZE'), 400, 'File too large'],
    [
      Object.assign(new Error('bad json'), { type: 'entity.parse.failed' }),
      400,
      'Invalid JSON body',
    ],
    [Object.assign(new Error('unique'), { code: 'P2002' }), 409, 'This record already exists'],
    [Object.assign(new Error('missing'), { code: 'P2025' }), 404, 'Record not found'],
    [
      Object.assign(new Error("Can't reach database server"), {
        name: 'PrismaClientInitializationError',
      }),
      503,
      'Cannot connect to the database. Please try again in a moment.',
    ],
    [new Error('boom'), 500, 'Something went wrong. Please try again.'],
  ])('maps %p to status %i', (err, status, message) => {
    const res = fakeRes();
    errorHandler(err, req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(status);
    expect(res.json.mock.calls[0][0].error).toBe(message);
  });

  test('deletes an uploaded file when the request fails', () => {
    const unlink = jest.spyOn(fs, 'unlink').mockImplementation(() => {});
    errorHandler(
      AppError.badRequest('x'),
      { ...req, file: { path: 'tmp.pdf' } },
      fakeRes(),
      jest.fn(),
    );
    expect(unlink).toHaveBeenCalledWith('tmp.pdf', expect.any(Function));
    unlink.mockRestore();
  });

  test('notFound creates a 404 error', () => {
    const next = jest.fn();
    notFound({ method: 'GET', originalUrl: '/nope' }, {}, next);
    expect(next.mock.calls[0][0]).toMatchObject({ status: 404 });
  });
});

describe('helpers', () => {
  test('parseId accepts positive whole numbers only', () => {
    expect(parseId('12')).toBe(12);
    expect(() => parseId('abc')).toThrow('Invalid id');
    expect(() => parseId('-1')).toThrow('Invalid id');
    expect(() => parseId('1.5')).toThrow('Invalid id');
  });

  test('escapeHtml makes text safe for HTML', () => {
    expect(escapeHtml('<b>"Tom" & \'Jerry\'</b>')).toBe(
      '&#60;b&#62;&#34;Tom&#34; &#38; &#39;Jerry&#39;&#60;/b&#62;',
    );
  });

  test('one-time tokens are random and only the hash is stored', () => {
    const a = createOneTimeToken();
    const b = createOneTimeToken();
    expect(a.token).not.toBe(b.token);
    expect(a.tokenHash).toBe(hashToken(a.token));
    expect(a.tokenExpiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  test('AppError helpers set the right status', () => {
    expect(AppError.unauthorized().status).toBe(401);
    expect(AppError.forbidden().status).toBe(403);
    expect(AppError.notFound().status).toBe(404);
  });
});
