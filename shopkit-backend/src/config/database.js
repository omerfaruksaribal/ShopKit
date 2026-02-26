const { PrismaClient } = require('@prisma/client');

// Singleton Prisma client instance
const prisma = new PrismaClient();

module.exports = prisma;
