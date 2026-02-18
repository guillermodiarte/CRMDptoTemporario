"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, ArrowRight } from "lucide-react";

interface SessionSelectorProps {
  sessions: {
    sessionId: string;
    role: string;
    session: {
      name: string;
      isActive: boolean;
    };
  }[];
}

export function SessionSelector({ sessions }: SessionSelectorProps) {
  const { update } = useSession();
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleSelect = async (sessionId: string) => {
    try {
      setLoadingId(sessionId);

      // Update the session on the client (and sync with server via jwt callback logic)
      await update({ sessionId });

      toast.success("Sesión seleccionada correctamente");
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      console.error("Failed to select session:", error);
      toast.error("Error al seleccionar la sesión");
      setLoadingId(null);
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {sessions.map((membership) => (
        <Card
          key={membership.sessionId}
          className="cursor-pointer hover:border-primary transition-all hover:shadow-md"
          onClick={() => !loadingId && handleSelect(membership.sessionId)}
        >
          <CardHeader>
            <CardTitle className="text-xl flex items-center justify-between">
              {membership.session.name}
              {loadingId === membership.sessionId && <Loader2 className="h-4 w-4 animate-spin" />}
            </CardTitle>
            <CardDescription>
              Rol: <span className="font-medium text-foreground">
                {membership.role === "ADMIN" ? "Administrador" : membership.role === "VISUALIZER" ? "Visualizador" : membership.role}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              variant={loadingId === membership.sessionId ? "default" : "secondary"}
              disabled={!!loadingId}
            >
              {loadingId === membership.sessionId ? "Ingresando..." : "Ingresar"}
              {!loadingId && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
