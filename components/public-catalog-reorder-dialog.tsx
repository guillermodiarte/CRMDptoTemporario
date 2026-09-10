"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Department } from "@prisma/client";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Globe,
  ArrowUp,
  ArrowDown,
  Building2,
  Check,
  RotateCcw,
  Sparkles,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export type PublicDepartmentItem = Department & {
  session?: { id?: string; name?: string | null } | null;
};

interface PublicCatalogReorderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departments?: PublicDepartmentItem[];
  onOrderSaved?: (newOrderedDepartments: PublicDepartmentItem[]) => void;
  highlightDepartmentId?: string | null;
}

interface SortableCatalogItemProps {
  dept: PublicDepartmentItem;
  index: number;
  total: number;
  isHighlighted?: boolean;
  onMoveTo: (fromIndex: number, toIndex: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
}

function SortableCatalogItem({
  dept,
  index,
  total,
  isHighlighted,
  onMoveTo,
  onMoveUp,
  onMoveDown,
}: SortableCatalogItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: dept.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Parse first image
  const firstImage = useMemo(() => {
    if (!dept.images) return null;
    try {
      let parsed: any = dept.images;
      while (typeof parsed === "string") {
        parsed = JSON.parse(parsed);
      }
      if (Array.isArray(parsed) && parsed.length > 0) {
        const item = parsed[0];
        return typeof item === "string" ? item : item?.url || null;
      }
    } catch {
      return null;
    }
    return null;
  }, [dept.images]);

  // Rank badge colors
  const rankBadgeStyle =
    index === 0
      ? "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-700/60 shadow-xs"
      : index === 1
      ? "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
      : index === 2
      ? "bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800"
      : "bg-muted text-muted-foreground border-border";

  const sessionName = dept.session?.name || "Sin sesión asignada";
  const isGuillermo = sessionName.toLowerCase().includes("guillermo");
  const isGustavo = sessionName.toLowerCase().includes("gustavo");

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border transition-all bg-card/90 backdrop-blur-xs",
        isDragging
          ? "opacity-60 bg-blue-50/70 dark:bg-blue-950/30 border-blue-400 dark:border-blue-500 shadow-lg scale-[1.01] z-30"
          : "hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs",
        isHighlighted && !isDragging && "ring-2 ring-indigo-500/80 border-indigo-400 bg-indigo-50/20 dark:bg-indigo-950/20"
      )}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Drag Handle */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-muted cursor-grab active:cursor-grabbing shrink-0 transition-colors"
          title="Arrastrar para cambiar posición"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Position Badge */}
        <div
          className={cn(
            "flex items-center justify-center font-bold text-xs px-2.5 py-1 rounded-lg border tabular-nums shrink-0 select-none",
            rankBadgeStyle
          )}
        >
          #{index + 1}
        </div>

        {/* Thumbnail Image */}
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 border shrink-0 flex items-center justify-center relative">
          {firstImage ? (
            <img
              src={firstImage}
              alt={dept.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <Building2 className="w-5 h-5 text-muted-foreground/60" />
          )}
          {dept.color && (
            <div
              className="absolute bottom-0 left-0 right-0 h-1"
              style={{ backgroundColor: dept.color }}
            />
          )}
        </div>

        {/* Department Info */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold text-sm text-foreground truncate">
              {dept.name}
            </span>
            {dept.alias && (
              <span className="text-xs text-muted-foreground font-medium">
                ({dept.alias})
              </span>
            )}
            {/* Session Tag */}
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] px-1.5 py-0 font-medium",
                isGuillermo
                  ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800"
                  : isGustavo
                  ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800"
              )}
            >
              {sessionName}
            </Badge>
          </div>

          <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
            {dept.address && (
              <span className="truncate max-w-[200px] sm:max-w-[280px]">
                {dept.address}
              </span>
            )}
            <span>
              {dept.maxPeople} personas · {dept.bedCount} camas
            </span>
            {dept.basePrice > 0 && (
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                ${Number(dept.basePrice).toLocaleString("es-AR")}/noche
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Position Control Buttons and Selector */}
      <div className="flex items-center justify-end gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0">
        {/* Direct Numeric Position Dropdown */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Pos:
          </span>
          <select
            value={index + 1}
            onChange={(e) => onMoveTo(index, Number(e.target.value) - 1)}
            className="h-8 text-xs font-semibold rounded-md border border-input bg-background px-2 py-1 focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer hover:bg-muted/50"
            title="Cambiar posición directamente"
          >
            {Array.from({ length: total }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1}° {i === 0 ? "(1ro en la web)" : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Up / Down Buttons */}
        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-600 dark:text-slate-300 hover:text-foreground hover:bg-muted"
            disabled={index === 0}
            onClick={() => onMoveUp(index)}
            title="Mover una posición arriba"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-600 dark:text-slate-300 hover:text-foreground hover:bg-muted"
            disabled={index === total - 1}
            onClick={() => onMoveDown(index)}
            title="Mover una posición abajo"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function PublicCatalogReorderDialog({
  open,
  onOpenChange,
  departments: initialDepartmentsProp,
  onOrderSaved,
  highlightDepartmentId,
}: PublicCatalogReorderDialogProps) {
  const router = useRouter();
  const [items, setItems] = useState<PublicDepartmentItem[]>([]);
  const [originalItems, setOriginalItems] = useState<PublicDepartmentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

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

  // Sync or fetch items when dialog opens
  useEffect(() => {
    if (!open) return;

    if (initialDepartmentsProp && initialDepartmentsProp.length > 0) {
      setItems(initialDepartmentsProp);
      setOriginalItems(initialDepartmentsProp);
    } else {
      // Fetch fresh list from API
      setFetching(true);
      fetch("/api/departments/reorder")
        .then((res) => {
          if (!res.ok) throw new Error("Error al obtener departamentos");
          return res.json();
        })
        .then((data: PublicDepartmentItem[]) => {
          setItems(data);
          setOriginalItems(data);
        })
        .catch(() => {
          toast.error("No se pudieron cargar los departamentos públicos.");
        })
        .finally(() => setFetching(false));
    }
  }, [open, initialDepartmentsProp]);

  const hasChanges = useMemo(() => {
    if (items.length !== originalItems.length) return true;
    for (let i = 0; i < items.length; i++) {
      if (items[i].id !== originalItems[i]?.id) return true;
    }
    return false;
  }, [items, originalItems]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((d) => d.id === active.id);
    const newIndex = items.findIndex((d) => d.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    setItems((prev) => arrayMove(prev, oldIndex, newIndex));
  };

  const handleMoveTo = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || toIndex < 0 || toIndex >= items.length) return;
    setItems((prev) => arrayMove(prev, fromIndex, toIndex));
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    setItems((prev) => arrayMove(prev, index, index - 1));
  };

  const handleMoveDown = (index: number) => {
    if (index >= items.length - 1) return;
    setItems((prev) => arrayMove(prev, index, index + 1));
  };

  const handleReset = () => {
    setItems([...originalItems]);
    toast.info("Cambios deshechos");
  };

  const handleSave = async () => {
    if (items.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/departments/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: items.map((d) => d.id) }),
      });

      if (!res.ok) {
        throw new Error("Error en el servidor al guardar el orden");
      }

      toast.success("¡Orden del catálogo público guardado exitosamente!");
      setOriginalItems([...items]);
      if (onOrderSaved) {
        onOrderSaved(items);
      }
      router.refresh();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Error al guardar el nuevo orden");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[750px] max-h-[90vh] flex flex-col p-0 overflow-hidden bg-background">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-xl font-bold">
                  Orden en la Web Pública
                </DialogTitle>
                <Badge
                  variant="secondary"
                  className="bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 text-[10px] font-semibold tracking-wide"
                >
                  SUPERADMIN
                </Badge>
              </div>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Definí la posición exacta (#1, #2, #3...) en la que los visitantes ven los departamentos en la página principal y el catálogo.
              </DialogDescription>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
              <span>
                Incluye todos los departamentos activos de <strong>todas las sesiones</strong>.
              </span>
            </div>
            <div className="font-semibold text-foreground">
              {items.length} {items.length === 1 ? "departamento" : "departamentos"}
            </div>
          </div>
        </DialogHeader>

        {/* Body / List */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {fetching ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
              <p className="text-sm">Cargando departamentos...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground text-sm">
              No hay departamentos públicos activos para ordenar.
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={items.map((d) => d.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {items.map((dept, index) => (
                    <SortableCatalogItem
                      key={dept.id}
                      dept={dept}
                      index={index}
                      total={items.length}
                      isHighlighted={dept.id === highlightDepartmentId}
                      onMoveTo={handleMoveTo}
                      onMoveUp={handleMoveUp}
                      onMoveDown={handleMoveDown}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-3 border-t bg-muted/20 flex flex-row items-center justify-between gap-2">
          <div>
            {hasChanges && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleReset}
                disabled={loading}
                className="text-xs text-muted-foreground hover:text-foreground gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Deshacer cambios
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={loading || !hasChanges}
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Guardar Orden
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
