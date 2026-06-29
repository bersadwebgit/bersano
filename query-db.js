const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("--- Searching all tables for target shopId/subdomain ---");
  const shops = await prisma.shopSettings.findMany();
  console.log("All ShopSettings:", shops);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
