const path = require('path');

/**
 * Global Jest setup — runs once before all test suites.
 */
module.exports = async () => {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    await prisma.transaction.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
};
