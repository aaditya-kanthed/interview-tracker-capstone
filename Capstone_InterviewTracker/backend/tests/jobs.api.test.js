// API tests with Supertest: send real HTTP requests to the app, database mocked
jest.mock('../src/config/prisma', () => ({
  job: { findMany: jest.fn(), create: jest.fn(), findUnique: jest.fn() },
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const prisma = require('../src/config/prisma');

const tokenFor = (role) => jwt.sign({ sub: '1', role }, process.env.JWT_SECRET);

const validJob = {
  title: 'Java Developer',
  description: 'Build and maintain backend services.',
  skills: ['Java', 'SQL'],
  minExperience: 1,
  maxExperience: 3,
  minSalary: 400000,
  maxSalary: 800000,
  location: 'Pune',
  jobType: 'FULL_TIME',
};

beforeEach(() => jest.clearAllMocks());

test('GET /api/jobs is public and returns open jobs', async () => {
  prisma.job.findMany.mockResolvedValue([{ id: 1, title: 'Java Developer' }]);
  const res = await request(app).get('/api/jobs');
  expect(res.status).toBe(200);
  expect(res.body).toHaveLength(1);
});

test('POST /api/jobs without login returns 401', async () => {
  const res = await request(app).post('/api/jobs').send(validJob);
  expect(res.status).toBe(401);
});

test('POST /api/jobs as a CANDIDATE returns 403', async () => {
  const res = await request(app)
    .post('/api/jobs')
    .set('Authorization', `Bearer ${tokenFor('CANDIDATE')}`)
    .send(validJob);
  expect(res.status).toBe(403);
});

test('POST /api/jobs with bad data returns 400 with field errors', async () => {
  const res = await request(app)
    .post('/api/jobs')
    .set('Authorization', `Bearer ${tokenFor('HR')}`)
    .send({ ...validJob, minExperience: 5, maxExperience: 2 });
  expect(res.status).toBe(400);
  expect(res.body.details.maxExperience).toBeDefined();
});

test('POST /api/jobs as HR creates the job', async () => {
  prisma.job.create.mockResolvedValue({ id: 10, ...validJob });
  const res = await request(app)
    .post('/api/jobs')
    .set('Authorization', `Bearer ${tokenFor('HR')}`)
    .send(validJob);
  expect(res.status).toBe(201);
  expect(prisma.job.create).toHaveBeenCalledWith({ data: { ...validJob, createdById: 1 } });
});

test('GET /api/jobs/999 returns 404 when not found', async () => {
  prisma.job.findUnique.mockResolvedValue(null);
  const res = await request(app).get('/api/jobs/999');
  expect(res.status).toBe(404);
});
