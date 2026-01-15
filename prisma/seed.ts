import { PrismaClient, Role } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const password = await hash('Gad33224122', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'guillermodiarte@gmail.com' },
    update: {},
    create: {
      email: 'guillermodiarte@gmail.com',
      name: 'Guillermo Diarte',
      password,
      role: Role.ADMIN,
    },
  })
  console.log({ admin })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
