"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createSession(name: string) {
  const session = await auth();
  if (!session?.user?.isSuperAdmin) {
    throw new Error("Unauthorized");
  }

  try {
    const newSession = await prisma.session.create({
      data: {
        name,
        isActive: true,
      }
    });

    // Automatically add the creator as ADMIN to the new session?
    // Usually Super Admin might want access.
    await prisma.userSession.create({
      data: {
        userId: session.user.id!,
        sessionId: newSession.id,
        role: "ADMIN"
      }
    });

    revalidatePath("/dashboard/admin/sessions");
    return { success: true, session: newSession };
  } catch (error) {
    console.error("Failed to create session:", error);
    return { success: false, error: "Failed to create session" };
  }
}

export async function toggleSessionStatus(sessionId: string, isActive: boolean) {
  const session = await auth();
  if (!session?.user?.isSuperAdmin) {
    throw new Error("Unauthorized");
  }

  try {
    await prisma.session.update({
      where: { id: sessionId },
      data: { isActive }
    });
    revalidatePath("/dashboard/admin/sessions");
    return { success: true };
  } catch (error) {
    console.error("Failed to toggle session status:", error);
    return { success: false, error: "Failed to update session" };
  }
}

export async function deleteSession(sessionId: string) {
  const session = await auth();
  if (!session?.user?.isSuperAdmin) {
    throw new Error("Unauthorized");
  }

  try {
    // Soft delete? Hard delete? 
    // Sessions have relations. Hard delete might be dangerous if cascade is not set.
    // Schema has Cascade deletes usually?
    // Let's just hard delete for now but careful.
    // Better to just deactivate. But user might want to delete test sessions.

    await prisma.session.delete({
      where: { id: sessionId }
    });
    revalidatePath("/dashboard/admin/sessions");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete session:", error);
    return { success: false, error: "Failed to delete session" };
  }
}
export async function renameSession(sessionId: string, name: string) {
  const session = await auth();
  if (!session?.user?.isSuperAdmin) {
    throw new Error("Unauthorized");
  }
  try {
    await prisma.session.update({ where: { id: sessionId }, data: { name } });
    revalidatePath("/dashboard/admin/sessions");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to rename session" };
  }
}

export async function getSessionUsers(sessionId: string) {
  const session = await auth();
  if (!session?.user?.isSuperAdmin) {
    throw new Error("Unauthorized");
  }
  const memberships = await prisma.userSession.findMany({
    where: { sessionId },
    include: { user: { select: { id: true, name: true, email: true, image: true, isActive: true } } },
  });
  return memberships;
}

export async function addUserToSessionAction(sessionId: string, userId: string, role: string) {
  const session = await auth();
  if (!session?.user?.isSuperAdmin) {
    throw new Error("Unauthorized");
  }
  try {
    await prisma.userSession.create({ data: { userId, sessionId, role: role as any } });
    revalidatePath("/dashboard/admin/sessions");
    return { success: true };
  } catch (error: any) {
    if (error?.code === 'P2002') return { success: false, error: "El usuario ya está en esta sesión" };
    return { success: false, error: "Error al agregar usuario" };
  }
}

export async function removeUserFromSessionAction(sessionId: string, userId: string) {
  const session = await auth();
  if (!session?.user?.isSuperAdmin) {
    throw new Error("Unauthorized");
  }
  try {
    await prisma.userSession.delete({ where: { userId_sessionId: { userId, sessionId } } });
    revalidatePath("/dashboard/admin/sessions");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Error al eliminar usuario" };
  }
}

export async function updateUserSessionRoleAction(sessionId: string, userId: string, role: string) {
  const session = await auth();
  if (!session?.user?.isSuperAdmin) {
    throw new Error("Unauthorized");
  }
  try {
    await prisma.userSession.update({
      where: { userId_sessionId: { userId, sessionId } },
      data: { role: role as any },
    });
    revalidatePath("/dashboard/admin/sessions");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Error al actualizar rol" };
  }
}

export async function getAvailableUsersForSession(sessionId: string, search: string) {
  const session = await auth();
  if (!session?.user?.isSuperAdmin) {
    throw new Error("Unauthorized");
  }
  const existing = await prisma.userSession.findMany({ where: { sessionId }, select: { userId: true } });
  const existingIds = existing.map((e) => e.userId);
  const searchLower = search.toLowerCase();
  const users = await prisma.user.findMany({
    where: { id: { notIn: existingIds }, isActive: true },
    select: { id: true, name: true, email: true, image: true },
    orderBy: { name: 'asc' },
  });
  return search
    ? users.filter((u) => (u.name?.toLowerCase() || '').includes(searchLower) || u.email.toLowerCase().includes(searchLower)).slice(0, 20)
    : users.slice(0, 20);
}
