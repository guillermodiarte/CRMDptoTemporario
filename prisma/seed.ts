import { PrismaClient, Role } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Cleaning database (limpiando base de datos)...')

  // Clean in order (dependencies first)
  await prisma.userSession.deleteMany()
  await prisma.note.deleteMany()
  await prisma.blacklistEntry.deleteMany()
  await prisma.expense.deleteMany()
  await prisma.reservation.deleteMany()
  await prisma.department.deleteMany()
  await prisma.supply.deleteMany()
  await prisma.systemSettings.deleteMany()
  await prisma.session.deleteMany()
  await prisma.user.deleteMany()

  console.log('Database cleaned.')
  console.log('Creating default session and user...')

  const password = await hash('Gad33224122', 12)

  // 1. Create Default Session
  const session = await prisma.session.create({
    data: {
      name: 'Sesión Principal',
      isActive: true
    }
  })

  // 2. Create Super Admin User
  const admin = await prisma.user.create({
    data: {
      email: 'guillermo.diarte@gmail.com',
      name: 'Guillermo A. Diarte',
      password,
      // role: Role.ADMIN, // REMOVED
      isActive: true,
      isSuperAdmin: true,
      image: "https://lh3.googleusercontent.com/a/ACg8ocL-F-y-y-y-y-y-y-y-y-y-y-y-y-y-y-y" // Optional placeholder
    },
  })

  // 3. Link User to Session as ADMIN
  await prisma.userSession.create({
    data: {
      userId: admin.id,
      sessionId: session.id,
      role: Role.ADMIN
    }
  })

  console.log('Default user created:')
  console.log({
    name: admin.name,
    email: admin.email,
    isSuperAdmin: admin.isSuperAdmin,
    session: session.name
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
