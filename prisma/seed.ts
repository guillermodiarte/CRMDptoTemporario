import { PrismaClient, Role } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Cleaning database (limpiando base de datos)...')

  // Clean in order of dependencies to avoid FK constraints issues
  // Note: Note and BlacklistEntry depend on User (sometimes) or just have string refs?
  // User has many Notes. BlacklistEntry has reportedBy (User).
  // Reservation has Department. Expense has Department.

  await prisma.note.deleteMany()
  await prisma.blacklistEntry.deleteMany()
  await prisma.expense.deleteMany()
  await prisma.reservation.deleteMany()
  await prisma.department.deleteMany()
  await prisma.supply.deleteMany()
  await prisma.systemSettings.deleteMany()
  await prisma.user.deleteMany()

  console.log('Database cleaned.')
  console.log('Creating default user (creando usuario por defecto)...')

  const password = await hash('Gad33224122', 12)

  const admin = await prisma.user.create({
    data: {
      email: 'guillermo.diarte@gmail.com',
      name: 'Guillermo A. Diarte',
      password,
      role: Role.ADMIN,
      isActive: true,
    },
  })

  console.log('Default user created:')
  console.log({
    name: admin.name,
    email: admin.email,
    role: admin.role
  })
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
