import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { SessionSelector } from "@/components/session-selector";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/auth";
import { InitialSetupClient } from "./setup-client";

export const dynamic = 'force-dynamic';

export default async function SelectSessionPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/admin");
  }

  const isSuperAdmin = (session.user as any).isSuperAdmin === true;

  // Fetch available sessions for the user
  const memberships = await prisma.userSession.findMany({
    where: {
      userId: session.user.id,
      session: { isActive: true } // Only active sessions
    },
    include: {
      session: {
        select: {
          name: true,
          isActive: true
        }
      }
    },
    orderBy: { updatedAt: 'desc' }
  });

  if (memberships.length === 0) {
    // SuperAdmin with no sessions → show initial setup screen
    if (isSuperAdmin) {
      return <InitialSetupClient />;
    }

    // Regular user with no sessions → show generic error
    return (
      <div className="flex h-screen w-full items-center justify-center bg-muted/40 p-4">
        <div className="w-full max-w-md text-center space-y-4 rounded-xl border bg-card p-8 shadow-sm">
          <h2 className="text-xl font-semibold">No tienes sesiones activas</h2>
          <p className="text-sm text-muted-foreground">
            Tu usuario no pertenece a ninguna organización o sesión activa. Contacta al administrador.
          </p>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/admin" });
            }}
          >
            <Button variant="outline" className="w-full gap-2">
              <LogOut className="h-4 w-4" />
              Cerrar Sesión
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4 md:p-8">
      <div className="w-full max-w-5xl space-y-8">
        <div className="flex flex-col items-center text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Selecciona tu Espacio de Trabajo</h1>
          <p className="text-muted-foreground">
            Hola, <span className="font-semibold text-foreground">{session.user.name}</span>. Elige una sesión para continuar.
          </p>
        </div>

        <SessionSelector sessions={memberships as any} />

        <div className="flex justify-center mt-8">
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/admin" });
            }}
          >
            <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground">
              <LogOut className="h-4 w-4" />
              Cerrar Sesión
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
