const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const admins = [
    { email: 'guillermo.diarte@gmail.com', password: 'Gad33224122' },
    { email: 'gadiarte@gmail.com', password: 'Diarte1035' }
  ];

  for (const admin of admins) {
    const { email, password } = admin;
    console.log(`>>> Processing admin: ${email}`);

    try {
      const existingUser = await prisma.user.findUnique({ where: { email } });

      if (!existingUser) {
        console.log(`>>> creating ${email}...`);
        const hashedPassword = await bcrypt.hash(password, 10);
        await prisma.user.create({
          data: {
            email,
            password: hashedPassword,
            name: 'Admin',
            isSuperAdmin: true,
            isActive: true,
          },
        });
        console.log(`>>> ${email} created.`);
      } else {
        console.log(`>>> ${email} exists. Updating credentials and isSuperAdmin...`);
        const hashedPassword = await bcrypt.hash(password, 10);
        await prisma.user.update({
          where: { email },
          data: {
            isSuperAdmin: true,
            isActive: true,
            password: hashedPassword,
          },
        });
        console.log(`>>> ${email} updated.`);
      }
    } catch (error) {
      console.error(`>>> Error processing ${email}:`, error);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
