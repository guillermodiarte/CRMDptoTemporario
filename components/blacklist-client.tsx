"use client";

import { useState } from "react";
import { BlacklistEntry } from "@prisma/client";
import { format } from "date-fns";
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
import { Plus, Pencil, Trash, Search, ShieldAlert } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BlacklistForm } from "./blacklist-form";
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
import { BlacklistActions } from "./blacklist-actions";

// Extending BlacklistEntry to include reportedBy
type BlacklistEntryWithUser = BlacklistEntry & { reportedBy?: { name: string | null; email: string | null } | null };

interface BlacklistClientProps {
  data: BlacklistEntryWithUser[];
  currentUserRole?: string;
}

export function BlacklistClient({ data, currentUserRole }: BlacklistClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [editingEntry, setEditingEntry] = useState<BlacklistEntry | null>(null);
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const isAdmin = currentUserRole === "ADMIN";

  const filteredData = data.filter((entry) => {
    const s = search.toLowerCase();
    return (
      entry.guestName.toLowerCase().includes(s) ||
      entry.guestPhone.includes(s) ||
      entry.reason.toLowerCase().includes(s)
    );
  });

  const handleEdit = (entry: BlacklistEntry) => {
    if (!isAdmin) return;
    setEditingEntry(entry);
    setOpen(true);
  };

  const handleCreate = () => {
    setEditingEntry(null);
    setOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await fetch(`/api/blacklist/${deleteId}`, { method: "DELETE" });
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
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ShieldAlert className="h-8 w-8 text-red-600" />
            Lista Negra
          </h2>
          <p className="text-muted-foreground">Gestión de huéspedes no admitidos.</p>
        </div>

        {isAdmin && (
          <Dialog open={open} onOpenChange={(val) => {
            setOpen(val);
            if (!val) setEditingEntry(null);
          }}>
            <DialogTrigger asChild>
              <Button onClick={handleCreate} variant="destructive">
                <Plus className="mr-2 h-4 w-4" /> Agregar Manualmente
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md" onCloseAutoFocus={(e) => e.preventDefault()}>
              <DialogHeader>
                <DialogTitle>{editingEntry ? "Editar Registro" : "Nuevo Registro en Lista Negra"}</DialogTitle>
              </DialogHeader>
              <BlacklistForm
                initialData={editingEntry}
                setOpen={setOpen}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex gap-4 items-center bg-white p-4 rounded-lg shadow-sm border">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Buscar por nombre, teléfono o motivo..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <BlacklistActions data={filteredData} />
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Huésped</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Reportado Por</TableHead>
              {isAdmin && <TableHead className="text-right">Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>
                  <div className="font-medium">{entry.guestName}</div>
                  <div className="text-xs text-muted-foreground">
                    {entry.checkIn
                      ? `Reserva: ${format(new Date(entry.checkIn), "dd/MM/yyyy")}`
                      : `Agregado: ${format(new Date(entry.createdAt), "dd/MM/yyyy")}`
                    }
                  </div>
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {entry.guestPhone}
                </TableCell>
                <TableCell className="max-w-[300px] truncate" title={entry.reason}>
                  {entry.reason}
                </TableCell>
                <TableCell>
                  <div className="text-sm">{entry.reportedBy?.name || "Desconocido"}</div>
                </TableCell>
                {isAdmin && (
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(entry)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => setDeleteId(entry.id)}>
                      <Trash className="h-4 w-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {filteredData.length === 0 && (
              <TableRow>
                <TableCell colSpan={isAdmin ? 5 : 4} className="text-center h-24 text-muted-foreground">
                  No se encontraron registros.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(val) => !val && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar de Lista Negra?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará (lógicamente) al huésped de la lista negra. Podrá volver a ser admitido en futuras reservas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={confirmDelete}>
              Sí, Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
