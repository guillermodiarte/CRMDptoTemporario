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
            // Return user with minimal info needed for JWT
            return {
              id: user.id,
              name: user.name,
              email: user.email,
              isSuperAdmin: user.isSuperAdmin,
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
        token.isSuperAdmin = user.isSuperAdmin;

        // Fetch memberships to decide default session
        const memberships = await prisma.userSession.findMany({
          where: { userId: user.id },
          orderBy: { updatedAt: 'desc' } // Most recently active?
        });

        if (memberships.length === 1) {
          token.sessionId = memberships[0].sessionId;
          token.role = memberships[0].role;
        } else if (memberships.length > 1) {
          // Check if sessionId passed in user object (from authorize)
          if (user.sessionId) {
            token.sessionId = user.sessionId;
            // Find role for this session
            const membership = memberships.find(m => m.sessionId === user.sessionId);
            token.role = membership?.role || null;
          } else {
            // Default to pending if not provided
            token.sessionId = null;
            token.role = null;
          }
        } else {
          // No sessions. 
          token.sessionId = null;
          token.role = null;
        }

        // SUPER ADMIN ENFORCEMENT: Always ADMIN, no exceptions
        if (user.email?.toLowerCase().trim() === 'guillermo.diarte@gmail.com') {
          token.role = 'ADMIN';
        }
      }

      // Handle Session Switch (Client update)
      if (trigger === "update" && session?.sessionId) {
        // Verify user belongs to this session
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
