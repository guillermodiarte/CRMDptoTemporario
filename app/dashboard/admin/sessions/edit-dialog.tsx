"use client";

import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  UserCircle,
  Trash2,
  UserPlus,
  Search,
  Save,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  renameSession,
  toggleSessionStatus,
  getSessionUsers,
  addUserToSessionAction,
  removeUserFromSessionAction,
  updateUserSessionRoleAction,
  getAvailableUsersForSession,
} from "./actions";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SessionMember {
  userId: string;
  role: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    isActive: boolean;
  };
}

interface AvailableUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

interface EditSessionDialogProps {
  session: {
    id: string;
    name: string;
    isActive: boolean;
    _count: { users: number };
  };
  open: boolean;
  onClose: () => void;
}

export function EditSessionDialog({ session, open, onClose }: EditSessionDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // General tab
  const [name, setName] = useState(session.name);
  const [isActive, setIsActive] = useState(session.isActive);

  // Users tab
  const [members, setMembers] = useState<SessionMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Add user tab
  const [search, setSearch] = useState("");
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AvailableUser | null>(null);
  const [newUserRole, setNewUserRole] = useState<"ADMIN" | "VISUALIZER">("VISUALIZER");

  useEffect(() => {
    if (open) {
      setName(session.name);
      setIsActive(session.isActive);
      loadMembers();
      loadAvailable("");
    }
  }, [open, session]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => loadAvailable(search), 300);
    return () => clearTimeout(t);
  }, [search, open]);

  const loadMembers = async () => {
    setLoadingMembers(true);
    try {
      const data = await getSessionUsers(session.id);
      setMembers(data as SessionMember[]);
    } finally {
      setLoadingMembers(false);
    }
  };

  const loadAvailable = async (q: string) => {
    setLoadingAvailable(true);
    try {
      const data = await getAvailableUsersForSession(session.id, q);
      setAvailableUsers(data as AvailableUser[]);
      setSelectedUser(null);
    } finally {
      setLoadingAvailable(false);
    }
  };

  const handleSaveGeneral = () => {
    startTransition(async () => {
      const promises: Promise<any>[] = [];
      if (name.trim() !== session.name) {
        promises.push(renameSession(session.id, name.trim()));
      }
      if (isActive !== session.isActive) {
        promises.push(toggleSessionStatus(session.id, isActive));
      }
      if (promises.length === 0) {
        toast.info("Sin cambios");
        return;
      }
      const results = await Promise.all(promises);
      if (results.every((r) => r.success)) {
        toast.success("Sesión actualizada");
        router.refresh();
        onClose();
      } else {
        toast.error("Error al guardar cambios");
      }
    });
  };

  const handleRemoveUser = async (userId: string) => {
    const res = await removeUserFromSessionAction(session.id, userId);
    if (res.success) {
      toast.success("Usuario eliminado de la sesión");
      loadMembers();
      loadAvailable(search);
    } else {
      toast.error(res.error || "Error");
    }
  };

  const handleChangeRole = async (userId: string, role: string) => {
    const res = await updateUserSessionRoleAction(session.id, userId, role);
    if (res.success) {
      toast.success("Rol actualizado");
      loadMembers();
    } else {
      toast.error(res.error || "Error");
    }
  };

  const handleAddUser = async () => {
    if (!selectedUser) return;
    const res = await addUserToSessionAction(session.id, selectedUser.id, newUserRole);
    if (res.success) {
      toast.success(`${selectedUser.name || selectedUser.email} agregado`);
      setSelectedUser(null);
      setSearch("");
      loadMembers();
      loadAvailable("");
    } else {
      toast.error(res.error || "Error");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Sesión: {session.name}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="general" className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="general" className="flex-1">General</TabsTrigger>
            <TabsTrigger value="users" className="flex-1">
              <Users className="mr-1 h-3.5 w-3.5" />
              Usuarios ({members.length})
            </TabsTrigger>
            <TabsTrigger value="add" className="flex-1">
              <UserPlus className="mr-1 h-3.5 w-3.5" />
              Agregar
            </TabsTrigger>
          </TabsList>

          {/* GENERAL TAB */}
          <TabsContent value="general" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Nombre de la Sesión</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="flex items-center gap-3 p-3 border rounded-md">
              <div className="flex-1">
                <p className="font-medium text-sm">Estado</p>
                <p className="text-xs text-muted-foreground">
                  {isActive ? "La sesión está activa y accesible." : "La sesión está desactivada."}
                </p>
              </div>
              <Button
                variant={isActive ? "destructive" : "default"}
                size="sm"
                onClick={() => setIsActive(!isActive)}
              >
                {isActive ? "Desactivar" : "Activar"}
              </Button>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
              <Button onClick={handleSaveGeneral} disabled={isPending}>
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Guardar
              </Button>
            </div>
          </TabsContent>

          {/* USERS TAB */}
          <TabsContent value="users" className="pt-4">
            {loadingMembers ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : members.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">No hay usuarios en esta sesión.</p>
            ) : (
              <ul className="divide-y border rounded-md">
                {members.map((m) => (
                  <li key={m.userId} className="flex items-center gap-3 px-3 py-2.5">
                    {m.user.image ? (
                      <img src={m.user.image} alt="" className="h-8 w-8 rounded-full object-cover shrink-0" />
                    ) : (
                      <UserCircle className="h-8 w-8 text-muted-foreground shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm truncate">{m.user.name || "Sin nombre"}</div>
                      <div className="text-xs text-muted-foreground truncate">{m.user.email}</div>
                    </div>
                    <Select
                      value={m.role}
                      onValueChange={(v) => handleChangeRole(m.userId, v)}
                    >
                      <SelectTrigger className="h-8 w-32 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ADMIN">Administrador</SelectItem>
                        <SelectItem value="VISUALIZER">Visualizador</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-600 h-8 w-8 shrink-0"
                      onClick={() => handleRemoveUser(m.userId)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          {/* ADD USER TAB */}
          <TabsContent value="add" className="space-y-4 pt-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nombre o email..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="border rounded-md max-h-44 overflow-y-auto">
              {loadingAvailable ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : availableUsers.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-6">
                  {search ? "No se encontraron usuarios." : "No hay usuarios disponibles."}
                </p>
              ) : (
                <ul className="divide-y">
                  {availableUsers.map((u) => (
                    <li
                      key={u.id}
                      onClick={() => setSelectedUser(u)}
                      className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors ${selectedUser?.id === u.id ? "bg-primary/10 border-l-2 border-primary" : ""
                        }`}
                    >
                      {u.image ? (
                        <img src={u.image} alt="" className="h-7 w-7 rounded-full object-cover shrink-0" />
                      ) : (
                        <UserCircle className="h-7 w-7 text-muted-foreground shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{u.name || "Sin nombre"}</div>
                        <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {selectedUser && (
              <div className="space-y-2 p-3 bg-muted/30 rounded-md border">
                <p className="text-sm font-medium">
                  Agregar: <span className="text-primary">{selectedUser.name || selectedUser.email}</span>
                </p>
                <div className="space-y-1">
                  <Label className="text-xs">Rol en esta sesión</Label>
                  <Select value={newUserRole} onValueChange={(v) => setNewUserRole(v as any)}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">Administrador</SelectItem>
                      <SelectItem value="VISUALIZER">Visualizador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" onClick={handleAddUser}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Agregar a Sesión
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
