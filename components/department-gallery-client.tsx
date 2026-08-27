"use client";

import { useState, useCallback, useRef } from "react";
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
  CheckSquare,
  Square,
  CheckCheck,
} from "lucide-react";
import Link from "next/link";
import JSZip from "jszip";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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

function parseImages(dept: DeptSummary): GalleryImage[] {
  try {
    let parsed = JSON.parse(dept.images || "[]");
    if (typeof parsed === "string" && parsed.startsWith("[")) {
      try { parsed = JSON.parse(parsed); } catch (e) {}
    }
    const arr: string[] = Array.isArray(parsed) ? parsed : typeof parsed === "string" ? [parsed] : [];
    return arr.map((url, i) => ({ url, name: `Foto ${i + 1}` }));
  } catch {
    return [];
  }
}

/* ─── Lightbox ──────────────────────────────────────────────────── */
function Lightbox({ images, index, onClose }: { images: GalleryImage[]; index: number; onClose: () => void }) {
  const [current, setCurrent] = useState(index);
  return (
    <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-full bg-white/10 z-50">
        <X className="w-6 h-6" />
      </button>
      {images.length > 1 && <>
        <button onClick={e => { e.stopPropagation(); setCurrent(p => (p - 1 + images.length) % images.length); }}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white p-3 rounded-full bg-white/10 hover:bg-white/20 z-50 transition-colors">
          <ChevronLeft className="w-7 h-7" />
        </button>
        <button onClick={e => { e.stopPropagation(); setCurrent(p => (p + 1) % images.length); }}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white p-3 rounded-full bg-white/10 hover:bg-white/20 z-50 transition-colors">
          <ChevronRight className="w-7 h-7" />
        </button>
      </>}
      <img src={images[current].url} alt={images[current].name}
        className="max-w-full max-h-[88vh] object-contain rounded-xl select-none"
        onClick={e => e.stopPropagation()} />
      <p className="absolute bottom-16 left-1/2 -translate-x-1/2 text-white/60 text-sm">{images[current].name} — {current + 1} / {images.length}</p>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 overflow-x-auto max-w-lg px-4">
        {images.map((img, i) => (
          <button key={i} onClick={e => { e.stopPropagation(); setCurrent(i); }}
            className={`shrink-0 w-10 h-10 rounded-lg overflow-hidden border-2 transition-all ${i === current ? "border-white" : "border-transparent opacity-40 hover:opacity-80"}`}>
            <img src={img.url} alt="" className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Sortable Image Card ────────────────────────────────────────── */
function SortableCard({
  image, index, isFirst, isSelected, isSelectMode,
  onLightbox, onDelete, onRename, onCopy, onToggleSelect,
}: {
  image: GalleryImage;
  index: number;
  isFirst: boolean;
  isSelected: boolean;
  isSelectMode: boolean;
  onLightbox: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
  onCopy: () => void;
  onToggleSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: image.url });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(image.name);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  const commitRename = () => {
    onRename(draft.trim() || image.name);
    setEditing(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative bg-white rounded-2xl overflow-hidden shadow-sm border transition-all ${
        isSelected
          ? "ring-2 ring-indigo-600 border-indigo-600 shadow-md"
          : "border-slate-100 hover:shadow-md"
      }`}
    >
      {/* Checkbox Selector (top-left) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelect();
        }}
        className={`absolute top-2 left-2 z-30 p-1 rounded-lg transition-all ${
          isSelected
            ? "bg-indigo-600 text-white shadow-sm opacity-100"
            : isSelectMode
            ? "bg-white/90 text-slate-400 hover:text-slate-700 opacity-100 border border-slate-200"
            : "bg-white/80 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-indigo-600"
        }`}
        title={isSelected ? "Deseleccionar" : "Seleccionar"}
      >
        {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
      </button>

      {/* Drag handle (top-left offset when not selecting) */}
      {!isSelectMode && (
        <div
          {...attributes}
          {...listeners}
          className="absolute top-2 left-9 z-20 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 rounded-lg p-1 cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-4 h-4 text-slate-500" />
        </div>
      )}

      {/* First badge */}
      {isFirst && (
        <div className="absolute top-2 right-2 z-20 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
          Principal
        </div>
      )}

      {/* Image */}
      <div
        className="aspect-square overflow-hidden bg-slate-100 cursor-pointer relative"
        onClick={() => {
          if (isSelectMode) {
            onToggleSelect();
          } else {
            onLightbox();
          }
        }}
      >
        <img
          src={image.url}
          alt={image.name}
          className={`w-full h-full object-cover transition-transform duration-500 ${
            isSelected ? "scale-95 opacity-90" : "group-hover:scale-105"
          }`}
        />
        {isSelected && (
          <div className="absolute inset-0 bg-indigo-900/15 pointer-events-none" />
        )}
      </div>

      {/* Action bar on hover (when not in select mode) */}
      {!isSelectMode && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent pt-6 pb-2 px-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-end gap-1">
          <button onClick={onLightbox} title="Ver" className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button onClick={onCopy} title="Copiar URL" className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <Copy className="w-4 h-4" />
          </button>
          <button onClick={() => { setDraft(image.name); setEditing(true); }} title="Renombrar" className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={onDelete} title="Eliminar" className="text-red-400 hover:text-red-300 p-1.5 rounded-lg hover:bg-white/10 transition-colors ml-auto">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Name / edit */}
      <div className="p-2">
        {editing ? (
          <div className="flex gap-1">
            <input
              autoFocus
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setEditing(false); }}
              className="flex-1 text-xs border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
            <button onClick={commitRename} className="text-indigo-600 hover:text-indigo-800 p-1">
              <Check className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <p className={`text-xs truncate px-1 ${isSelected ? "text-indigo-700 font-medium" : "text-slate-500"}`}>
            {image.name}
          </p>
        )}
      </div>
    </div>
  );
}

/* ─── Main Component ────────────────────────────────────────────── */
export function DepartmentGalleryClient({ initialDepartments }: { initialDepartments: DeptSummary[] }) {
  const router = useRouter();
  const [departments, setDepartments] = useState(initialDepartments);
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(
    initialDepartments.length > 0 ? initialDepartments[0].id : null
  );
  const [imagesByDept, setImagesByDept] = useState<Record<string, GalleryImage[]>>(() => {
    const init: Record<string, GalleryImage[]> = {};
    for (const d of initialDepartments) init[d.id] = parseImages(d);
    return init;
  });
  const [lightbox, setLightbox] = useState<{ deptId: string; index: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ deptId: string; index: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [zipping, setZipping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  // Multi-select state
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [batchDeleteConfirm, setBatchDeleteConfirm] = useState(false);
  const [isDeletingBatch, setIsDeletingBatch] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const selectedDept = departments.find(d => d.id === selectedDeptId);
  const currentImages = selectedDeptId ? (imagesByDept[selectedDeptId] ?? []) : [];

  // Toggle single image selection
  const toggleSelectUrl = useCallback((url: string) => {
    setSelectedUrls(prev => {
      const next = new Set(prev);
      if (next.has(url)) {
        next.delete(url);
      } else {
        next.add(url);
      }
      return next;
    });
  }, []);

  // Select/Deselect all images in current department
  const handleSelectAll = useCallback(() => {
    if (selectedUrls.size === currentImages.length) {
      setSelectedUrls(new Set());
    } else {
      setSelectedUrls(new Set(currentImages.map(i => i.url)));
    }
  }, [selectedUrls.size, currentImages]);

  // Cancel selection mode
  const handleCancelSelection = useCallback(() => {
    setSelectedUrls(new Set());
    setIsSelectMode(false);
  }, []);

  // Switch department -> clear selection
  const handleSelectDept = useCallback((deptId: string) => {
    setSelectedDeptId(deptId);
    setSelectedUrls(new Set());
    setIsSelectMode(false);
  }, []);

  /* Save order to DB */
  const saveImages = useCallback(async (deptId: string, imgs: GalleryImage[]) => {
    setSaving(true);
    try {
      const dept = departments.find(d => d.id === deptId);
      if (!dept) return;
      await fetch(`/api/departments/${deptId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...dept,
          images: imgs.map(i => i.url),
        }),
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }, [departments, router]);

  const handleDragEnd = (event: DragEndEvent) => {
    if (!selectedDeptId) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const imgs = currentImages;
    const oldIdx = imgs.findIndex(i => i.url === active.id);
    const newIdx = imgs.findIndex(i => i.url === over.id);
    if (oldIdx === -1 || newIdx === -1) return;

    const newImgs = arrayMove(imgs, oldIdx, newIdx).map((img, i) => ({ ...img, name: `Foto ${i + 1}` }));
    setImagesByDept(prev => ({ ...prev, [selectedDeptId]: newImgs }));
    saveImages(selectedDeptId, newImgs);
  };

  /* Delete single image */
  const handleDelete = async (deptId: string, index: number) => {
    const imgs = imagesByDept[deptId] ?? [];
    const deletedImg = imgs[index];
    const newImgs = imgs.filter((_, i) => i !== index).map((img, i) => ({ ...img, name: `Foto ${i + 1}` }));
    setImagesByDept(prev => ({ ...prev, [deptId]: newImgs }));
    if (deletedImg) {
      setSelectedUrls(prev => {
        const next = new Set(prev);
        next.delete(deletedImg.url);
        return next;
      });
    }
    setDeleteConfirm(null);

    // Delete physical file if it's a local upload
    if (deletedImg?.url?.startsWith("/uploads/")) {
      try {
        await fetch("/api/upload/delete", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: deletedImg.url }),
        });
      } catch {
        console.warn("No se pudo eliminar el archivo físico:", deletedImg.url);
      }
    }

    await saveImages(deptId, newImgs);
  };

  /* Batch Delete */
  const handleDeleteBatch = async () => {
    if (!selectedDeptId || selectedUrls.size === 0) return;
    setIsDeletingBatch(true);
    try {
      const urlsToDelete = Array.from(selectedUrls);
      const current = imagesByDept[selectedDeptId] ?? [];
      const newImgs = current
        .filter(i => !selectedUrls.has(i.url))
        .map((img, i) => ({ ...img, name: `Foto ${i + 1}` }));

      setImagesByDept(prev => ({ ...prev, [selectedDeptId]: newImgs }));
      setSelectedUrls(new Set());
      setIsSelectMode(false);
      setBatchDeleteConfirm(false);

      // Delete physical files in parallel
      await Promise.allSettled(
        urlsToDelete
          .filter(url => url.startsWith("/uploads/"))
          .map(url =>
            fetch("/api/upload/delete", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url }),
            })
          )
      );

      await saveImages(selectedDeptId, newImgs);
      toast.success(`${urlsToDelete.length} foto${urlsToDelete.length !== 1 ? "s" : ""} eliminada${urlsToDelete.length !== 1 ? "s" : ""} correctamente`);
    } catch (error: any) {
      toast.error("Error al eliminar fotos: " + error.message);
    } finally {
      setIsDeletingBatch(false);
    }
  };

  /* Rename (local only — just display name) */
  const handleRename = (deptId: string, index: number, newName: string) => {
    setImagesByDept(prev => {
      const imgs = [...(prev[deptId] ?? [])];
      imgs[index] = { ...imgs[index], name: newName };
      return { ...prev, [deptId]: imgs };
    });
  };

  /* Upload new images */
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedDeptId) return;
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    e.target.value = "";
    setUploading(true);
    try {
      const fd = new FormData();
      files.forEach(f => fd.append("files", f));
      // Pass department name so files go into a subfolder
      if (selectedDept?.name) fd.append("department", selectedDept.name);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      const urls: string[] = data.urls ?? [];
      const existing = imagesByDept[selectedDeptId] ?? [];
      const newImgs = [...existing, ...urls.map((url, i) => ({ url, name: `Foto ${existing.length + i + 1}` }))];
      setImagesByDept(prev => ({ ...prev, [selectedDeptId]: newImgs }));
      await saveImages(selectedDeptId, newImgs);
    } catch {
      toast.error("Error al subir imágenes");
    } finally {
      setUploading(false);
    }
  };

  /* Export ZIP for current department — uses server endpoint (reads from filesystem) */
  const handleExportZIP = async () => {
    if (!selectedDeptId) return;
    setZipping(true);
    try {
      const res = await fetch(`/api/departments/images-zip?departmentId=${selectedDeptId}`);
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      const deptName = (selectedDept?.name ?? "departamento").replace(/[/\\?%*:|"<>]/g, "-");
      link.download = `${deptName}_imagenes.zip`;
      link.click();
    } catch (e: any) {
      alert("Error al exportar ZIP: " + e.message);
    } finally {
      setZipping(false);
    }
  };

  /* Export ZIP for ALL departments — subfolder per department */
  const handleExportAllZIP = async () => {
    setZipping(true);
    try {
      const res = await fetch(`/api/departments/images-zip`);
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `todos_los_departamentos_imagenes.zip`;
      link.click();
    } catch (e: any) {
      alert("Error al exportar ZIP: " + e.message);
    } finally {
      setZipping(false);
    }
  };

  /**
   * Import ZIP — auto-detects format:
   *   - Flat ZIP (all images at root)  → import into the currently selected department
   *   - Subfolder ZIP (one folder per dept, matches names) → import each folder into its department
   */
  const handleImportZIP = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedDeptId) return;
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploading(true);
    try {
      const zip = await JSZip.loadAsync(file);

      // Detect if the ZIP has top-level subfolders (export-all format)
      const topLevelFolders = new Set<string>();
      zip.forEach((relativePath) => {
        const parts = relativePath.split("/");
        if (parts.length > 1 && parts[0]) topLevelFolders.add(parts[0]);
      });

      // Check if any top-level folder name matches a department name (case-insensitive)
      const deptNames = departments.map(d => d.name.toLowerCase().replace(/[/\\?%*:|"<>]/g, "-"));
      const hasSubfolderMatch = [...topLevelFolders].some(f => deptNames.includes(f.toLowerCase()));

      if (hasSubfolderMatch) {
        // ── Multi-department ZIP ─────────────────────────────────────────
        let totalImported = 0;
        for (const dept of departments) {
          const safeName = dept.name.replace(/[/\\?%*:|"<>]/g, "-");
          // Find the matching folder in the ZIP
          const imageFiles: File[] = [];
          const promises: Promise<void>[] = [];
          zip.forEach((relativePath, zipEntry) => {
            if (zipEntry.dir) return;
            if (relativePath.includes("__MACOSX")) return;
            const folder = relativePath.split("/")[0];
            if (folder.toLowerCase() !== safeName.toLowerCase()) return;
            const fileName = relativePath.split("/").pop() ?? relativePath;
            if (fileName.startsWith(".")) return;
            const lower = relativePath.toLowerCase();
            if (!lower.match(/\.(jpg|jpeg|png|webp|gif)$/)) return;
            promises.push(
              zipEntry.async("arraybuffer").then(ab => {
                const ext = fileName.split('.').pop()?.toLowerCase() || 'jpg';
                const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
                imageFiles.push(new File([ab], fileName, { type: mime }));
              })
            );
          });
          await Promise.all(promises);
          if (!imageFiles.length) continue;

          const fd = new FormData();
          imageFiles.forEach(f => fd.append("files", f));
          fd.append("department", dept.name);
          const res = await fetch("/api/upload", { method: "POST", body: fd });
          const data = await res.json();
          const urls: string[] = data.urls ?? [];
          const existing = imagesByDept[dept.id] ?? [];
          const newImgs = [...existing, ...urls.map((url, i) => ({ url, name: imageFiles[i]?.name ?? `Foto ${existing.length + i + 1}` }))];
          setImagesByDept(prev => ({ ...prev, [dept.id]: newImgs }));
          await saveImages(dept.id, newImgs);
          totalImported += urls.length;
        }
        toast.success(`${totalImported} imágenes importadas en los departamentos correspondientes`);
      } else {
        // ── Single-department ZIP (flat) ────────────────────────────────
        const imageFiles: File[] = [];
        const promises: Promise<void>[] = [];
        zip.forEach((relativePath, zipEntry) => {
          if (zipEntry.dir) return;
          if (relativePath.includes("__MACOSX")) return;
          const fileName = relativePath.split("/").pop() ?? relativePath;
          if (fileName.startsWith(".")) return;
          const lower = relativePath.toLowerCase();
          if (!lower.match(/\.(jpg|jpeg|png|webp|gif)$/)) return;
          promises.push(
            zipEntry.async("arraybuffer").then(ab => {
              const ext = fileName.split('.').pop()?.toLowerCase() || 'jpg';
              const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
              imageFiles.push(new File([ab], fileName, { type: mime }));
            })
          );
        });
        await Promise.all(promises);

        if (!imageFiles.length) { toast.error("No se encontraron imágenes en el ZIP"); setUploading(false); return; }

        const fd = new FormData();
        imageFiles.forEach(f => fd.append("files", f));
        if (selectedDept?.name) fd.append("department", selectedDept.name);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await res.json();
        const urls: string[] = data.urls ?? [];
        const existing = imagesByDept[selectedDeptId] ?? [];
        const newImgs = [...existing, ...urls.map((url, i) => ({ url, name: imageFiles[i]?.name ?? `Foto ${existing.length + i + 1}` }))];
        setImagesByDept(prev => ({ ...prev, [selectedDeptId]: newImgs }));
        await saveImages(selectedDeptId, newImgs);
        toast.success(`${urls.length} imágenes importadas desde el ZIP`);
      }
    } catch (err: any) {
      toast.error("Error al importar ZIP: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const activeSelectMode = isSelectMode || selectedUrls.size > 0;

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-slate-50">

      {/* ── Sidebar ── */}
      <aside className="w-64 shrink-0 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-100">
          <Button variant="ghost" size="sm" asChild className="mb-3 -ml-1">
            <Link href="/dashboard/departments">
              <ArrowLeft className="w-4 h-4 mr-1" /> Volver a Departamentos
            </Link>
          </Button>
          <h1 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
            <Images className="w-5 h-5 text-indigo-600" /> Galería
          </h1>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {departments.map(dept => {
            const imgs = imagesByDept[dept.id] ?? [];
            const isActive = dept.id === selectedDeptId;
            return (
              <button
                key={dept.id}
                onClick={() => handleSelectDept(dept.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${isActive ? "bg-indigo-50 border-r-2 border-indigo-500" : "hover:bg-slate-50"}`}
              >
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 shrink-0 ring-2 ring-transparent">
                  {imgs[0] ? <img src={imgs[0].url} alt="" className="w-full h-full object-cover" /> : <FolderOpen className="w-5 h-5 m-auto mt-2.5 text-slate-400" />}
                </div>
                <div className="min-w-0">
                  <p className={`font-semibold text-sm truncate ${isActive ? "text-indigo-700" : "text-slate-700"}`}>{dept.name}</p>
                  <p className="text-xs text-slate-400">{imgs.length} foto{imgs.length !== 1 ? "s" : ""}</p>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className={`border-b px-6 py-3 flex items-center gap-3 shrink-0 transition-colors ${
          activeSelectMode ? "bg-indigo-50/70 border-indigo-200" : "bg-white border-slate-200"
        }`}>
          {activeSelectMode ? (
            /* ── Batch Selection Toolbar ── */
            <div className="flex items-center justify-between w-full gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <span className="bg-indigo-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
                  {selectedUrls.size} seleccionada{selectedUrls.size !== 1 ? "s" : ""}
                </span>
                <p className="text-xs text-slate-600 hidden sm:inline">
                  Hacé clic en las fotos para agregarlas o quitarlas de la selección
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white"
                  onClick={handleSelectAll}
                >
                  <CheckCheck className="w-4 h-4 mr-1 text-indigo-600" />
                  {selectedUrls.size === currentImages.length ? "Deseleccionar todas" : "Seleccionar todas"}
                </Button>

                <Button
                  size="sm"
                  variant="destructive"
                  disabled={selectedUrls.size === 0 || isDeletingBatch}
                  onClick={() => setBatchDeleteConfirm(true)}
                >
                  {isDeletingBatch ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-1" />
                  )}
                  Eliminar ({selectedUrls.size})
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancelSelection}
                >
                  <X className="w-4 h-4 mr-1" /> Cancelar
                </Button>
              </div>
            </div>
          ) : (
            /* ── Standard Toolbar ── */
            <>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-slate-800 truncate">{selectedDept?.name ?? "Seleccioná un departamento"}</h2>
                <p className="text-xs text-slate-400">
                  {currentImages.length} foto{currentImages.length !== 1 ? "s" : ""} · Arrastrá para reordenar · La primera foto aparece en la página pública
                </p>
              </div>

              {saving && (
                <span className="text-xs text-indigo-500 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Guardando...
                </span>
              )}

              {selectedDeptId && (
                <>
                  {/* Select Mode Toggle */}
                  {currentImages.length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsSelectMode(true)}
                      title="Seleccionar varias imágenes para eliminar"
                    >
                      <CheckSquare className="w-4 h-4 mr-1 text-indigo-600" /> Seleccionar
                    </Button>
                  )}

                  {/* Upload */}
                  <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    {uploading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                    {uploading ? "Subiendo..." : "Agregar fotos"}
                  </Button>
                  <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />

                  {/* Export ZIP — current dept */}
                  <Button size="sm" variant="outline" onClick={handleExportZIP} disabled={zipping || currentImages.length === 0} title="Exportar imágenes de este departamento">
                    {zipping ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Archive className="w-4 h-4 mr-1 text-amber-600" />}
                    {zipping ? "Comprimiendo..." : "Exportar ZIP"}
                  </Button>

                  {/* Export ZIP — all departments */}
                  <Button size="sm" variant="outline" onClick={handleExportAllZIP} disabled={zipping} title="Exportar imágenes de TODOS los departamentos">
                    {zipping ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Archive className="w-4 h-4 mr-1 text-indigo-600" />}
                    {zipping ? "Comprimiendo..." : "Exportar Todo"}
                  </Button>

                  {/* Import ZIP (auto-detects single dept vs all depts) */}
                  <Button size="sm" variant="outline" onClick={() => zipInputRef.current?.click()} disabled={uploading}>
                    <Upload className="w-4 h-4 mr-1 text-blue-600" /> Importar ZIP
                  </Button>
                  <input ref={zipInputRef} type="file" accept=".zip" className="hidden" onChange={handleImportZIP} />
                </>
              )}
            </>
          )}
        </div>

        {/* Image grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selectedDeptId ? (
            <div className="h-full flex items-center justify-center text-slate-400">
              <div className="text-center">
                <FolderOpen className="w-16 h-16 mx-auto mb-3 text-slate-300" />
                <p>Seleccioná un departamento del panel izquierdo</p>
              </div>
            </div>
          ) : currentImages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400">
              <div className="text-center">
                <Images className="w-16 h-16 mx-auto mb-3 text-slate-300" />
                <p className="mb-4">No hay fotos en este departamento</p>
                <Button size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-4 h-4 mr-1" /> Agregar fotos
                </Button>
              </div>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={currentImages.map(i => i.url)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
                  {currentImages.map((img, index) => (
                    <SortableCard
                      key={img.url}
                      image={img}
                      index={index}
                      isFirst={index === 0}
                      isSelected={selectedUrls.has(img.url)}
                      isSelectMode={activeSelectMode}
                      onLightbox={() => setLightbox({ deptId: selectedDeptId, index })}
                      onDelete={() => setDeleteConfirm({ deptId: selectedDeptId, index })}
                      onRename={name => handleRename(selectedDeptId, index, name)}
                      onCopy={() => { navigator.clipboard.writeText(img.url); }}
                      onToggleSelect={() => toggleSelectUrl(img.url)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </main>

      {/* Lightbox */}
      {lightbox && (
        <Lightbox
          images={imagesByDept[lightbox.deptId] ?? []}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}

      {/* Single Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[150] bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="font-bold text-slate-800 text-lg mb-2">¿Eliminar esta foto?</h3>
            <p className="text-slate-500 text-sm mb-6">Esta acción no se puede deshacer. La foto será removida del departamento.</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
              <Button variant="destructive" className="flex-1" onClick={() => handleDelete(deleteConfirm.deptId, deleteConfirm.index)}>
                <Trash2 className="w-4 h-4 mr-1" /> Eliminar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Delete confirm */}
      {batchDeleteConfirm && (
        <div className="fixed inset-0 z-[150] bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-lg mb-2">
              ¿Eliminar {selectedUrls.size} foto{selectedUrls.size !== 1 ? "s" : ""}?
            </h3>
            <p className="text-slate-500 text-sm mb-6">
              Esta acción no se puede deshacer. Se eliminarán permanentemente las {selectedUrls.size} fotos seleccionadas de este departamento.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setBatchDeleteConfirm(false)} disabled={isDeletingBatch}>
                Cancelar
              </Button>
              <Button variant="destructive" className="flex-1" onClick={handleDeleteBatch} disabled={isDeletingBatch}>
                {isDeletingBatch ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Trash2 className="w-4 h-4 mr-1" />}
                {isDeletingBatch ? "Eliminando..." : `Eliminar (${selectedUrls.size})`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
