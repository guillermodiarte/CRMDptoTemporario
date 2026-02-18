"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Loader2, Pencil, Trash2, Power, PowerOff } from "lucide-react";
import { toast } from "sonner";
import { createSession, toggleSessionStatus, deleteSession } from "./actions";
import { useRouter } from "next/navigation";
import { EditSessionDialog } from "./edit-dialog";

export function SessionManager({ sessions }: { sessions: any[] }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newSessionName, setNewSessionName] = useState("");
  const [editingSession, setEditingSession] = useState<any | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionName.trim()) return;

    try {
      setLoading(true);
      const res = await createSession(newSessionName);
      if (res.success) {
        toast.success("Sesión creada correctamente");
        setIsOpen(false);
        setNewSessionName("");
        router.refresh();
      } else {
        toast.error("Error al crear la sesión");
      }
    } catch (error) {
      toast.error("Error inesperado");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    try {
      const res = await toggleSessionStatus(id, !currentStatus);
      if (res.success) {
        toast.success(`Sesión ${!currentStatus ? 'activada' : 'desactivada'}`);
        router.refresh();
      } else {
        toast.error("Error al actualizar estado");
      }
    } catch (error) {
      toast.error("Error inesperado");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar esta sesión? Se perderán todos sus datos.")) return;
    try {
      const res = await deleteSession(id);
      if (res.success) {
        toast.success("Sesión eliminada");
        router.refresh();
      } else {
        toast.error("Error al eliminar");
      }
    } catch (error) {
      toast.error("Error inesperado");
    }
  }

  return (
    <div className="space-y-4">
      {/* Edit Session Dialog */}
      {editingSession && (
        <EditSessionDialog
          session={editingSession}
          open={!!editingSession}
          onClose={() => {
            setEditingSession(null);
            router.refresh();
          }}
        />
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Sesiones Activas</h2>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Sesión
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nueva Sesión</DialogTitle>
              <DialogDescription>
                Crea un nuevo espacio de trabajo independiente logicamente.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Input
                    placeholder="Nombre de la Sesión"
                    value={newSessionName}
                    onChange={(e) => setNewSessionName(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Crear
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <div className="relative w-full overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b">
              <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Nombre</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">ID</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Estado</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Usuarios</th>
                <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {sessions.map((session) => (
                <tr key={session.id} className="border-b transition-colors hover:bg-muted/50">
                  <td className="p-4 align-middle font-medium">{session.name}</td>
                  <td className="p-4 align-middle text-xs text-muted-foreground">{session.id}</td>
                  <td className="p-4 align-middle">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${session.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {session.isActive ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="p-4 align-middle">{session._count.users}</td>
                  <td className="p-4 align-middle text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Editar sesión"
                        onClick={() => setEditingSession(session)}
                      >
                        <Pencil className="h-4 w-4 text-blue-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title={session.isActive ? "Desactivar" : "Activar"}
                        onClick={() => handleToggle(session.id, session.isActive)}
                      >
                        {session.isActive
                          ? <Power className="h-4 w-4 text-green-600" />
                          : <PowerOff className="h-4 w-4 text-red-600" />
                        }
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Eliminar sesión"
                        onClick={() => handleDelete(session.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
