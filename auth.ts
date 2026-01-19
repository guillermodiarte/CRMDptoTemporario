import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

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
          .object({ email: z.string().email(), password: z.string().min(6) })
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
            return user;
          } else {
            console.log('>>> Password mismatch.');
            // Debug hash comparison (be careful not to log plain passwords in prod logs permanently, but for now it's necessary to debug)
            // console.log('Stored hash:', user.password);
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
});
