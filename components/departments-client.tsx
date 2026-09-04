"use client";

import { useState, useEffect } from "react";
import { Department } from "@prisma/client";
import { Plus, Pencil, Eye, EyeOff, Wifi, Trash, Lock, Download, Globe, GlobeLock, GripVertical } from "lucide-react";
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
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";

interface SortableDepartmentRowProps {
  dept: Department;
  defaultType?: "APARTMENT" | "PARKING";
  totalSuppliesCost: number;
  isVisualizer: boolean;
  canReorder?: boolean;
  isMounted: boolean;
  togglingId: string | null;
  onToggleActive: (dept: Department) => void;
  onTogglePublic: (dept: Department) => void;
  onEdit: (dept: Department) => void;
  onDelete: (id: string) => void;
}

const SortableDepartmentRow: React.FC<SortableDepartmentRowProps> = ({
  dept,
  defaultType,
  totalSuppliesCost,
  isVisualizer,
  canReorder = true,
  isMounted,
  togglingId,
  onToggleActive,
  onTogglePublic,
  onEdit,
  onDelete,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: dept.id, disabled: !canReorder || !isMounted });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.35 : undefined,
    position: isDragging ? "relative" : undefined,
  };

  const dragHandleProps = isMounted && canReorder ? { ...attributes, ...listeners } : {};

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={cn(
        "border-b border-slate-100 dark:border-slate-800/60 transition-colors",
        !dept.isActive && "opacity-60 bg-muted/50",
        isDragging && "bg-blue-50/50 dark:bg-blue-950/20 border-2 border-dashed border-blue-400 dark:border-blue-500"
      )}
    >
      {canReorder && (
        <TableCell className="w-10 px-2 text-center">
          <button
            type="button"
            {...dragHandleProps}
            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-grab active:cursor-grabbing inline-flex items-center justify-center transition-colors"
            title="Arrastrar para reordenar"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        </TableCell>
      )}
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          {dept.color && (
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: dept.color }} title="Color distintivo" />
          )}
          <div className="min-w-0">
            <div className="truncate font-semibold text-slate-900 dark:text-slate-100">
              {dept.name}
              {dept.alias && <span className="text-muted-foreground font-normal ml-1">({dept.alias})</span>}
            </div>
            <div className="text-xs text-muted-foreground truncate">{dept.address}</div>
          </div>
        </div>
      </TableCell>
      {defaultType !== 'PARKING' && (
        <TableCell className="text-slate-800 dark:text-slate-200">
          {dept.type === 'PARKING' ? (
            <Badge variant="outline" className="text-xs bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200">Cochera</Badge>
          ) : (
            <>{dept.maxPeople}p / {dept.bedCount}c</>
          )}
        </TableCell>
      )}
      {defaultType !== 'PARKING' && (
        <TableCell className="text-xs">
          {dept.wifiName ? (
            <div className="flex flex-col gap-0.5 max-w-[150px]">
              <div className="flex items-center gap-1 font-medium truncate text-slate-800 dark:text-slate-200"><Wifi className="h-3 w-3 shrink-0" /> {dept.wifiName}</div>
              <div className="text-muted-foreground select-all truncate">{dept.wifiPass}</div>
            </div>
          ) : "-"}
        </TableCell>
      )}
      <TableCell className="text-xs">
        {dept.lockBoxCode ? (
          <div className="flex items-center gap-1" title="Código Locker">
            <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="font-mono select-all">{dept.lockBoxCode}</span>
          </div>
        ) : "-"}
      </TableCell>
      <TableCell className="text-xs">
        <div className="flex gap-1 items-center">
          {dept.googleMapsLink && (
            <a
              href={dept.googleMapsLink}
              target="_blank"
              rel="noopener noreferrer"
              title="Google Maps"
              className="hover:opacity-80 transition-opacity"
            >
              <img src="/icons/maps.png" alt="Maps" className="w-6 h-6 object-contain" />
            </a>
          )}
          {dept.airbnbLink && (
            <a
              href={dept.airbnbLink}
              target="_blank"
              rel="noopener noreferrer"
              title="Airbnb"
              className="hover:opacity-80 transition-opacity"
            >
              <img src="/icons/airbnb.png" alt="Airbnb" className="w-6 h-6 object-contain" />
            </a>
          )}
          {dept.bookingLink && (
            <a
              href={dept.bookingLink}
              target="_blank"
              rel="noopener noreferrer"
              title="Booking.com"
              className="hover:opacity-80 transition-opacity"
            >
              <img src="/icons/booking.png" alt="Booking" className="w-6 h-6 object-contain" />
            </a>
          )}
          {!(dept.googleMapsLink || dept.airbnbLink || dept.bookingLink) && <span className="text-muted-foreground ml-2">-</span>}
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
        <div className="flex flex-col gap-1 items-start">
          <Badge variant={dept.isActive ? "default" : "secondary"}>
            {dept.isActive ? "Activo" : "Inactivo"}
          </Badge>
          <Badge variant={dept.showOnPublic ? "outline" : "secondary"} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 dark:border-slate-700">
            {dept.showOnPublic ? "Público" : "Oculto"}
          </Badge>
        </div>
      </TableCell>
      {!isVisualizer && (
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onToggleActive(dept)}
              disabled={togglingId === dept.id}
              title={dept.isActive ? "Desactivar" : "Activar"}
            >
              {dept.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onTogglePublic(dept)}
              disabled={togglingId === dept.id}
              title={dept.showOnPublic ? "Ocultar de web" : "Mostrar en web"}
            >
              {dept.showOnPublic ? <Globe className="h-4 w-4 text-blue-500" /> : <GlobeLock className="h-4 w-4 text-muted-foreground" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onEdit(dept)} title="Editar">
              <Pencil className="h-4 w-4" />
            </Button>
            {!dept.isActive && (
              <Button
                variant="ghost"
                size="icon"
                className="bg-red-500 hover:bg-red-600 text-black"
                onClick={() => onDelete(dept.id)}
                title="Eliminar (Archivar)"
              >
                <Trash className="h-4 w-4" />
              </Button>
            )}
          </div>
        </TableCell>
      )}
    </TableRow>
  );
};

interface SortableDepartmentCardProps {
  dept: Department;
  isVisualizer: boolean;
  canReorder?: boolean;
  isMounted: boolean;
  togglingId: string | null;
  onToggleActive: (dept: Department) => void;
  onTogglePublic: (dept: Department) => void;
  onEdit: (dept: Department) => void;
}

const SortableDepartmentCard: React.FC<SortableDepartmentCardProps> = ({
  dept,
  isVisualizer,
  canReorder = true,
  isMounted,
  togglingId,
  onToggleActive,
  onTogglePublic,
  onEdit,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: dept.id, disabled: !canReorder || !isMounted });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.35 : undefined,
  };

  const dragHandleProps = isMounted && canReorder ? { ...attributes, ...listeners } : {};

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900",
        !dept.isActive && "opacity-60 bg-muted/50",
        isDragging && "shadow-lg ring-2 ring-blue-500 border-dashed border-blue-400 dark:border-blue-500"
      )}
    >
      <CardContent className="p-3 space-y-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 min-w-0 flex-1">
              {canReorder && (
                <button
                  type="button"
                  {...dragHandleProps}
                  className="p-1 -ml-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-grab active:cursor-grabbing shrink-0"
                  title="Arrastrar para reordenar"
                >
                  <GripVertical className="h-4 w-4" />
                </button>
              )}
              {dept.color && (
                <div className="w-3 h-3 rounded-full shrink-0 mt-1.5" style={{ backgroundColor: dept.color }} />
              )}
              <div className="min-w-0 flex-1">
                <div className="font-bold text-base whitespace-normal break-words leading-tight text-slate-900 dark:text-slate-100">
                  {dept.name}
                  {dept.alias && <span className="text-muted-foreground font-normal ml-1">({dept.alias})</span>}
                </div>
                <div className="text-xs text-muted-foreground whitespace-normal break-words mt-0.5">{dept.address}</div>
              </div>
            </div>
            <div className="flex flex-col gap-1 items-end">
              <Badge variant={dept.isActive ? "default" : "secondary"}>
                {dept.isActive ? "Activo" : "Inactivo"}
              </Badge>
              <Badge variant={dept.showOnPublic ? "outline" : "secondary"} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 dark:border-slate-700">
                {dept.showOnPublic ? "Público" : "Oculto"}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-1 pl-3">
          <div className="flex gap-3">
            {dept.googleMapsLink && (
              <a href={dept.googleMapsLink} target="_blank" rel="noopener noreferrer">
                <img src="/icons/maps.png" alt="Maps" className="w-8 h-8 object-contain hover:scale-110 transition-transform" />
              </a>
            )}
            {dept.airbnbLink && (
              <a href={dept.airbnbLink} target="_blank" rel="noopener noreferrer">
                <img src="/icons/airbnb.png" alt="Airbnb" className="w-8 h-8 object-contain hover:scale-110 transition-transform" />
              </a>
            )}
            {dept.bookingLink && (
              <a href={dept.bookingLink} target="_blank" rel="noopener noreferrer">
                <img src="/icons/booking.png" alt="Booking" className="w-8 h-8 object-contain hover:scale-110 transition-transform" />
              </a>
            )}
          </div>

          {!isVisualizer && (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => onToggleActive(dept)} disabled={togglingId === dept.id}>
                {dept.isActive ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5 text-muted-foreground" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => onTogglePublic(dept)} disabled={togglingId === dept.id}>
                {dept.showOnPublic ? <Globe className="h-5 w-5 text-blue-500" /> : <GlobeLock className="h-5 w-5 text-muted-foreground" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => onEdit(dept)}>
                <Pencil className="h-5 w-5" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const DepartmentDragPreview: React.FC<{ dept: Department }> = ({ dept }) => (
  <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-900 border-2 border-blue-500 rounded-xl shadow-2xl scale-[1.02] cursor-grabbing min-w-[320px] max-w-[520px] select-none pointer-events-none">
    <GripVertical className="h-5 w-5 text-blue-500 shrink-0" />
    {dept.color && (
      <div className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: dept.color }} />
    )}
    <div className="min-w-0 flex-1">
      <div className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
        {dept.name}
        {dept.alias && <span className="text-muted-foreground font-normal ml-1">({dept.alias})</span>}
      </div>
      <div className="text-xs text-muted-foreground truncate">{dept.address || "Sin dirección"}</div>
    </div>
    <div className="flex items-center gap-1.5 shrink-0">
      <Badge variant={dept.isActive ? "default" : "secondary"}>
        {dept.isActive ? "Activo" : "Inactivo"}
      </Badge>
      <Badge variant={dept.showOnPublic ? "outline" : "secondary"} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700">
        {dept.showOnPublic ? "Público" : "Oculto"}
      </Badge>
    </div>
  </div>
);

interface DepartmentsClientProps {
  initialDepartments: Department[];
  defaultType?: "APARTMENT" | "PARKING";
  title?: string;
  role?: string;
  totalSuppliesCost: number;
  otherSessionsDepts?: { sessionName: string; departments: Department[] }[];
}

// Fix duplicated state declarations by replacing the component body
export const DepartmentsClient: React.FC<DepartmentsClientProps> = ({ initialDepartments = [], defaultType, title = "Departamentos", role, totalSuppliesCost, otherSessionsDepts }) => {
  const [departments, setDepartments] = useState<Department[]>(initialDepartments);
  const [otherSessions, setOtherSessions] = useState<{ sessionName: string; departments: Department[] }[]>(otherSessionsDepts || []);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const router = useRouter();

  const isAdmin = role === 'ADMIN';
  const isVisualizer = role === 'VISUALIZER';
  const canReorder = isAdmin;
  const entityName = defaultType === "PARKING" ? "Cochera" : "Departamento";

  useEffect(() => {
    setDepartments(initialDepartments);
  }, [initialDepartments]);

  useEffect(() => {
    setOtherSessions(otherSessionsDepts || []);
  }, [otherSessionsDepts]);

  const handleEdit = (dept: Department) => {
    setEditingDepartment(dept);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setEditingDepartment(null);
    setIsModalOpen(true);
  };

  const toggleActive = async (dept: Department) => {
    setTogglingId(dept.id);
    try {
      await fetch(`/api/departments/${dept.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !dept.isActive })
      });
      router.refresh();
    } catch (e) {
      alert("Error al cambiar estado");
    } finally {
      setTogglingId(null);
    }
  };

  const togglePublic = async (dept: Department) => {
    setTogglingId(dept.id);
    try {
      await fetch(`/api/departments/${dept.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showOnPublic: !dept.showOnPublic })
      });
      router.refresh();
    } catch (e) {
      alert("Error al cambiar estado público");
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
  const visibleData = departments.filter(d => !d.isArchived);

  // All departments for drag overlay lookup
  const allDepts = [
    ...visibleData,
    ...(otherSessions.flatMap((s) => s.departments) || []),
  ];
  const activeDept = allDepts.find((d) => d.id === activeId);

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = visibleData.findIndex((d) => d.id === active.id);
    const newIndex = visibleData.findIndex((d) => d.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(visibleData, oldIndex, newIndex);
    setDepartments(newOrder);

    try {
      const res = await fetch("/api/departments/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: newOrder.map((d) => d.id) }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      toast.success("Orden actualizado correctamente");
      router.refresh();
    } catch (e) {
      toast.error("Error al guardar el nuevo orden");
      setDepartments(initialDepartments);
    }
  };

  const handleOtherSessionDragEnd = async (sessionIndex: number, event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const currentSession = otherSessions[sessionIndex];
    if (!currentSession) return;

    const sessionVisible = currentSession.departments.filter(d => !d.isArchived);
    const oldIndex = sessionVisible.findIndex((d) => d.id === active.id);
    const newIndex = sessionVisible.findIndex((d) => d.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(sessionVisible, oldIndex, newIndex);
    setOtherSessions(prev => {
      const copy = [...prev];
      copy[sessionIndex] = {
        ...copy[sessionIndex],
        departments: newOrder,
      };
      return copy;
    });

    try {
      const res = await fetch("/api/departments/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: newOrder.map((d) => d.id) }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      toast.success(`Orden de ${currentSession.sessionName} actualizado`);
      router.refresh();
    } catch (e) {
      toast.error("Error al guardar el nuevo orden");
      setOtherSessions(otherSessionsDepts || []);
    }
  };

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
            <DepartmentsActions data={visibleData} role={role} defaultType={defaultType} />
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
            <DialogContent className="sm:max-w-[1000px] max-h-[92vh] overflow-y-auto">
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
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">Propiedades</h3>
          <p className="text-sm text-muted-foreground">Gestiona tus unidades de alquiler temporal. Los inactivos no aparecen en nuevas reservas.</p>
        </div>

        <DndContext
          id="departments-dnd"
          sensors={canReorder ? sensors : []}
          collisionDetection={closestCenter}
          onDragStart={(e) => setActiveId(String(e.active.id))}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          {/* Desktop Table */}
          <div className="hidden md:block rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800">
                  {canReorder && <TableHead className="w-10 px-2 text-center text-slate-700 dark:text-slate-200" title="Arrastrar para ordenar"></TableHead>}
                  <TableHead className="w-[300px] text-slate-700 dark:text-slate-200">Nombre</TableHead>
                  {defaultType !== 'PARKING' && <TableHead className="text-slate-700 dark:text-slate-200">Cap./Camas</TableHead>}
                  {defaultType !== 'PARKING' && <TableHead className="text-slate-700 dark:text-slate-200">Wifi</TableHead>}
                  <TableHead className="text-slate-700 dark:text-slate-200">Cód. Locker</TableHead>
                  <TableHead className="text-slate-700 dark:text-slate-200">Links</TableHead>
                  {defaultType === 'PARKING' ? (
                    <>
                      <TableHead className="text-slate-700 dark:text-slate-200">Precio</TableHead>
                      <TableHead className="text-slate-700 dark:text-slate-200">Limpieza</TableHead>
                    </>
                  ) : (
                    <TableHead className="text-slate-700 dark:text-slate-200">Precios (Base/Limp)</TableHead>
                  )}
                  {defaultType !== 'PARKING' && <TableHead className="text-slate-700 dark:text-slate-200">Insumos (Global)</TableHead>}
                  <TableHead className="text-slate-700 dark:text-slate-200">Estado</TableHead>
                  {!isVisualizer && <TableHead className="text-right text-slate-700 dark:text-slate-200">Acciones</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                <SortableContext items={visibleData.map(d => d.id)} strategy={verticalListSortingStrategy}>
                  {visibleData.map((dept) => (
                    <SortableDepartmentRow
                      key={dept.id}
                      dept={dept}
                      defaultType={defaultType}
                      totalSuppliesCost={totalSuppliesCost}
                      isVisualizer={isVisualizer}
                      canReorder={canReorder}
                      isMounted={isMounted}
                      togglingId={togglingId}
                      onToggleActive={toggleActive}
                      onTogglePublic={togglePublic}
                      onEdit={handleEdit}
                      onDelete={setDeleteId}
                    />
                  ))}
                  {visibleData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center h-24 text-muted-foreground">
                        No se encontraron {entityName.toLowerCase()}s.
                      </TableCell>
                    </TableRow>
                  )}
                </SortableContext>
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            <SortableContext items={visibleData.map(d => d.id)} strategy={verticalListSortingStrategy}>
              {visibleData.map((dept) => (
                <SortableDepartmentCard
                  key={dept.id}
                  dept={dept}
                  isVisualizer={isVisualizer}
                  canReorder={canReorder}
                  isMounted={isMounted}
                  togglingId={togglingId}
                  onToggleActive={toggleActive}
                  onTogglePublic={togglePublic}
                  onEdit={handleEdit}
                />
              ))}
              {visibleData.length === 0 && (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  No se encontraron {entityName.toLowerCase()}s.
                </div>
              )}
            </SortableContext>
          </div>

          <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
            {activeDept ? <DepartmentDragPreview dept={activeDept} /> : null}
          </DragOverlay>
        </DndContext>

        {/* Other Sessions Departments (SuperAdmin only) */}
        {otherSessions && otherSessions.length > 0 && (
          <div className="mt-12 space-y-8 border-t dark:border-slate-800 pt-8">
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Departamentos de otras Sesiones</h3>
              <p className="text-sm text-muted-foreground">Como SuperAdmin, puedes ver y editar los departamentos de las demás sesiones.</p>
            </div>
            
            {otherSessions.map((sessionData, sIndex) => {
              const sessionVisibleData = sessionData.departments.filter(d => !d.isArchived);
              return (
                <div key={sessionData.sessionName} className="space-y-4">
                  <h4 className="text-lg font-semibold border-b dark:border-slate-800 pb-2 text-indigo-700 dark:text-indigo-400">{sessionData.sessionName}</h4>

                  <DndContext
                    id={`other-dnd-${sIndex}`}
                    sensors={canReorder ? sensors : []}
                    collisionDetection={closestCenter}
                    onDragStart={(e) => setActiveId(String(e.active.id))}
                    onDragEnd={(e) => handleOtherSessionDragEnd(sIndex, e)}
                    onDragCancel={() => setActiveId(null)}
                  >
                    {/* Desktop Table */}
                    <div className="hidden md:block rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800">
                            {canReorder && <TableHead className="w-10 px-2 text-center text-slate-700 dark:text-slate-200" title="Arrastrar para ordenar"></TableHead>}
                            <TableHead className="w-[300px] text-slate-700 dark:text-slate-200">Nombre</TableHead>
                            {defaultType !== 'PARKING' && <TableHead className="text-slate-700 dark:text-slate-200">Cap./Camas</TableHead>}
                            {defaultType !== 'PARKING' && <TableHead className="text-slate-700 dark:text-slate-200">Wifi</TableHead>}
                            <TableHead className="text-slate-700 dark:text-slate-200">Cód. Locker</TableHead>
                            <TableHead className="text-slate-700 dark:text-slate-200">Links</TableHead>
                            {defaultType === 'PARKING' ? (
                              <>
                                <TableHead className="text-slate-700 dark:text-slate-200">Precio</TableHead>
                                <TableHead className="text-slate-700 dark:text-slate-200">Limpieza</TableHead>
                              </>
                            ) : (
                              <TableHead className="text-slate-700 dark:text-slate-200">Precios (Base/Limp)</TableHead>
                            )}
                            {defaultType !== 'PARKING' && (
                              <TableHead className="text-slate-700 dark:text-slate-200">Insumos (Global)</TableHead>
                            )}
                            <TableHead className="text-slate-700 dark:text-slate-200">Estado</TableHead>
                            {!isVisualizer && <TableHead className="text-right text-slate-700 dark:text-slate-200">Acciones</TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <SortableContext items={sessionVisibleData.map((d) => d.id)} strategy={verticalListSortingStrategy}>
                            {sessionVisibleData.map(dept => (
                              <SortableDepartmentRow
                                key={dept.id}
                                dept={dept}
                                defaultType={defaultType}
                                totalSuppliesCost={totalSuppliesCost}
                                isVisualizer={isVisualizer}
                                canReorder={canReorder}
                                isMounted={isMounted}
                                togglingId={togglingId}
                                onToggleActive={toggleActive}
                                onTogglePublic={togglePublic}
                                onEdit={handleEdit}
                                onDelete={setDeleteId}
                              />
                            ))}
                            {sessionVisibleData.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={12} className="text-center h-24 text-muted-foreground">
                                  No se encontraron {entityName.toLowerCase()}s en esta sesión.
                                </TableCell>
                              </TableRow>
                            )}
                          </SortableContext>
                        </TableBody>
                      </Table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-3">
                      <SortableContext items={sessionVisibleData.map((d) => d.id)} strategy={verticalListSortingStrategy}>
                        {sessionVisibleData.map(dept => (
                          <SortableDepartmentCard
                            key={dept.id}
                            dept={dept}
                            isVisualizer={isVisualizer}
                            canReorder={canReorder}
                            isMounted={isMounted}
                            togglingId={togglingId}
                            onToggleActive={toggleActive}
                            onTogglePublic={togglePublic}
                            onEdit={handleEdit}
                          />
                        ))}
                      </SortableContext>
                    </div>

                    <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
                      {activeDept ? <DepartmentDragPreview dept={activeDept} /> : null}
                    </DragOverlay>
                  </DndContext>
                </div>
              );
            })}
          </div>
        )}
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
