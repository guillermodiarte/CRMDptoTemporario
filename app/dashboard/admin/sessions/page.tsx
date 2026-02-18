import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { SessionManager } from "./client";

export default async function AdminSessionsPage() {
  const session = await auth();

  if (!session?.user?.isSuperAdmin) {
    redirect("/dashboard");
  }

  const sessions = await (prisma as any).session.findMany({
    include: {
      _count: {
        select: { users: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gestión de Sesiones</h1>
        <p className="text-muted-foreground">
          Administra los espacios de trabajo y accesos globales del sistema.
        </p>
      </div>

      <SessionManager sessions={sessions} />
    </div>
  );
}
