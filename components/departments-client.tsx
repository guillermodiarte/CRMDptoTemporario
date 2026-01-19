"use client";

import { useState } from "react";
import { Department } from "@prisma/client";
import { Plus, Pencil, Eye, EyeOff, Wifi, Trash, Lock } from "lucide-react";
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
import { DepartmentsActions } from "./departments-actions";
import { cn } from "@/lib/utils";

interface DepartmentsClientProps {
  data: Department[];
  role?: string;
  totalSuppliesCost: number;
}

// Fix duplicated state declarations by replacing the component body
export const DepartmentsClient: React.FC<DepartmentsClientProps> = ({ data, role, totalSuppliesCost }) => {
  const [open, setOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
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

  const toggleActive = async (dept: Department) => {
    setTogglingId(dept.id);
    try {
      await fetch(`/api/departments/${dept.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...dept,
          isActive: !dept.isActive,
        })
      });
      router.refresh();
    } catch (e) {
      alert("Error al cambiar estado");
    } finally {
      setTogglingId(null);
    }
  };

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

  // Filter out archived departments
  const visibleData = data.filter(d => !(d as any).isArchived);

  return (
    <>
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Departamentos</h2>
        <div className="flex items-center gap-2">
          <DepartmentsActions data={data} />
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
              <DialogContent className="sm:max-w-[800px] max-h-[85vh] overflow-y-auto" onCloseAutoFocus={(e) => e.preventDefault()}>
                <DialogHeader>
                  <DialogTitle>{editingDept ? "Editar Departamento" : "Nuevo Departamento"}</DialogTitle>
                </DialogHeader>
                <DepartmentForm setOpen={setOpen} initialData={editingDept} />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Propiedades</CardTitle>
          <CardDescription>
            Gestiona tus unidades de alquiler temporal. Los inactivos no aparecen en nuevas reservas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Desktop Table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Nombre</TableHead>
                  <TableHead>Cap./Camas</TableHead>
                  <TableHead>Wifi</TableHead>
                  <TableHead>Cód. Locker</TableHead>
                  <TableHead>Links</TableHead>
                  <TableHead>Precios (Base/Limp)</TableHead>
                  <TableHead>Insumos (Global)</TableHead>
                  <TableHead>Estado</TableHead>
                  {!isVisualizer && <TableHead className="text-right">Acciones</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleData.map((dept) => (
                  <TableRow key={dept.id} className={cn(!dept.isActive && "opacity-60 bg-muted/50")}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {dept.color && (
                          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: dept.color }} title="Color distintivo" />
                        )}
                        <div className="min-w-0">
                          <div className="truncate font-semibold">{dept.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{dept.address}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {dept.maxPeople}p / {dept.bedCount}c
                    </TableCell>
                    <TableCell className="text-xs">
                      {dept.wifiName ? (
                        <div className="flex flex-col gap-0.5 max-w-[150px]">
                          <div className="flex items-center gap-1 font-medium truncate"><Wifi className="h-3 w-3 shrink-0" /> {dept.wifiName}</div>
                          <div className="text-muted-foreground select-all truncate">{dept.wifiPass}</div>
                        </div>
                      ) : "-"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {(dept as any).lockBoxCode ? (
                        <div className="flex items-center gap-1" title="Código Locker">
                          <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="font-mono select-all">{(dept as any).lockBoxCode}</span>
                        </div>
                      ) : "-"}
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="flex gap-1 items-center">
                        {(dept as any).googleMapsLink && (
                          <a
                            href={(dept as any).googleMapsLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Google Maps"
                            className="hover:opacity-80 transition-opacity"
                          >
                            <img src="/icons/maps.png" alt="Maps" className="w-6 h-6 object-contain" />
                          </a>
                        )}
                        {(dept as any).airbnbLink && (
                          <a
                            href={(dept as any).airbnbLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Airbnb"
                            className="hover:opacity-80 transition-opacity"
                          >
                            <img src="/icons/airbnb.png" alt="Airbnb" className="w-6 h-6 object-contain" />
                          </a>
                        )}
                        {(dept as any).bookingLink && (
                          <a
                            href={(dept as any).bookingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Booking.com"
                            className="hover:opacity-80 transition-opacity"
                          >
                            <img src="/icons/booking.png" alt="Booking" className="w-6 h-6 object-contain" />
                          </a>
                        )}
                        {!((dept as any).googleMapsLink || (dept as any).airbnbLink || (dept as any).bookingLink) && <span className="text-muted-foreground ml-2">-</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div>${dept.basePrice}</div>
                      <div className="text-muted-foreground">+${dept.cleaningFee} (Limp)</div>
                    </TableCell>
                    <TableCell className="text-xs font-medium text-red-600">
                      <div>${totalSuppliesCost}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={dept.isActive ? "default" : "secondary"}>
                        {dept.isActive ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    {!isVisualizer && (
                      <TableCell className="text-right space-x-2 whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleActive(dept)}
                          disabled={togglingId === dept.id}
                          title={dept.isActive ? "Desactivar" : "Activar"}
                        >
                          {dept.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(dept)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {!dept.isActive && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => setDeleteId(dept.id)}
                            title="Eliminar (Archivar)"
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {visibleData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={!isVisualizer ? 9 : 8} className="text-center h-24">
                      No se encontraron departamentos.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {visibleData.map((dept) => (
              <Card key={dept.id} className={cn("overflow-hidden", !dept.isActive && "opacity-60 bg-muted/50")}>
                <div className="p-4 space-y-3">
                  {/* Header: Name, Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {dept.color && (
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: dept.color }} />
                      )}
                      <div className="min-w-0">
                        <div className="font-semibold text-lg truncate">{dept.name}</div>
                        <div className="text-sm text-muted-foreground truncate">{dept.address}</div>
                      </div>
                    </div>
                    <Badge variant={dept.isActive ? "default" : "secondary"}>
                      {dept.isActive ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {/* Capacity */}
                    <div>
                      <span className="text-muted-foreground block text-xs">Capacidad</span>
                      <span className="font-medium">{dept.maxPeople} pax / {dept.bedCount} camas</span>
                    </div>

                    {/* Prices */}
                    <div>
                      <span className="text-muted-foreground block text-xs">Precios</span>
                      <div className="font-medium flex flex-wrap gap-1">
                        <span>${dept.basePrice}</span>
                        <span className="text-xs text-muted-foreground">+${dept.cleaningFee} Limp.</span>
                      </div>
                    </div>

                    {/* Wifi */}
                    <div className="col-span-2 bg-muted/30 p-2 rounded-md">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                        <Wifi className="h-3 w-3" /> Wifi
                      </div>
                      <div className="font-medium text-sm">{dept.wifiName || "-"}</div>
                      <div className="text-xs break-all select-all font-mono">{dept.wifiPass}</div>
                    </div>
                  </div>

                  {/* Footer: Links & Locker */}
                  <div className="flex items-center justify-between pt-2 border-t mt-2">
                    {/* Links Row */}
                    <div className="flex gap-3">
                      {(dept as any).googleMapsLink && (
                        <a href={(dept as any).googleMapsLink} target="_blank" rel="noopener noreferrer">
                          <img src="/icons/maps.png" alt="Maps" className="w-6 h-6 object-contain" />
                        </a>
                      )}
                      {(dept as any).airbnbLink && (
                        <a href={(dept as any).airbnbLink} target="_blank" rel="noopener noreferrer">
                          <img src="/icons/airbnb.png" alt="Airbnb" className="w-6 h-6 object-contain" />
                        </a>
                      )}
                      {(dept as any).bookingLink && (
                        <a href={(dept as any).bookingLink} target="_blank" rel="noopener noreferrer">
                          <img src="/icons/booking.png" alt="Booking" className="w-6 h-6 object-contain" />
                        </a>
                      )}
                      {/* Locker info inline if space allows, or specific icon */}
                      {(dept as any).lockBoxCode && (
                        <div className="flex items-center gap-1 border px-2 rounded-md bg-background text-xs" title="Locker">
                          <Lock className="h-3 w-3 text-muted-foreground" />
                          <span className="font-mono font-medium">{(dept as any).lockBoxCode}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Row */}
                  {!isVisualizer && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => toggleActive(dept)}
                        disabled={togglingId === dept.id}
                      >
                        {dept.isActive ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
                        {dept.isActive ? "Desactivar" : "Activar"}
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(dept)}>
                        <Pencil className="h-4 w-4 mr-2" /> Editar
                      </Button>
                      {!dept.isActive && (
                        <Button
                          variant="destructive"
                          size="sm"
                          className="px-3"
                          onClick={() => setDeleteId(dept.id)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            ))}
            {visibleData.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No se encontraron departamentos.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(val) => !val && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar Departamento?</AlertDialogTitle>
            <AlertDialogDescription>
              El departamento se <strong>eliminará de la vista</strong>.
              <br /><br />
              - <strong>No perderás</strong> los datos históricos ni financieros.
              <br />
              - Desaparecerá de todas las listas y formularios.
              <br />
              - Esta acción no se puede deshacer fácilmente desde el sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={confirmDelete}>
              Sí, Eliminar (Archivar)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
