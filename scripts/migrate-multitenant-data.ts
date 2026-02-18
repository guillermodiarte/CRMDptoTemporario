
import { PrismaClient, Role } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting multi-tenant data migration...')

  // 1. Check if default session exists or create it
  // We look for a session named "Sesión Principal" or create one
  let defaultSession = await prisma.session.findFirst({
    where: { name: "Sesión Principal" }
  })

  if (!defaultSession) {
    console.log('Creating Default Session...')
    defaultSession = await prisma.session.create({
      data: {
        name: "Sesión Principal",
        isActive: true,
      }
    })
  }

  console.log(`Using Session: ${defaultSession.name} (${defaultSession.id})`)

  // 2. Migrate Users
  const users = await prisma.user.findMany()
  console.log(`Found ${users.length} users to migrate.`)

  for (const user of users) {
    // Set Super Admin
    if (user.email === 'guillermo.diarte@gmail.com' && !user.isSuperAdmin) {
      console.log(`Promoting ${user.email} to Super Admin...`)
      await prisma.user.update({
        where: { id: user.id },
        data: { isSuperAdmin: true }
      })
    }

    // Link to Session
    const existingLink = await prisma.userSession.findUnique({
      where: {
        userId_sessionId: {
          userId: user.id,
          sessionId: defaultSession.id
        }
      }
    })

    if (!existingLink) {
      console.log(`Linking user ${user.email} to session...`)
      await prisma.userSession.create({
        data: {
          userId: user.id,
          sessionId: defaultSession.id,
          role: Role.ADMIN // Assign default Admin role for migration as requested
        }
      })
    }
  }

  // 3. Migrate Data Entities
  const entities = [
    { model: 'department', name: 'Departments' },
    { model: 'reservation', name: 'Reservations' },
    { model: 'expense', name: 'Expenses' },
    { model: 'supply', name: 'Supplies' },
    { model: 'note', name: 'Notes' },
    { model: 'blacklistEntry', name: 'Blacklist Entries' },
    { model: 'systemSettings', name: 'System Settings' }
  ]

  for (const entity of entities) {
    console.log(`Migrating ${entity.name}...`)
    // @ts-ignore
    const result = await prisma[entity.model].updateMany({
      where: { sessionId: null },
      data: { sessionId: defaultSession.id }
    })
    console.log(`Updated ${result.count} ${entity.name}.`)
  }

  console.log('Migration completed successfully.')
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
