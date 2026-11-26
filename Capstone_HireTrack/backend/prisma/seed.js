// Creates (or updates) the HR login from SEED_HR_EMAIL / SEED_HR_PASSWORD in .env.
// Run with: npm run db:seed   (running it again resets the HR password to the .env value)
/* eslint-disable no-console -- a one-off script, so console output is fine here */
require('dotenv').config({ quiet: true });
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const OLD_DEFAULT_EMAIL = 'hr@example.com';

async function main() {
  const email = process.env.SEED_HR_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_HR_PASSWORD;
  if (!email || !password) throw new Error('Set SEED_HR_EMAIL and SEED_HR_PASSWORD in .env');
  if (password.length < 8) throw new Error('SEED_HR_PASSWORD must be at least 8 characters');

  // If the old example HR account exists, move it to the new email
  // (keeps the jobs it created linked to it) instead of making a second HR user.
  const existing = await prisma.user.findUnique({ where: { email } });
  const oldDefault =
    email !== OLD_DEFAULT_EMAIL &&
    (await prisma.user.findUnique({ where: { email: OLD_DEFAULT_EMAIL } }));
  if (!existing && oldDefault?.role === 'HR') {
    await prisma.user.update({ where: { id: oldDefault.id }, data: { email } });
    console.log(`Moved HR account ${OLD_DEFAULT_EMAIL} -> ${email}`);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: 'HR', isVerified: true, isActive: true },
    create: { fullName: 'HR Admin', email, role: 'HR', isVerified: true, passwordHash },
  });
  console.log(`HR user ready: ${email}`);
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
