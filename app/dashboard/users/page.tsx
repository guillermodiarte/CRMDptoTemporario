import { redirect } from "next/navigation";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { UsersClient } from "@/components/users-client";

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const session = await auth();
  const userRole = (session?.user as any)?.role;
  const sessionId = session?.user?.sessionId;

  if (!session || userRole !== "ADMIN") {
    redirect("/dashboard");
  }

  // Fetch users that belong to this session, including ALL their session memberships
  const usersInSession = await prisma.user.findMany({
    where: {
      sessions: {
        some: { sessionId }
      }
    },
    include: {
      sessions: {
        include: {
          session: { select: { name: true, isActive: true } }
        }
      }
    },
    orderBy: { name: "asc" }
  });

  // Fetch all active sessions for the assignment form
  const availableSessions = await prisma.session.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" }
  });

  // Merge user data with their session-specific role and pass all their sessions
  const users = usersInSession.map((user: any) => {
    const currentMembership = user.sessions.find((s: any) => s.sessionId === sessionId);
    return {
      ...user,
      role: currentMembership?.role || "VISUALIZER",
      allSessions: user.sessions
    };
  });

  return <UsersClient data={users} currentUserId={session?.user?.id} availableSessions={availableSessions} />;
}
