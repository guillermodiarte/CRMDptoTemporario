import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { BalanceConfigClient } from "@/components/balance-config-client";

export const dynamic = 'force-dynamic';

export default async function BalanceConfigPage() {
  const session = await auth();
  const sessionId = session?.user?.sessionId;
  const userRole = session?.user?.role;
  const isSuperAdmin = !!(session?.user as any)?.isSuperAdmin;

  // Only superadmin can access the config page
  if (!sessionId || userRole !== 'ADMIN' || !isSuperAdmin) {
    redirect("/dashboard/balance");
  }

  const receivers = prisma.paymentReceiver
    ? await prisma.paymentReceiver.findMany({
        where: { sessionId, isActive: true },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      })
    : [];

  const balanceSetting = await prisma.systemSettings.findUnique({
    where: { sessionId_key: { sessionId, key: "BALANCE_ENABLED_USERS" } }
  });

  let enabledUsers: string[] = [];
  if (balanceSetting?.value) {
    try { enabledUsers = JSON.parse(balanceSetting.value); } catch { enabledUsers = []; }
  }

  // Get all users in this session
  const userSessions = await prisma.userSession.findMany({
    where: { sessionId },
    include: { user: { select: { id: true, email: true, name: true } } }
  });
  const allUsers = userSessions.map(us => us.user);

  return (
    <BalanceConfigClient
      receivers={receivers}
      enabledUsers={enabledUsers}
      allUsers={allUsers}
      isSuperAdmin={isSuperAdmin}
    />
  );
}
