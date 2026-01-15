"use client";

import { useState } from "react";
import { Department } from "@prisma/client";
import { Plus, Trash, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DepartmentForm } from "./department-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
import { useRouter } from "next/navigation";

interface DepartmentsClientProps {
  data: Department[];
  role?: string;
}

export const DepartmentsClient: React.FC<DepartmentsClientProps> = ({ data, role }) => {
  const [open, setOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const router = useRouter();
  const isVisualizer = role === 'VISUALIZER';

  const handleEdit = (dept: Department) => {
    setEditingDept(dept);
    setOpen(true);
  };

  const handleCreate = () => {
    setEditingDept(null);
    setOpen(true);
  }

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await fetch(`/api/departments/${deleteId}`, { method: 'DELETE' });
      router.refresh();
      setDeleteId(null);
    } catch (e) {
      alert("Error al eliminar");
    }
  };

  return (
    <>
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Departamentos</h2>
        {!isVisualizer && (
          <Dialog open={open} onOpenChange={(val) => {
            setOpen(val);
            if (!val) setEditingDept(null);
          }}>
            <DialogTrigger asChild>
              <Button onClick={handleCreate}>
                <Plus className="mr-2 h-4 w-4" /> Nuevo Departamento
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]" onCloseAutoFocus={(e) => e.preventDefault()}>
              <DialogHeader>
                <DialogTitle>{editingDept ? "Editar Departamento" : "Nuevo Departamento"}</DialogTitle>
              </DialogHeader>
              <DepartmentForm setOpen={setOpen} initialData={editingDept} />
            </DialogContent>
          </Dialog>
        )}
      </div>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Propiedades</CardTitle>
          <CardDescription>
            Gestiona tus unidades de alquiler temporal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Capacidad</TableHead>
                <TableHead>Estado</TableHead>
                {!isVisualizer && <TableHead className="text-right">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((dept) => (
                <TableRow key={dept.id}>
                  <TableCell className="font-medium">{dept.name}</TableCell>
                  <TableCell>
                    {dept.bedCount} camas / {dept.maxPeople} pers
                  </TableCell>
                  <TableCell>
                    <Badge variant={dept.isActive ? "default" : "destructive"}>
                      {dept.isActive ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  {!isVisualizer && (
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(dept)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => setDeleteId(dept.id)}>
                        <Trash className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={!isVisualizer ? 4 : 3} className="text-center h-24">
                    No se encontraron departamentos.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(val) => !val && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Departamento?</AlertDialogTitle>
            <AlertDialogDescription>
              El departamento quedará <strong>inactivo</strong>.
              <br /><br />
              - Las reservas pasadas se <strong>mantendrán visibles</strong> en el calendario.
              <br />
              - No podrá crear nuevas reservas para este departamento.
              <br />
              - Si crea un nuevo departamento con el mismo nombre, este se reactivará.
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
    </>
  );
};
