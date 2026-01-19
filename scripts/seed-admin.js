const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = 'guillermo.diarte@gmail.com';
  const password = 'Admin1234';

  console.log(`>>> Checking admin user: ${email}`);

  // Need to handle potential connection errors cleanly
  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (!existingUser) {
      console.log('>>> User not found. Creating admin user...');
      const hashedPassword = await bcrypt.hash(password, 10);

      await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name: 'Admin', // Default name
          role: 'ADMIN',
        },
      });
      console.log('>>> Admin user created successfully.');
    } else {
      console.log('>>> Admin user already exists. Updating role and password...');
      const hashedPassword = await bcrypt.hash(password, 10);
      await prisma.user.update({
        where: { email },
        data: {
          role: 'ADMIN',
          password: hashedPassword
        },
      });
      console.log('>>> User role and password updated.');
    }
  } catch (error) {
    console.error('>>> Error checking/creating admin user:', error);
    // Don't exit with error to avoid crashing the whole start script if just seeding fails,
    // but useful to know.
    process.exit(1);
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
