const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
  const user = await prisma.user.findUnique({ where: { email: 'guillermo.diarte@gmail.com' } });
  if (!user) { console.log('User not found'); return; }
  console.log('Found user:', user.id);

  // Update ALL UserSession records for this user to ADMIN
  const result = await prisma.userSession.updateMany({
    where: { userId: user.id },
    data: { role: 'ADMIN' }
  });
  console.log('Updated UserSessions to ADMIN:', result.count);

  // Also ensure isSuperAdmin is true
  await prisma.user.update({
    where: { id: user.id },
    data: { isSuperAdmin: true }
  });
  console.log('isSuperAdmin set to true. Done!');
  await prisma.$disconnect();
}

fix().catch(e => { console.error(e); process.exit(1); });
