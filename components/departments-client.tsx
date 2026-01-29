"use client";

import { useState, useEffect } from "react";
import { Department } from "@prisma/client";
import { Plus, Pencil, Eye, EyeOff, Wifi, Trash, Lock, Download } from "lucide-react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
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
  initialDepartments: Department[];
  defaultType?: "APARTMENT" | "PARKING";
  title?: string;
  role?: string;
  totalSuppliesCost: number;
}

// Fix duplicated state declarations by replacing the component body
export const DepartmentsClient: React.FC<DepartmentsClientProps> = ({ initialDepartments = [], defaultType, title = "Departamentos", role, totalSuppliesCost }) => {
  const [departments, setDepartments] = useState<Department[]>(initialDepartments);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const router = useRouter();
  const isVisualizer = role === 'VISUALIZER';
  const entityName = defaultType === "PARKING" ? "Cochera" : "Departamento";

  useEffect(() => {
    setDepartments(initialDepartments);
  }, [initialDepartments]);

  const handleEdit = (dept: Department) => {
    setEditingDepartment(dept);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setEditingDepartment(null);
    setIsModalOpen(true);
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
  const visibleData = departments.filter(d => !(d as any).isArchived);

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
            <p className="text-muted-foreground">
              Gestiona tus unidades.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <DepartmentsActions data={visibleData} role={role} />
            {!isVisualizer && (
              <Button onClick={() => { setEditingDepartment(null); setIsModalOpen(true); }} size="sm">
                <Plus className="mr-2 h-4 w-4" /> Nuevo
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <Dialog
            open={isModalOpen}
            onOpenChange={(open) => {
              setIsModalOpen(open);
              if (!open) setEditingDepartment(null);
            }}
          >
            <DialogContent className="sm:max-w-[700px] h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingDepartment ? `Editar ${entityName}` : `Crear ${entityName}`}
                </DialogTitle>
              </DialogHeader>
              <DepartmentForm
                setOpen={setIsModalOpen}
                initialData={editingDepartment}
                forcedType={defaultType}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className="mt-4 space-y-4">
        <div>
          <h3 className="text-lg font-medium">Propiedades</h3>
          <p className="text-sm text-muted-foreground">Gestiona tus unidades de alquiler temporal. Los inactivos no aparecen en nuevas reservas.</p>
        </div>
        {/* Desktop Table */}
        <div className="hidden md:block rounded-md border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Nombre</TableHead>
                {defaultType !== 'PARKING' && <TableHead>Cap./Camas</TableHead>}
                {defaultType !== 'PARKING' && <TableHead>Wifi</TableHead>}
                <TableHead>Cód. Locker</TableHead>
                <TableHead>Links</TableHead>
                {defaultType === 'PARKING' ? (
                  <>
                    <TableHead>Precio</TableHead>
                    <TableHead>Limpieza</TableHead>
                  </>
                ) : (
                  <TableHead>Precios (Base/Limp)</TableHead>
                )}
                {defaultType !== 'PARKING' && <TableHead>Insumos (Global)</TableHead>}
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
                        <div className="truncate font-semibold">
                          {dept.name}
                          {(dept as any).alias && <span className="text-muted-foreground font-normal ml-1">({(dept as any).alias})</span>}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{dept.address}</div>
                      </div>
                    </div>
                  </TableCell>
                  {defaultType !== 'PARKING' && (
                    <TableCell>
                      {(dept as any).type === 'PARKING' ? (
                        <Badge variant="outline" className="text-xs bg-slate-50">Cochera</Badge>
                      ) : (
                        <>{dept.maxPeople}p / {dept.bedCount}c</>
                      )}
                    </TableCell>
                  )}
                  {defaultType !== 'PARKING' && (
                    <TableCell className="text-xs">
                      {dept.wifiName ? (
                        <div className="flex flex-col gap-0.5 max-w-[150px]">
                          <div className="flex items-center gap-1 font-medium truncate"><Wifi className="h-3 w-3 shrink-0" /> {dept.wifiName}</div>
                          <div className="text-muted-foreground select-all truncate">{dept.wifiPass}</div>
                        </div>
                      ) : "-"}
                    </TableCell>
                  )}
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
                  {defaultType === 'PARKING' ? (
                    <>
                      <TableCell className="text-xs">${dept.basePrice}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">${dept.cleaningFee}</TableCell>
                    </>
                  ) : (
                    <TableCell className="text-xs">
                      <div>${dept.basePrice}</div>
                      <div className="text-muted-foreground">+${dept.cleaningFee} (Limp)</div>
                    </TableCell>
                  )}
                  {defaultType !== 'PARKING' && (
                    <TableCell className="text-xs font-medium text-red-600">
                      <div>${totalSuppliesCost}</div>
                    </TableCell>
                  )}
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
                          className="bg-red-500 hover:bg-red-600 text-black"
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
                    No se encontraron {entityName.toLowerCase()}s.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card View (Refined) */}
        <div className="md:hidden space-y-3">
          {visibleData.map((dept) => (
            <Card key={dept.id} className={cn("overflow-hidden", !dept.isActive && "opacity-60 bg-muted/50")}>
              <CardContent className="p-3 space-y-3">
                {/* Header: Name, Status */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      {dept.color && (
                        <div className="w-3 h-3 rounded-full shrink-0 mt-1.5" style={{ backgroundColor: dept.color }} />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-base whitespace-normal break-words leading-tight">
                          {dept.name}
                          {(dept as any).alias && <span className="text-muted-foreground font-normal ml-1">({(dept as any).alias})</span>}
                        </div>
                        <div className="text-xs text-muted-foreground whitespace-normal break-words mt-0.5">{dept.address}</div>
                      </div>
                    </div>
                    <Badge variant={dept.isActive ? "default" : "secondary"} className="shrink-0">
                      {dept.isActive ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-4 text-sm border-t pt-3 border-b pb-3">
                  {/* Capacity */}
                  {/* Slot 1: Capacity or Price Base */}
                  <div className="pl-3">
                    {defaultType === 'PARKING' ? (
                      <>
                        <span className="text-muted-foreground block text-xs uppercase tracking-wider">Precio</span>
                        <span className="font-medium text-sm">${dept.basePrice}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-muted-foreground block text-xs uppercase tracking-wider">Capacidad</span>
                        <span className="font-medium text-sm">{dept.maxPeople} pax / {dept.bedCount} camas</span>
                      </>
                    )}
                  </div>

                  {/* Slot 2: Prices (Combined) or Cleaning Fee */}
                  <div>
                    {defaultType === 'PARKING' ? (
                      <>
                        <span className="text-muted-foreground block text-xs uppercase tracking-wider">Limpieza</span>
                        <span className="font-medium text-sm">${dept.cleaningFee}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-muted-foreground block text-xs uppercase tracking-wider">Precios</span>
                        <div className="font-medium text-sm flex flex-wrap gap-1">
                          <span>${dept.basePrice}</span>
                          <span className="text-muted-foreground">+${dept.cleaningFee} Limp.</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Wifi */}
                  {defaultType !== 'PARKING' && (
                    <div className="col-span-2 bg-muted/30 p-3 rounded-md">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                        <Wifi className="h-4 w-4" /> Connectividad
                      </div>
                      <div className="font-medium text-sm whitespace-normal break-all">
                        {dept.wifiName || "-"}
                      </div>
                      <div className="text-sm break-all select-all font-mono text-muted-foreground">
                        Pass: {dept.wifiPass}
                      </div>
                    </div>
                  )}

                  {/* Keys/Locker */}
                  {(dept as any).lockBoxCode && (
                    <div className="col-span-2 flex items-center gap-2 border px-3 py-2 rounded bg-background text-sm">
                      <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">Locker:</span>
                      <span className="font-mono font-medium select-all">{(dept as any).lockBoxCode}</span>
                    </div>
                  )}
                </div>

                {/* Footer: Links & Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1 pl-3">
                  {/* Links Row */}
                  <div className="flex gap-3">
                    {(dept as any).googleMapsLink && (
                      <a href={(dept as any).googleMapsLink} target="_blank" rel="noopener noreferrer">
                        <img src="/icons/maps.png" alt="Maps" className="w-8 h-8 object-contain hover:scale-110 transition-transform" />
                      </a>
                    )}
                    {(dept as any).airbnbLink && (
                      <a href={(dept as any).airbnbLink} target="_blank" rel="noopener noreferrer">
                        <img src="/icons/airbnb.png" alt="Airbnb" className="w-8 h-8 object-contain hover:scale-110 transition-transform" />
                      </a>
                    )}
                    {(dept as any).bookingLink && (
                      <a href={(dept as any).bookingLink} target="_blank" rel="noopener noreferrer">
                        <img src="/icons/booking.png" alt="Booking" className="w-8 h-8 object-contain hover:scale-110 transition-transform" />
                      </a>
                    )}
                  </div>

                  {/* Actions Row */}
                  {!isVisualizer && (
                    <div className="flex gap-2 ml-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-10 w-10 p-0"
                        onClick={() => toggleActive(dept)}
                        disabled={togglingId === dept.id}
                        title={dept.isActive ? "Desactivar" : "Activar"}
                      >
                        {dept.isActive ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5 text-muted-foreground" />}
                      </Button>
                      <Button variant="outline" size="sm" className="h-10 px-4 text-sm" onClick={() => handleEdit(dept)}>
                        Editar
                      </Button>
                      {!dept.isActive && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-10 w-10 p-0 bg-red-500 hover:bg-red-600 text-black"
                          onClick={() => setDeleteId(dept.id)}
                        >
                          <Trash className="h-5 w-5" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {visibleData.length === 0 && (
            <div className="text-center py-8 text-branch-foreground text-sm">
              No se encontraron departamentos.
            </div>
          )}
        </div>
      </div>


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
