import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

async function getUser(email: string) {
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    return user;
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw new Error('Failed to fetch user.');
  }
}

export const { auth, signIn, signOut, handlers } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(1), sessionId: z.string().optional() })
          .safeParse(credentials);

        if (parsedCredentials.success) {
          const { email, password } = parsedCredentials.data;
          console.log(`>>> Login attempt for: ${email}`);

          const user = await getUser(email);
          if (!user) {
            console.log('>>> User not found in DB.');
            return null;
          }

          const passwordsMatch = await bcrypt.compare(password, user.password);
          if (passwordsMatch) {
            console.log('>>> Password matched. Login successful.');
            // isSuperAdmin is ALWAYS derived from email, never from DB
            // This ensures only guillermo.diarte@gmail.com can ever be superadmin
            const isSuperAdmin = user.email?.toLowerCase().trim() === 'guillermo.diarte@gmail.com';
            return {
              id: user.id,
              name: user.name,
              email: user.email,
              isSuperAdmin,
              sessionId: parsedCredentials.data.sessionId // Pass through if present
              // image: user.image 
            };
          } else {
            console.log('>>> Password mismatch.');
            return null;
          }
        } else {
          console.log('>>> Invalid credentials format (Zod validation failed)');
        }

        console.log('Credenciales inválidas');
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        // Initial sign in
        token.sub = user.id;
        // Always derive isSuperAdmin from email — never trust DB value
        token.isSuperAdmin = user.email?.toLowerCase().trim() === 'guillermo.diarte@gmail.com';

        // Fetch active memberships
        const memberships = await prisma.userSession.findMany({
          where: { 
            userId: user.id,
            session: { isActive: true }
          },
          include: {
            session: {
              select: { isActive: true }
            }
          },
          orderBy: { updatedAt: 'desc' }
        });

        if (user.sessionId) {
          // If sessionId explicitly passed during login, verify it is active
          const validSession = await prisma.session.findFirst({
            where: { id: user.sessionId, isActive: true }
          });

          if (validSession) {
            token.sessionId = validSession.id;
            const membership = memberships.find(m => m.sessionId === validSession.id);
            token.role = token.isSuperAdmin ? 'ADMIN' : (membership?.role || 'ADMIN');
            // Ensure userSession exists
            await prisma.userSession.upsert({
              where: { userId_sessionId: { userId: user.id, sessionId: validSession.id } },
              update: { role: token.role as any },
              create: { userId: user.id, sessionId: validSession.id, role: token.role as any }
            });
          }
        }

        if (!token.sessionId) {
          if (memberships.length > 0) {
            // Default to the most recently updated active session
            token.sessionId = memberships[0].sessionId;
            token.role = memberships[0].role;
          } else if (token.isSuperAdmin) {
            // SuperAdmin with no active userSession: link to first active session in DB if exists
            const firstActive = await prisma.session.findFirst({
              where: { isActive: true },
              orderBy: { createdAt: 'asc' }
            });
            if (firstActive) {
              token.sessionId = firstActive.id;
              token.role = 'ADMIN';
              await prisma.userSession.upsert({
                where: { userId_sessionId: { userId: user.id, sessionId: firstActive.id } },
                update: { role: 'ADMIN' },
                create: { userId: user.id, sessionId: firstActive.id, role: 'ADMIN' }
              });
            } else {
              token.sessionId = null;
              token.role = 'ADMIN';
            }
          } else {
            // No sessions
            token.sessionId = null;
            token.role = null;
          }
        }

        // SUPER ADMIN ENFORCEMENT: Always ADMIN, no exceptions
        if (token.isSuperAdmin) {
          token.role = 'ADMIN';
        }
      }

      // Handle Session Switch (Client update)
      if (trigger === "update" && session?.sessionId) {
        // Verify session is active
        const activeSession = await prisma.session.findFirst({
          where: { id: session.sessionId, isActive: true }
        });

        if (activeSession) {
          if (token.isSuperAdmin) {
            token.sessionId = activeSession.id;
            token.role = 'ADMIN';
            await prisma.userSession.upsert({
              where: { userId_sessionId: { userId: token.sub!, sessionId: activeSession.id } },
              update: { role: 'ADMIN' },
              create: { userId: token.sub!, sessionId: activeSession.id, role: 'ADMIN' }
            });
          } else {
            const membership = await prisma.userSession.findUnique({
              where: {
                userId_sessionId: {
                  userId: token.sub!,
                  sessionId: session.sessionId
                }
              }
            });

            if (membership) {
              token.sessionId = membership.sessionId;
              token.role = membership.role;
            }
          }
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.sessionId = token.sessionId;
        session.user.role = token.role;
        session.user.isSuperAdmin = token.isSuperAdmin;
      }
      return session;
    }
  }
});
