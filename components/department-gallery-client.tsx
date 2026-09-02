"use client";

import { useState, useCallback, useRef, useEffect } from "react";
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
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronLeft,
  X,
  Upload,
  Trash2,
  Pencil,
  Check,
  Copy,
  ZoomIn,
  Archive,
  GripVertical,
  FolderOpen,
  Images,
  ArrowLeft,
  ChevronRight,
  Loader2,
  CheckSquare2,
  Square,
  CheckSquare,
  Building,
  Tag,
  MapPin,
  Folder,
  Plus,
  Layers,
  Download,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

/* ─── Types ─────────────────────────────────────────────────────── */
interface DeptSummary {
  id: string;
  name: string;
  images: string;
  color: string;
}

interface GalleryImage {
  url: string;
  name: string; // display name (editable)
}

interface WebFolder {
  id: string;
  name: string;
  isCustom: boolean;
  icon?: string;
}

function parseImages(dept: DeptSummary): GalleryImage[] {
  try {
    let parsed: any = dept.images || "[]";
    while (typeof parsed === "string") {
      try {
        const next = JSON.parse(parsed);
        if (typeof next === "string" || Array.isArray(next)) {
          parsed = next;
        } else {
          break;
        }
      } catch {
        break;
      }
    }
    const arr: any[] = Array.isArray(parsed) ? parsed : typeof parsed === "string" ? [parsed] : [];
    return arr
      .filter(Boolean)
      .map((item, i) => {
        let cleanUrl = typeof item === "string" ? item : (item?.url ?? "");
        while (
          typeof cleanUrl === "string" &&
          ((cleanUrl.startsWith('"') && cleanUrl.endsWith('"')) ||
            (cleanUrl.startsWith("'") && cleanUrl.endsWith("'")))
        ) {
          cleanUrl = cleanUrl.slice(1, -1);
        }
        return { url: cleanUrl.trim(), name: `Foto ${i + 1}` };
      })
      .filter(img => img.url.length > 0);
  } catch {
    return [];
  }
}

/* ─── Lightbox ──────────────────────────────────────────────────── */
function Lightbox({ images, index, onClose }: { images: GalleryImage[]; index: number; onClose: () => void }) {
  const [current, setCurrent] = useState(index);
  return (
    <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-full bg-white/10 z-50 cursor-pointer">
        <X className="w-6 h-6" />
      </button>
      {images.length > 1 && (
        <>
          <button
            onClick={e => { e.stopPropagation(); setCurrent(p => (p - 1 + images.length) % images.length); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white p-3 rounded-full bg-white/10 hover:bg-white/20 z-50 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-7 h-7" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); setCurrent(p => (p + 1) % images.length); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white p-3 rounded-full bg-white/10 hover:bg-white/20 z-50 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-7 h-7" />
          </button>
        </>
      )}
      <img
        src={images[current].url}
        alt={images[current].name}
        className="max-w-full max-h-[88vh] object-contain rounded-xl select-none"
        onClick={e => e.stopPropagation()}
      />
      <p className="absolute bottom-16 left-1/2 -translate-x-1/2 text-white/70 text-sm font-medium">
        {images[current].name} — {current + 1} / {images.length}
      </p>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 overflow-x-auto max-w-lg px-4">
        {images.map((img, i) => (
          <button
            key={i}
            onClick={e => { e.stopPropagation(); setCurrent(i); }}
            className={`shrink-0 w-10 h-10 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
              i === current ? "border-white scale-105" : "border-transparent opacity-40 hover:opacity-80"
            }`}
          >
            <img src={img.url} alt="" className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Sortable Department Card ───────────────────────────────────── */
function DeptSortableCard({
  image, index, isFirst, isReadOnly,
  onLightbox, onDelete, onRename, onCopy,
  isSelectMode, isSelected, onToggleSelect,
}: {
  image: GalleryImage;
  index: number;
  isFirst: boolean;
  isReadOnly?: boolean;
  onLightbox: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
  onCopy: () => void;
  isSelectMode: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: image.url, disabled: isReadOnly });
  const [editing, setEditing] = useState(false);
  const [nameVal, setNameVal] = useState(image.name);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  const handleSaveRename = () => {
    onRename(nameVal.trim() || image.name);
    setEditing(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative rounded-2xl overflow-hidden border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-all flex flex-col ${
        isSelected ? "ring-2 ring-sky-500 border-sky-500" : ""
      }`}
    >
      {/* Principal Badge */}
      {isFirst && (
        <span className="absolute top-2.5 left-2.5 z-10 bg-sky-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-md">
          Principal
        </span>
      )}

      {/* Drag Handle (Hidden if read-only) */}
      {!isReadOnly && (
        <button
          {...attributes}
          {...listeners}
          className="absolute top-2.5 right-2.5 z-10 p-1.5 rounded-lg bg-black/50 text-white/80 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing backdrop-blur-xs"
          title="Arrastrar para reordenar"
        >
          <GripVertical className="w-4 h-4" />
        </button>
      )}

      {/* Selection Checkbox */}
      {isSelectMode && (
        <button
          onClick={e => { e.stopPropagation(); onToggleSelect(); }}
          className="absolute top-2.5 left-2.5 z-20 p-1 rounded-md bg-black/60 text-white backdrop-blur-xs cursor-pointer"
        >
          {isSelected ? <CheckSquare className="w-5 h-5 text-sky-400" /> : <Square className="w-5 h-5" />}
        </button>
      )}

      {/* Image Preview */}
      <div
        className="relative aspect-4/3 overflow-hidden bg-slate-100 dark:bg-slate-800 cursor-pointer"
        onClick={() => (isSelectMode ? onToggleSelect() : onLightbox())}
      >
        <img
          src={image.url}
          alt={image.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 select-none"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <ZoomIn className="w-7 h-7 text-white drop-shadow" />
        </div>
      </div>

      {/* Footer / Info */}
      <div className="p-3 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
        {editing && !isReadOnly ? (
          <div className="flex items-center gap-1 flex-1">
            <Input
              value={nameVal}
              onChange={e => setNameVal(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleSaveRename(); if (e.key === "Escape") setEditing(false); }}
              autoFocus
              className="h-7 text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 dark:text-slate-100"
            />
            <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600" onClick={handleSaveRename}>
              <Check className="w-3.5 h-3.5" />
            </Button>
          </div>
        ) : (
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate flex-1" title={image.name}>
            {image.name}
          </span>
        )}

        {/* Action icons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onCopy}
            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
            title="Copiar URL"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          {!isReadOnly && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              title="Renombrar"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          {!isReadOnly && (
            <button
              onClick={onDelete}
              className="p-1 rounded text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
              title="Eliminar foto"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── General Media Item Card (For Web Resource Folders) ────────── */
function WebMediaCard({
  image,
  onLightbox,
  onDelete,
  onCopy,
  isSelectMode,
  isSelected,
  onToggleSelect,
}: {
  image: GalleryImage;
  onLightbox: () => void;
  onDelete: () => void;
  onCopy: () => void;
  isSelectMode: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
}) {
  return (
    <div
      className={`group relative rounded-2xl overflow-hidden border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-all flex flex-col ${
        isSelected ? "ring-2 ring-sky-500 border-sky-500" : ""
      }`}
    >
      {/* Selection Checkbox */}
      {isSelectMode && (
        <button
          onClick={e => { e.stopPropagation(); onToggleSelect(); }}
          className="absolute top-2.5 left-2.5 z-20 p-1 rounded-md bg-black/60 text-white backdrop-blur-xs cursor-pointer"
        >
          {isSelected ? <CheckSquare className="w-5 h-5 text-sky-400" /> : <Square className="w-5 h-5" />}
        </button>
      )}

      {/* Image Preview */}
      <div
        className="relative aspect-4/3 overflow-hidden bg-slate-100 dark:bg-slate-800 cursor-pointer"
        onClick={() => (isSelectMode ? onToggleSelect() : onLightbox())}
      >
        <img
          src={image.url}
          alt={image.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 select-none"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <ZoomIn className="w-7 h-7 text-white drop-shadow" />
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate flex-1" title={image.name}>
          {image.name}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onCopy}
            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
            title="Copiar URL"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 rounded text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
            title="Eliminar imagen"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Gallery Component ─────────────────────────────────────── */
export function DepartmentGalleryClient({
  initialDepartments,
  isSuperAdmin = false,
  role = "ADMIN",
}: {
  initialDepartments: DeptSummary[];
  isSuperAdmin?: boolean;
  role?: string;
}) {
  const router = useRouter();
  const isReadOnly = role === "VISUALIZER";

  // Section: 'dept' (department) or 'web' (site web media folder)
  const [activeSection, setActiveSection] = useState<"dept" | "web">("dept");

  // Department State
  const [departments, setDepartments] = useState<DeptSummary[]>(initialDepartments);
  const [selectedDeptId, setSelectedDeptId] = useState<string>(
    initialDepartments[0]?.id || ""
  );

  // Web Folders State (SuperAdmin only)
  const [webFolders, setWebFolders] = useState<WebFolder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>("slides");
  const [webImages, setWebImages] = useState<GalleryImage[]>([]);
  const [loadingWebImages, setLoadingWebImages] = useState(false);

  // New Folder Modal
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);

  // Uploading / Exporting State
  const [uploading, setUploading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Lightbox
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Multi-select
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedUrls, setSelectedUrls] = useState<string[]>([]);

  // DND Sensors (for departments)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Load Web Folders if SuperAdmin
  const loadWebFolders = useCallback(async () => {
    if (!isSuperAdmin) return;
    try {
      const res = await fetch("/api/media/folders");
      if (res.ok) {
        const data = await res.json();
        setWebFolders(data.folders || []);
      }
    } catch {}
  }, [isSuperAdmin]);

  useEffect(() => {
    loadWebFolders();
  }, [loadWebFolders]);

  // Load files for selected web folder
  const loadWebImages = useCallback(async (folderId: string) => {
    setLoadingWebImages(true);
    try {
      const res = await fetch(`/api/media/files?folder=${encodeURIComponent(folderId)}`);
      if (res.ok) {
        const data = await res.json();
        setWebImages(
          (data.files || []).map((f: any) => ({
            url: f.url,
            name: f.name || f.fileName,
          }))
        );
      }
    } catch {
      toast.error("Error al cargar imágenes de la carpeta");
    } finally {
      setLoadingWebImages(false);
    }
  }, []);

  useEffect(() => {
    if (activeSection === "web" && isSuperAdmin) {
      loadWebImages(selectedFolderId);
    }
  }, [activeSection, selectedFolderId, isSuperAdmin, loadWebImages]);

  // Active department object and photos
  const selectedDept = departments.find(d => d.id === selectedDeptId);
  const deptImages = selectedDept ? parseImages(selectedDept) : [];

  // Active images (Dept or Web folder)
  const currentImages = activeSection === "dept" ? deptImages : webImages;

  // ─── Department Image Handlers ────────────────────────────────────
  const saveDeptImages = async (deptId: string, newImages: GalleryImage[]) => {
    const urls = newImages.map(img => img.url);
    try {
      const res = await fetch(`/api/departments/${deptId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: JSON.stringify(urls) }),
      });
      if (res.ok) {
        setDepartments(prev =>
          prev.map(d => (d.id === deptId ? { ...d, images: JSON.stringify(urls) } : d))
        );
      } else {
        toast.error("Error al guardar cambios");
      }
    } catch {
      toast.error("Error al guardar cambios");
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (isReadOnly || activeSection !== "dept") return;
    const { active, over } = event;
    if (!over || active.id === over.id || !selectedDept) return;

    const oldIndex = deptImages.findIndex(img => img.url === active.id);
    const newIndex = deptImages.findIndex(img => img.url === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = arrayMove(deptImages, oldIndex, newIndex);
      saveDeptImages(selectedDept.id, reordered);
      toast.success("Orden actualizado");
    }
  };

  // ─── Upload Handler ───────────────────────────────────────────────
  const handleUploadFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }

    if (activeSection === "dept") {
      formData.append("department", selectedDept?.name || selectedDeptId);
    } else {
      formData.append("folder", selectedFolderId);
    }

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const newUrls: string[] = data.urls || [];
        toast.success(`${newUrls.length} foto(s) subida(s) correctamente`);

        if (activeSection === "dept" && selectedDept) {
          const updated = [...deptImages, ...newUrls.map((u, i) => ({ url: u, name: `Foto ${deptImages.length + i + 1}` }))];
          await saveDeptImages(selectedDept.id, updated);
        } else if (activeSection === "web") {
          loadWebImages(selectedFolderId);
        }
      } else {
        toast.error("Error al subir archivos");
      }
    } catch {
      toast.error("Error al subir archivos");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  // ─── Delete Handlers ──────────────────────────────────────────────
  const handleDeleteImage = async (url: string) => {
    if (isReadOnly) return;
    if (activeSection === "dept" && selectedDept) {
      const updated = deptImages.filter(img => img.url !== url);
      await saveDeptImages(selectedDept.id, updated);
      toast.success("Foto eliminada");
    } else if (activeSection === "web") {
      try {
        const res = await fetch("/api/media/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        if (res.ok) {
          toast.success("Imagen eliminada");
          setWebImages(prev => prev.filter(img => img.url !== url));
        }
      } catch {
        toast.error("Error al eliminar imagen");
      }
    }
  };

  const handleBatchDelete = async () => {
    if (isReadOnly || selectedUrls.length === 0) return;
    if (!confirm(`¿Eliminar ${selectedUrls.length} imagen(es) seleccionada(s)?`)) return;

    if (activeSection === "dept" && selectedDept) {
      const updated = deptImages.filter(img => !selectedUrls.includes(img.url));
      await saveDeptImages(selectedDept.id, updated);
      setSelectedUrls([]);
      setIsSelectMode(false);
      toast.success(`${selectedUrls.length} fotos eliminadas`);
    } else if (activeSection === "web") {
      try {
        const res = await fetch("/api/media/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ urls: selectedUrls }),
        });
        if (res.ok) {
          toast.success("Imágenes eliminadas");
          setWebImages(prev => prev.filter(img => !selectedUrls.includes(img.url)));
          setSelectedUrls([]);
          setIsSelectMode(false);
        }
      } catch {
        toast.error("Error al eliminar imágenes");
      }
    }
  };

  // ─── Custom Folder Creation ───────────────────────────────────────
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    try {
      const res = await fetch("/api/media/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newFolderName.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success("Carpeta creada correctamente");
        setIsNewFolderOpen(false);
        setNewFolderName("");
        await loadWebFolders();
        if (data.folder?.id) {
          setSelectedFolderId(data.folder.id);
          setActiveSection("web");
        }
      } else {
        const err = await res.json();
        toast.error(err.error || "Error al crear carpeta");
      }
    } catch {
      toast.error("Error al crear carpeta");
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm(`¿Eliminar la carpeta "${folderId}" y todos sus archivos?`)) return;
    try {
      const res = await fetch("/api/media/folders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId }),
      });
      if (res.ok) {
        toast.success("Carpeta eliminada");
        await loadWebFolders();
        setSelectedFolderId("slides");
      } else {
        toast.error("Error al eliminar carpeta");
      }
    } catch {
      toast.error("Error al eliminar carpeta");
    }
  };

  // Export All Folder Selection Modal
  const [isExportAllOpen, setIsExportAllOpen] = useState(false);
  const [selectedExportCategories, setSelectedExportCategories] = useState<string[]>([
    "departamentos",
    "slides",
    "logos",
    "guia",
    "avatars",
    "general",
  ]);

  // ─── ZIP Export Handlers ──────────────────────────────────────────
  const handleExportZip = async () => {
    setExporting(true);
    try {
      // 1. If in select mode and specific images are selected, export those
      if (isSelectMode && selectedUrls.length > 0) {
        const res = await fetch("/api/media/export-zip", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            urls: selectedUrls,
            filename: "Fotos_Seleccionadas.zip",
          }),
        });

        if (!res.ok) throw new Error("Error en descarga");
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "Fotos_Seleccionadas.zip";
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        toast.success("Descarga de fotos seleccionadas iniciada");
        return;
      }

      // 2. Otherwise export current folder or current department
      let endpoint = "/api/media/export-zip";
      if (activeSection === "dept") {
        endpoint += `?departmentId=${selectedDeptId}`;
      } else if (activeSection === "web") {
        endpoint += `?category=${encodeURIComponent(selectedFolderId)}`;
      }

      const res = await fetch(endpoint);
      if (!res.ok) throw new Error("Error en descarga");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        activeSection === "dept"
          ? `${selectedDept?.name || "depto"}_fotos.zip`
          : `${selectedFolderId}_imagenes.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Descarga iniciada");
    } catch {
      toast.error("Error al exportar archivo ZIP");
    } finally {
      setExporting(false);
    }
  };

  const handleExportSelectedFolders = async () => {
    if (selectedExportCategories.length === 0) {
      toast.error("Seleccioná al menos una carpeta para exportar");
      return;
    }

    setExporting(true);
    try {
      const res = await fetch("/api/media/export-zip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categories: selectedExportCategories,
          filename: "Multimedia_Personalizado.zip",
        }),
      });

      if (!res.ok) throw new Error("Error en descarga");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Multimedia_Personalizado.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Descarga personalizada iniciada");
      setIsExportAllOpen(false);
    } catch {
      toast.error("Error al exportar carpetas seleccionadas");
    } finally {
      setExporting(false);
    }
  };

  // Copy URL
  const handleCopyUrl = (url: string) => {
    const full = url.startsWith("http") ? url : `${window.location.origin}${url}`;
    navigator.clipboard.writeText(full);
    toast.success("URL copiada al portapapeles");
  };

  const toggleSelect = (url: string) => {
    setSelectedUrls(prev =>
      prev.includes(url) ? prev.filter(u => u !== url) : [...prev, url]
    );
  };

  const selectAll = () => {
    if (selectedUrls.length === currentImages.length) {
      setSelectedUrls([]);
    } else {
      setSelectedUrls(currentImages.map(img => img.url));
    }
  };

  const toggleExportCategory = (cat: string) => {
    setSelectedExportCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const allAvailableExportCategories = [
    { id: "departamentos", name: "Departamentos (Todos)" },
    ...webFolders.map(f => ({ id: f.id, name: f.name })),
  ];

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] bg-slate-50 dark:bg-slate-950 transition-colors duration-150 -m-4 lg:-m-6">
      {/* Lightbox Modal */}
      {lightboxIndex !== null && (
        <Lightbox
          images={currentImages}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      {/* Export All Selection Modal */}
      <Dialog open={isExportAllOpen} onOpenChange={setIsExportAllOpen}>
        <DialogContent className="sm:max-w-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Download className="w-5 h-5 text-indigo-500" />
              Seleccionar Carpetas para Exportar a ZIP
            </DialogTitle>
          </DialogHeader>

          <div className="py-3 space-y-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Elegí las carpetas que querés incluir en el archivo ZIP comprimido:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto p-1">
              {allAvailableExportCategories.map(cat => {
                const checked = selectedExportCategories.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleExportCategory(cat.id)}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer ${
                      checked
                        ? "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 shadow-xs"
                        : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <div className={`p-1 rounded-md ${checked ? "bg-indigo-600 text-white" : "border border-slate-300 dark:border-slate-600"}`}>
                      {checked ? <Check className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5" />}
                    </div>
                    <span className="truncate">{cat.name}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-between items-center pt-2 text-xs">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedExportCategories(allAvailableExportCategories.map(c => c.id))}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
                >
                  Seleccionar Todo
                </button>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <button
                  type="button"
                  onClick={() => setSelectedExportCategories([])}
                  className="text-slate-500 hover:underline cursor-pointer"
                >
                  Deseleccionar Todo
                </button>
              </div>
              <span className="text-slate-400 font-medium">
                {selectedExportCategories.length} seleccionada(s)
              </span>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsExportAllOpen(false)} className="cursor-pointer">
              Cancelar
            </Button>
            <Button
              onClick={handleExportSelectedFolders}
              disabled={exporting || selectedExportCategories.length === 0}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold cursor-pointer"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Download className="w-4 h-4 mr-1.5" />}
              Descargar ZIP ({selectedExportCategories.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Folder Modal */}
      <Dialog open={isNewFolderOpen} onOpenChange={setIsNewFolderOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Folder className="w-5 h-5 text-sky-500" />
              Crear Nueva Carpeta de Recursos
            </DialogTitle>
          </DialogHeader>
          <div className="py-3">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1.5">
              Nombre de la Carpeta
            </label>
            <Input
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              placeholder="Ej: Banners, Eventos, Testimonios..."
              onKeyDown={e => e.key === "Enter" && handleCreateFolder()}
              autoFocus
              className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewFolderOpen(false)} className="cursor-pointer">
              Cancelar
            </Button>
            <Button
              onClick={handleCreateFolder}
              disabled={creatingFolder || !newFolderName.trim()}
              className="bg-sky-600 hover:bg-sky-500 text-white font-semibold cursor-pointer"
            >
              {creatingFolder ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Plus className="w-4 h-4 mr-1.5" />}
              Crear Carpeta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex flex-1 flex-col md:flex-row overflow-hidden">
        {/* ── Left Sidebar Navigation ── */}
        <aside className="w-full md:w-72 bg-white dark:bg-slate-900 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0">
          {/* Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Images className="w-5 h-5 text-sky-600 dark:text-sky-400" />
              <h2 className="font-bold text-slate-900 dark:text-slate-100 text-base">Galería Multimedia</h2>
            </div>
            {isReadOnly && (
              <span className="text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 px-2 py-0.5 rounded-md">
                Lectura
              </span>
            )}
          </div>

          {/* Nav items */}
          <div className="p-3 space-y-6 flex-1 overflow-y-auto">
            {/* Section 1: Departamentos */}
            <div>
              <div className="flex items-center justify-between px-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5" /> Departamentos
                </span>
                <span className="text-xs text-slate-400 font-medium">{departments.length}</span>
              </div>
              <div className="space-y-1">
                {departments.map(dept => {
                  const imgs = parseImages(dept);
                  const isSelected = activeSection === "dept" && selectedDeptId === dept.id;
                  return (
                    <button
                      key={dept.id}
                      onClick={() => {
                        setActiveSection("dept");
                        setSelectedDeptId(dept.id);
                        setIsSelectMode(false);
                        setSelectedUrls([]);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                        isSelected
                          ? "bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-bold border border-sky-200 dark:border-sky-800 shadow-xs"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: dept.color || "#0ea5e9" }}
                        />
                        <span className="truncate">{dept.name}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-normal shrink-0 ml-2">
                        {imgs.length} fotos
                      </span>
                    </button>
                  );
                })}
                {departments.length === 0 && (
                  <p className="text-xs text-slate-400 italic px-3 py-2">No hay departamentos cargados</p>
                )}
              </div>
            </div>

            {/* Section 2: Recursos de la Página Web (SuperAdmin Only) */}
            {isSuperAdmin && (
              <div>
                <div className="flex items-center justify-between px-2 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" /> Recursos Web
                  </span>
                  <button
                    onClick={() => setIsNewFolderOpen(true)}
                    className="p-1 rounded text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/60 transition-colors cursor-pointer"
                    title="Crear nueva carpeta"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1">
                  {webFolders.map(folder => {
                    const isSelected = activeSection === "web" && selectedFolderId === folder.id;
                    return (
                      <div
                        key={folder.id}
                        className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? "bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-bold border border-sky-200 dark:border-sky-800 shadow-xs"
                            : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                        }`}
                        onClick={() => {
                          setActiveSection("web");
                          setSelectedFolderId(folder.id);
                          setIsSelectMode(false);
                          setSelectedUrls([]);
                        }}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Folder className="w-4 h-4 text-sky-500 shrink-0" />
                          <span className="truncate">{folder.name}</span>
                        </div>

                        {/* Delete Custom Folder Button */}
                        {folder.isCustom && (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              handleDeleteFolder(folder.id);
                            }}
                            className="p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            title="Eliminar carpeta"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Quick Back to Dashboard */}
          <div className="p-3 border-t border-slate-200 dark:border-slate-800">
            <Link
              href="/dashboard/departments"
              className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Volver a Departamentos
            </Link>
          </div>
        </aside>

        {/* ── Main Gallery Content ── */}
        <main className="flex-1 flex flex-col min-w-0 bg-slate-50/50 dark:bg-slate-950 overflow-y-auto">
          {/* Top Action Toolbar */}
          <div className="sticky top-0 z-30 p-4 sm:p-5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {activeSection === "dept"
                    ? selectedDept?.name || "Departamento"
                    : webFolders.find(f => f.id === selectedFolderId)?.name || "Recursos Web"}
                </h1>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {currentImages.length} {currentImages.length === 1 ? "imagen" : "imágenes"}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {activeSection === "dept"
                  ? isReadOnly
                    ? "Vista de fotos del departamento."
                    : "Arrastrá para reordenar. La primera foto es la portada principal."
                  : "Biblioteca de imágenes del sitio web con compresión automática."}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Select Mode Toggle */}
              {currentImages.length > 0 && (
                <Button
                  variant={isSelectMode ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => {
                    setIsSelectMode(!isSelectMode);
                    setSelectedUrls([]);
                  }}
                  className="text-xs cursor-pointer font-semibold"
                >
                  <CheckSquare2 className="w-3.5 h-3.5 mr-1.5" />
                  {isSelectMode ? "Cancelar Selección" : "Seleccionar"}
                </Button>
              )}

              {/* Select All (when in select mode) */}
              {isSelectMode && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAll}
                  className="text-xs cursor-pointer"
                >
                  {selectedUrls.length === currentImages.length ? "Deseleccionar Todo" : "Seleccionar Todo"}
                </Button>
              )}

              {/* Batch Delete */}
              {isSelectMode && selectedUrls.length > 0 && !isReadOnly && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBatchDelete}
                  className="text-xs cursor-pointer font-semibold"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Eliminar ({selectedUrls.length})
                </Button>
              )}

              {/* Upload Button */}
              {!isReadOnly && (
                <label className="inline-flex items-center gap-1.5 px-3 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-xs">
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  {uploading ? "Subiendo..." : "Subir Fotos"}
                  <input
                    type="file"
                    multiple
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={handleUploadFiles}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              )}

              {/* Export Contextual or Selected ZIP */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportZip}
                disabled={exporting || (isSelectMode ? selectedUrls.length === 0 : currentImages.length === 0)}
                className="text-xs cursor-pointer font-semibold"
              >
                {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Archive className="w-3.5 h-3.5 mr-1.5 text-amber-500" />}
                {isSelectMode && selectedUrls.length > 0 ? `Exportar (${selectedUrls.length})` : "Exportar ZIP"}
              </Button>

              {/* Export ALL Multimedia (SuperAdmin only) */}
              {isSuperAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsExportAllOpen(true)}
                  disabled={exporting}
                  className="text-xs cursor-pointer font-semibold border-indigo-200 dark:border-indigo-900 text-indigo-700 dark:text-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/40"
                  title="Seleccionar carpetas a exportar"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5 text-indigo-500" />
                  Exportar Todo...
                </Button>
              )}
            </div>
          </div>

          {/* Grid Area */}
          <div className="p-4 sm:p-6 flex-1">
            {loadingWebImages ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mb-2 text-sky-500" />
                <p className="text-sm font-medium">Cargando imágenes de la carpeta...</p>
              </div>
            ) : currentImages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-2xl border-slate-200 dark:border-slate-800 text-center p-6">
                <Images className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
                <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">No hay imágenes cargadas</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  {isReadOnly
                    ? "Este departamento no tiene fotos disponibles."
                    : 'Hacé clic en "Subir Fotos" para agregar imágenes en formato JPG, PNG, WEBP o SVG.'}
                </p>
              </div>
            ) : activeSection === "dept" ? (
              /* Dnd Context for Department Sorting */
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={deptImages.map(img => img.url)}
                  strategy={rectSortingStrategy}
                >
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {deptImages.map((img, i) => (
                      <DeptSortableCard
                        key={img.url}
                        image={img}
                        index={i}
                        isFirst={i === 0}
                        isReadOnly={isReadOnly}
                        onLightbox={() => setLightboxIndex(i)}
                        onDelete={() => handleDeleteImage(img.url)}
                        onRename={newName => {
                          if (selectedDept) {
                            const updated = deptImages.map((it, idx) =>
                              idx === i ? { ...it, name: newName } : it
                            );
                            saveDeptImages(selectedDept.id, updated);
                          }
                        }}
                        onCopy={() => handleCopyUrl(img.url)}
                        isSelectMode={isSelectMode}
                        isSelected={selectedUrls.includes(img.url)}
                        onToggleSelect={() => toggleSelect(img.url)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              /* Web Resource Grid (Static Sorting) */
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {webImages.map((img, i) => (
                  <WebMediaCard
                    key={img.url}
                    image={img}
                    onLightbox={() => setLightboxIndex(i)}
                    onDelete={() => handleDeleteImage(img.url)}
                    onCopy={() => handleCopyUrl(img.url)}
                    isSelectMode={isSelectMode}
                    isSelected={selectedUrls.includes(img.url)}
                    onToggleSelect={() => toggleSelect(img.url)}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
