import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { SettingsForm } from "@/components/settings-form";

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Fetch fresh role from DB to avoid stale session issues
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true }
  });

  if (user?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const activeParkingCount = await prisma.department.count({
    where: { type: "PARKING", isActive: true }
  });

  return <SettingsForm activeParkingCount={activeParkingCount} />;
}
