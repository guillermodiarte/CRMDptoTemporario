
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Checking SystemSettings...');
  const settings = await prisma.systemSettings.findMany();
  console.log(settings);

  const parkingSetting = await prisma.systemSettings.findUnique({
    where: { key: 'SHOW_PARKING_MENU' }
  });
  console.log('SHOW_PARKING_MENU direct fetch:', parkingSetting);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
