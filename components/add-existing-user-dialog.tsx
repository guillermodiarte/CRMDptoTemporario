"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Search, UserPlus, Loader2, UserCircle } from "lucide-react";
import { useRouter } from "next/navigation";

interface AvailableUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  phone: string | null;
}

interface AddExistingUserDialogProps {
  open: boolean;
  onClose: () => void;
}

export function AddExistingUserDialog({ open, onClose }: AddExistingUserDialogProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<AvailableUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AvailableUser | null>(null);
  const [role, setRole] = useState<"ADMIN" | "VISUALIZER">("VISUALIZER");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchUsers = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/users/available?search=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchUsers("");
      setSearch("");
      setSelectedUser(null);
      setRole("VISUALIZER");
      setError("");
      setSuccess("");
    }
  }, [open, fetchUsers]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (open) fetchUsers(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, open, fetchUsers]);

  const handleAdd = async () => {
    if (!selectedUser) return;
    setAdding(true);
    setError("");
    try {
      const res = await fetch("/api/users/add-to-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUser.id, role }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al agregar usuario");
      }
      setSuccess(`${selectedUser.name || selectedUser.email} fue agregado a la sesión.`);
      router.refresh();
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setAdding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agregar Usuario Existente</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Buscá un usuario ya registrado en el sistema para agregarlo a esta sesión.
          </p>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nombre o email..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>

          {/* User List */}
          <div className="border rounded-md max-h-52 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : users.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {search ? "No se encontraron usuarios." : "No hay usuarios disponibles para agregar."}
              </div>
            ) : (
              <ul className="divide-y">
                {users.map((u) => (
                  <li
                    key={u.id}
                    onClick={() => setSelectedUser(u)}
                    className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors hover:bg-muted/50 ${selectedUser?.id === u.id ? "bg-primary/10 border-l-2 border-primary" : ""
                      }`}
                  >
                    {u.image ? (
                      <img src={u.image} alt="" className="h-8 w-8 rounded-full object-cover shrink-0" />
                    ) : (
                      <UserCircle className="h-8 w-8 text-muted-foreground shrink-0" />
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

          {/* Role selector - only shown when a user is selected */}
          {selectedUser && (
            <div className="space-y-2 p-3 bg-muted/30 rounded-md border">
              <p className="text-sm font-medium">
                Agregar a: <span className="text-primary">{selectedUser.name || selectedUser.email}</span>
              </p>
              <div className="space-y-1">
                <Label className="text-xs">Rol en esta sesión</Label>
                <Select value={role} onValueChange={(v) => setRole(v as "ADMIN" | "VISUALIZER")}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Administrador</SelectItem>
                    <SelectItem value="VISUALIZER">Visualizador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}
          {success && <p className="text-sm text-green-600 font-medium">{success}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={adding}>
              Cancelar
            </Button>
            <Button onClick={handleAdd} disabled={!selectedUser || adding}>
              {adding ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="mr-2 h-4 w-4" />
              )}
              Agregar a Sesión
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
