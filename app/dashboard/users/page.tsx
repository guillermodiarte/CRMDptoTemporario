import { redirect } from "next/navigation";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { UsersClient } from "@/components/users-client";

export default async function UsersPage() {
  const session = await auth();
  const userRole = (session?.user as any)?.role;
  const sessionId = session?.user?.sessionId;

  if (!session || userRole !== "ADMIN") {
    redirect("/dashboard");
  }

  // Fetch users WITH their role in the current session
  const userSessions = await (prisma as any).userSession.findMany({
    where: { sessionId },
    include: {
      user: true,
    },
    orderBy: { user: { name: "asc" } },
  });

  // Merge user data with their session-specific role
  const users = userSessions.map((us: any) => ({
    ...us.user,
    role: us.role, // Override with session-specific role
  }));

  return <UsersClient data={users} currentUserId={session?.user?.id} />;
}
