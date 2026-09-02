"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Image as ImageIcon, Check, Folder, Search, Upload } from "lucide-react";
import { toast } from "sonner";

interface MediaPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string) => void;
  initialFolder?: string;
  title?: string;
}

interface MediaItem {
  name: string;
  fileName: string;
  url: string;
  size: number;
  createdAt: string;
}

interface FolderItem {
  id: string;
  name: string;
  isCustom: boolean;
}

export function MediaPickerModal({
  open,
  onOpenChange,
  onSelect,
  initialFolder = "slides",
  title = "Seleccionar Imagen de Galería",
}: MediaPickerModalProps) {
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [selectedFolder, setSelectedFolder] = useState(initialFolder);
  const [mediaFiles, setMediaFiles] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Fetch available folders
  useEffect(() => {
    if (!open) return;
    async function loadFolders() {
      try {
        const res = await fetch("/api/media/folders");
        if (res.ok) {
          const data = await res.json();
          if (data.folders?.length) {
            setFolders(data.folders);
          }
        }
      } catch {}
    }
    loadFolders();
  }, [open]);

  // Fetch files in the selected folder
  useEffect(() => {
    if (!open) return;
    async function loadFiles() {
      setLoading(true);
      try {
        const res = await fetch(`/api/media/files?folder=${encodeURIComponent(selectedFolder)}`);
        if (res.ok) {
          const data = await res.json();
          setMediaFiles(data.files || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadFiles();
  }, [open, selectedFolder]);

  // Handle direct upload inside picker
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }
    formData.append("folder", selectedFolder);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        toast.success("Imagen subida correctamente");
        // Reload list
        const listRes = await fetch(`/api/media/files?folder=${encodeURIComponent(selectedFolder)}`);
        if (listRes.ok) {
          const listData = await listRes.json();
          setMediaFiles(listData.files || []);
          if (data.urls?.[0]) {
            setSelectedUrl(data.urls[0]);
          }
        }
      } else {
        toast.error("Error al subir imagen");
      }
    } catch {
      toast.error("Error al subir imagen");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleConfirm = () => {
    if (selectedUrl) {
      onSelect(selectedUrl);
      onOpenChange(false);
    }
  };

  const filteredFiles = mediaFiles.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.fileName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
        <DialogHeader className="pb-2 border-b border-slate-200 dark:border-slate-800">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-sky-500" />
            {title}
          </DialogTitle>
        </DialogHeader>

        {/* Folder Navigation & Upload */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
          {/* Folder Pills */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            {folders.map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  setSelectedFolder(f.id);
                  setSelectedUrl(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedFolder === f.id
                    ? "bg-sky-500 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                <Folder className="w-3.5 h-3.5" />
                {f.name}
              </button>
            ))}
          </div>

          {/* Upload Button */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-xs">
              {uploading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              {uploading ? "Subiendo..." : "Subir a esta carpeta"}
              <input
                type="file"
                multiple
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={handleUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mt-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nombre de archivo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        {/* Grid of Images */}
        <div className="flex-1 overflow-y-auto min-h-[280px] max-h-[420px] my-2 pr-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mb-2" />
              <p className="text-sm">Cargando imágenes...</p>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400 border border-dashed rounded-xl dark:border-slate-800">
              <ImageIcon className="w-10 h-10 mb-2 opacity-50" />
              <p className="text-sm font-medium">No hay imágenes en esta carpeta</p>
              <p className="text-xs text-slate-500 mt-1">Usa el botón "Subir a esta carpeta" para agregar fotos</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filteredFiles.map((file) => {
                const isSelected = selectedUrl === file.url;
                return (
                  <div
                    key={file.url}
                    onClick={() => setSelectedUrl(file.url)}
                    className={`group relative rounded-xl overflow-hidden border cursor-pointer transition-all aspect-video flex flex-col justify-between ${
                      isSelected
                        ? "border-sky-500 ring-2 ring-sky-500 shadow-md bg-sky-50 dark:bg-sky-950/30"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-100 dark:bg-slate-800"
                    }`}
                  >
                    <img
                      src={file.url}
                      alt={file.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    {/* Selected Badge */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-sky-500 text-white p-1 rounded-full shadow-md">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                    {/* Name bar at bottom */}
                    <div className="absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur-xs p-1.5 text-[11px] text-white truncate font-medium">
                      {file.name}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs sm:max-w-md">
            {selectedUrl ? `Seleccionado: ${selectedUrl}` : "Elige una foto para continuar"}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={!selectedUrl}
              className="bg-sky-600 hover:bg-sky-500 text-white cursor-pointer font-semibold"
            >
              Seleccionar Imagen
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
