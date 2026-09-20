import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';

export function getSuperAdminEnv() {
  const email = (process.env.SUPERADMIN_EMAIL || 'guillermo.diarte@gmail.com').toLowerCase().trim();
  const password = process.env.SUPERADMIN_PASSWORD || 'Gad33224122';
  const name = process.env.SUPERADMIN_NAME || 'Guillermo A. Diarte';
  return { email, password, name };
}

export function isSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const { email: superAdminEmail } = getSuperAdminEnv();
  return email.toLowerCase().trim() === superAdminEmail;
}

export function isSuperAdminCredentials(email: string, password: string): boolean {
  const { email: superAdminEmail, password: superAdminPassword } = getSuperAdminEnv();
  return email.toLowerCase().trim() === superAdminEmail && password === superAdminPassword;
}

/**
 * Ensures the super admin user and an active session exist in the database.
 * If the database is completely empty or the user was deleted, this creates:
 * 1. Default active session ("Sesión Principal") if none exists.
 * 2. Super admin user with isSuperAdmin: true.
 * 3. UserSession linking the super admin to the session with ADMIN role.
 * Also synchronizes the hashed password if changed in .env.
 */
export async function ensureSuperAdminInDb() {
  const { email, password, name } = getSuperAdminEnv();

  // 1. Ensure at least one active session exists
  let session = await prisma.session.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' }
  });

  if (!session) {
    session = await prisma.session.create({
      data: {
        name: 'Sesión Principal',
        isActive: true,
      }
    });
  }

  // 2. Find or create the super admin user
  let user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    const hashedPassword = await bcrypt.hash(password, 12);
    user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        isActive: true,
        isSuperAdmin: true,
      }
    });
  } else {
    // Check if password or superAdmin status needs sync
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch || !user.isSuperAdmin || !user.isActive) {
      const hashedPassword = !passwordMatch ? await bcrypt.hash(password, 12) : user.password;
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          isSuperAdmin: true,
          isActive: true
        }
      });
    }
  }

  // 3. Ensure UserSession link exists with ADMIN role
  await prisma.userSession.upsert({
    where: {
      userId_sessionId: {
        userId: user.id,
        sessionId: session.id
      }
    },
    update: { role: Role.ADMIN },
    create: {
      userId: user.id,
      sessionId: session.id,
      role: Role.ADMIN
    }
  });

  return { user, session };
}
