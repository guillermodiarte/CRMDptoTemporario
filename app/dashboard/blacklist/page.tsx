import { redirect } from "next/navigation";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { BlacklistClient } from "@/components/blacklist-client";

export default async function BlacklistPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  // Fetch active blacklist entries
  const entries = await prisma.blacklistEntry.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
    include: {
      reportedBy: { select: { name: true, email: true } }
    }
  });

  return <BlacklistClient data={entries} currentUserRole={(session.user as any)?.role} />;
}
