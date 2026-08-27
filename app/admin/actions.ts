"use server";

import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function getUserSessions(formData: FormData) {
  const data = Object.fromEntries(formData.entries());

  // Validate credentials format
  const parsed = LoginSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "Formato de credenciales inválido" };
  }

  const { email, password } = parsed.data;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        sessions: {
          where: { session: { isActive: true } },
          include: {
            session: {
              select: { name: true, isActive: true }
            }
          }
        }
      }
    });

    if (!user) {
      return { success: false, error: "Credenciales inválidas" };
    }

    const passwordsMatch = await bcrypt.compare(password, user.password);
    if (!passwordsMatch) {
      return { success: false, error: "Credenciales inválidas" };
    }

    const isSuperAdmin = email.toLowerCase().trim() === 'guillermo.diarte@gmail.com' || user.isSuperAdmin;

    if (isSuperAdmin) {
      const allActive = await prisma.session.findMany({
        where: { isActive: true },
        select: { id: true, name: true, isActive: true }
      });

      // Ensure superadmin has userSession for each active session
      for (const s of allActive) {
        await prisma.userSession.upsert({
          where: { userId_sessionId: { userId: user.id, sessionId: s.id } },
          update: { role: 'ADMIN' },
          create: { userId: user.id, sessionId: s.id, role: 'ADMIN' }
        });
      }

      const sessions = allActive.map(s => ({
        sessionId: s.id,
        role: 'ADMIN',
        name: s.name
      }));

      return { success: true, sessions };
    }

    // Return allowed sessions for regular user
    const sessions = user.sessions.map(s => ({
      sessionId: s.sessionId,
      role: s.role,
      name: s.session.name
    }));

    return { success: true, sessions };

  } catch (error) {
    console.error("Login verification error:", error);
    return { success: false, error: "Error al verificar credenciales" };
  }
}
