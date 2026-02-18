import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { SettingsForm } from "@/components/settings-form";

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const sessionId = session?.user?.sessionId;
  if (!sessionId) redirect("/select-session");

  // Fetch fresh role from DB (UserSession now) to avoid stale session issues
  const userSession = await prisma.userSession.findUnique({
    where: {
      userId_sessionId: {
        userId: session.user.id,
        sessionId
      }
    },
    select: { role: true }
  });

  if (!userSession) {
    redirect("/select-session");
  }

  if (userSession.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const activeParkingCount = await prisma.department.count({
    where: { type: "PARKING", isActive: true, sessionId }
  });

  return <SettingsForm activeParkingCount={activeParkingCount} />;
}
