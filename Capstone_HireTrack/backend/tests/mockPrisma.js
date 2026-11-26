// A fake Prisma client for unit tests (works like Mockito mocks in Java).
// Usage in a test file:
//   jest.mock('../src/config/prisma', () => require('./mockPrisma')());
function createMockPrisma() {
  const model = () => ({
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  });

  const prisma = {
    user: model(),
    job: model(),
    candidate: model(),
    interview: model(),
    feedback: model(),
  };

  // $transaction works both ways Prisma supports:
  // an array of queries, or a function that receives the transaction client
  prisma.$transaction = jest.fn((arg) =>
    typeof arg === 'function' ? arg(prisma) : Promise.all(arg),
  );
  return prisma;
}

module.exports = createMockPrisma;
