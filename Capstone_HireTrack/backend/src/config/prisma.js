// One shared database client for the whole app (like a Spring Repository bean)
const { PrismaClient } = require('@prisma/client');

module.exports = new PrismaClient();
