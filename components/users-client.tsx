"use client";

import { useState, useEffect } from "react";
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
import { Plus, Pencil, Trash, Search, Ban, UserPlus, ChevronDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserForm } from "./user-form";
import { UsersActions } from "./users-actions";
import { AddExistingUserDialog } from "./add-existing-user-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

type ExtendedUser = User & { role?: string; allSessions?: any[] };

interface UsersClientProps {
  data: ExtendedUser[];
  currentUserId?: string;
  availableSessions?: { id: string; name: string }[];
}

export function UsersClient({ data, currentUserId, availableSessions = [] }: UsersClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const [addExistingOpen, setAddExistingOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<{ id: string; action: "DEACTIVATE" | "DELETE" } | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Usuarios</h2>
          <p className="text-muted-foreground">Gestión de acceso y roles del sistema.</p>
        </div>

        {isMounted && (
          <div className="flex gap-2">
            <UsersActions data={data} availableSessions={availableSessions} />

            {/* Add Existing User Dialog */}
            <AddExistingUserDialog
              open={addExistingOpen}
              onClose={() => setAddExistingOpen(false)}
            />

            {/* Create New User Dialog */}
            <Dialog open={open} onOpenChange={(val) => {
              setOpen(val);
              if (!val) setEditingUser(null);
            }}>
              <DialogContent className="sm:max-w-md" onCloseAutoFocus={(e) => e.preventDefault()}>
                <DialogHeader>
                  <DialogTitle>{editingUser ? "Editar Usuario" : "Nuevo Usuario"}</DialogTitle>
                </DialogHeader>
                <UserForm
                  initialData={editingUser}
                  setOpen={setOpen}
                  currentUserId={currentUserId}
                  availableSessions={availableSessions}
                />
              </DialogContent>
            </Dialog>

            {/* Split Button Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="w-full md:w-auto gap-1">
                  <Plus className="h-4 w-4" /> Agregar Usuario <ChevronDown className="h-3 w-3 ml-1 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => setAddExistingOpen(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Agregar existente
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Crear nuevo usuario
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      <div className="flex gap-4 items-center bg-white dark:bg-slate-900 p-4 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
          <Input
            placeholder="Buscar por nombre, email o teléfono..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {isMounted ? (
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
        ) : (
          <div className="w-[180px] h-10 border rounded bg-muted animate-pulse" />
        )}
      </div>

      <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hidden md:block overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800">
              <TableHead className="text-slate-700 dark:text-slate-200">Usuario</TableHead>
              <TableHead className="text-slate-700 dark:text-slate-200">Rol</TableHead>
              <TableHead className="text-slate-700 dark:text-slate-200">Sesiones</TableHead>
              <TableHead className="text-slate-700 dark:text-slate-200">Teléfono</TableHead>
              <TableHead className="text-slate-700 dark:text-slate-200">Estado</TableHead>
              <TableHead className="text-right text-slate-700 dark:text-slate-200">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((user) => {
              const isCurrentUser = user.id === currentUserId;
              return (
                <TableRow key={user.id} className="border-b border-slate-100 dark:border-slate-800/60">
                  <TableCell>
                    <div className="font-medium text-slate-900 dark:text-slate-100">{user.name || "Sin nombre"}</div>
                    <div className="text-xs text-muted-foreground">{user.email}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
                      {user.role === 'ADMIN' ? 'Administrador' : user.role === 'VISUALIZER' ? 'Visualizador' : user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.allSessions && user.allSessions.length > 0 ? (
                        user.allSessions.map((s: any) => (
                          <Badge key={s.sessionId} variant="outline" className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 dark:border-slate-700 text-xs">
                            {s.session.name}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-800 dark:text-slate-200">
                    {user.phone || "-"}
                  </TableCell>
                  <TableCell>
                    {user.isActive ? (
                      <Badge className="bg-green-100 dark:bg-green-950/60 text-green-800 dark:text-green-300 hover:bg-green-100 shadow-none border-0">Activo</Badge>
                    ) : (
                      <Badge variant="destructive">Inactivo</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(user)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {!isCurrentUser && user.email !== "guillermo.diarte@gmail.com" && (
                      <>
                        {user.isActive ? (
                          <Button variant="ghost" size="icon" className="text-orange-500 hover:text-orange-600" onClick={() => setDeleteId({ id: user.id, action: "DEACTIVATE" })}>
                            <Ban className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button variant="ghost" size="icon" className="bg-red-500 hover:bg-red-600 text-black" onClick={() => setDeleteId({ id: user.id, action: "DELETE" })}>
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

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {filteredData.map((user) => {
          const isCurrentUser = user.id === currentUserId;
          return (
            <div key={user.id} className={`p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm ${!user.isActive ? "opacity-60 bg-muted/50" : ""}`}>
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <div className="font-bold text-base whitespace-normal break-words leading-tight text-slate-900 dark:text-slate-100">{user.name || "Sin nombre"}</div>
                  <div className="text-sm text-muted-foreground whitespace-normal break-words mt-0.5">{user.email}</div>
                  {user.phone && <div className="text-xs text-muted-foreground mt-1">{user.phone}</div>}
                  {user.allSessions && user.allSessions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {user.allSessions.map((s: any) => (
                        <Badge key={s.sessionId} variant="outline" className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 dark:border-slate-700 text-[10px]">
                          {s.session.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'} className="shrink-0">
                  {user.role === 'ADMIN' ? 'Administrador' : user.role === 'VISUALIZER' ? 'Visualizador' : user.role}
                </Badge>
              </div>

              <div className="flex justify-between items-center pt-3 mt-3 border-t border-slate-100 dark:border-slate-800">
                {user.isActive ? (
                  <Badge className="bg-green-100 dark:bg-green-950/60 text-green-800 dark:text-green-300 hover:bg-green-100 shadow-none border-0 shrink-0">Activo</Badge>
                ) : (
                  <Badge variant="destructive" className="shrink-0">Inactivo</Badge>
                )}

                <div className="flex gap-1 ml-auto">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(user)} className="h-8 px-3 text-xs">
                    Editar
                  </Button>
                  {!isCurrentUser && user.email !== "guillermo.diarte@gmail.com" && (
                    <>
                      {user.isActive ? (
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-orange-500 bg-orange-50/50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900/50" onClick={() => setDeleteId({ id: user.id, action: "DEACTIVATE" })}>
                          <Ban className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 bg-red-500 hover:bg-red-600 text-black" onClick={() => setDeleteId({ id: user.id, action: "DELETE" })}>
                          <Trash className="h-4 w-4" />
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {filteredData.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No se encontraron usuarios.
          </div>
        )}
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
