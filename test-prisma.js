const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.menuItem.findMany().then(console.log).finally(() => prisma.$disconnect());