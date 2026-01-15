"use client";

import { useState } from "react";
import { User } from "@prisma/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash, Search, Ban } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserForm } from "./user-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface UsersClientProps {
  data: User[];
  currentUserId?: string;
}

export function UsersClient({ data, currentUserId }: UsersClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<{ id: string; action: "DEACTIVATE" | "DELETE" } | null>(null);

  // Filter
  const filteredData = data.filter(user => {
    const matchesSearch =
      (user.name?.toLowerCase() || "").includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase()) ||
      (user.phone || "").includes(search);

    const matchesRole = roleFilter === "ALL" || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setOpen(true);
  };

  const handleCreate = () => {
    setEditingUser(null);
    setOpen(true);
  };

  const confirmAction = async () => {
    if (!deleteId) return;
    try {
      if (deleteId.action === "DELETE") {
        await fetch(`/api/users/${deleteId.id}`, { method: "DELETE" });
      } else {
        // Deactivate (Edit)
        await fetch(`/api/users/${deleteId.id}`, {
          method: "PATCH",
          body: JSON.stringify({ isActive: false })
        });
      }
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Usuarios</h2>
          <p className="text-muted-foreground">Gestión de acceso y roles del sistema.</p>
        </div>

        <Dialog open={open} onOpenChange={(val) => {
          setOpen(val);
          if (!val) setEditingUser(null);
        }}>
          <DialogTrigger asChild>
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" /> Nuevo Usuario
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md" onCloseAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>{editingUser ? "Editar Usuario" : "Nuevo Usuario"}</DialogTitle>
            </DialogHeader>
            <UserForm
              initialData={editingUser}
              setOpen={setOpen}
              currentUserId={currentUserId}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4 items-center bg-white p-4 rounded-lg shadow-sm border">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Buscar por nombre, email o teléfono..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por Rol" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos los roles</SelectItem>
            <SelectItem value="ADMIN">Administrador</SelectItem>
            <SelectItem value="VISUALIZER">Visualizador</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((user) => {
              const isCurrentUser = user.id === currentUserId;
              return (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="font-medium">{user.name || "Sin nombre"}</div>
                    <div className="text-xs text-muted-foreground">{user.email}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.phone || "-"}
                  </TableCell>
                  <TableCell>
                    {user.isActive ? (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100 shadow-none border-0">Activo</Badge>
                    ) : (
                      <Badge variant="destructive">Inactivo</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(user)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {!isCurrentUser && (
                      <>
                        {user.isActive ? (
                          <Button variant="ghost" size="icon" className="text-orange-500 hover:text-orange-600" onClick={() => setDeleteId({ id: user.id, action: "DEACTIVATE" })}>
                            <Ban className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => setDeleteId({ id: user.id, action: "DELETE" })}>
                            <Trash className="h-4 w-4" />
                          </Button>
                        )}
                      </>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredData.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                  No se encontraron usuarios.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(val) => !val && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteId?.action === "DEACTIVATE" ? "¿Desactivar Usuario?" : "¿Eliminar Usuario?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteId?.action === "DEACTIVATE"
                ? "Esta acción desactivará al usuario y le impedirá iniciar sesión. Podrás reactivarlo editando su perfil."
                : "Esta acción ELIMINARÁ PERMANENTEMENTE al usuario de la base de datos. Esta acción no se puede deshacer."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className={deleteId?.action === "DEACTIVATE" ? "bg-orange-500 hover:bg-orange-600" : "bg-red-600 hover:bg-red-700"}
              onClick={confirmAction}
            >
              {deleteId?.action === "DEACTIVATE" ? "Sí, Desactivar" : "Sí, Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
