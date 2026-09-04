"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Image as ImageIcon, Check, Folder, Search, Upload, X, ZoomIn } from "lucide-react";
import { toast } from "sonner";

function formatBytes(bytes: number) {
  if (!bytes || bytes === 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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
  const [selectedFile, setSelectedFile] = useState<MediaItem | null>(null);
  const [uploading, setUploading] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    async function loadFolders() {
      try {
        const res = await fetch("/api/media/folders");
        if (res.ok) {
          const data = await res.json();
          if (data.folders?.length) setFolders(data.folders);
        }
      } catch {}
    }
    loadFolders();
  }, [open]);

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

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) formData.append("files", files[i]);
    formData.append("folder", selectedFolder);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        toast.success("Imagen subida correctamente");
        const listRes = await fetch(`/api/media/files?folder=${encodeURIComponent(selectedFolder)}`);
        if (listRes.ok) {
          const listData = await listRes.json();
          setMediaFiles(listData.files || []);
          if (data.urls?.[0]) {
            const newFile = listData.files?.find((f: MediaItem) => f.url === data.urls[0]);
            setSelectedUrl(data.urls[0]);
            setSelectedFile(newFile || null);
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

  const handleSelectFile = (file: MediaItem) => {
    // Toggle: click on already selected image → deselect
    if (selectedUrl === file.url) {
      setSelectedUrl(null);
      setSelectedFile(null);
    } else {
      setSelectedUrl(file.url);
      setSelectedFile(file);
    }
  };

  const filteredFiles = mediaFiles.filter(
    (f) =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.fileName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={`flex flex-col p-0 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 overflow-hidden rounded-2xl !max-w-none transition-all duration-300 ${
            selectedFile
              ? "w-[min(900px,96vw)] h-[min(620px,92vh)]"
              : "w-[min(600px,96vw)] h-[min(620px,92vh)]"
          }`}
        >
          <DialogHeader className="px-6 pt-5 pb-4 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-sky-500" />
              {title}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-1 overflow-hidden min-h-0">
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden px-5 py-4 gap-3">
              <div className="flex items-start justify-between gap-3 flex-shrink-0">
                <div className="flex flex-wrap gap-1.5 flex-1">
                  {folders.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => {
                        setSelectedFolder(f.id);
                        setSelectedUrl(null);
                        setSelectedFile(null);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        selectedFolder === f.id
                          ? "bg-sky-500 text-white shadow-sm"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                      }`}
                    >
                      <Folder className="w-3.5 h-3.5" />
                      {f.name}
                    </button>
                  ))}
                </div>
                <label className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors">
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
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

              <div className="relative flex-shrink-0">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por nombre de archivo..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="flex-1 overflow-y-auto pr-1 min-h-0">
                {loading ? (
                  <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                    <Loader2 className="w-7 h-7 animate-spin mb-2" />
                    <p className="text-sm">Cargando imágenes...</p>
                  </div>
                ) : filteredFiles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-slate-400 border border-dashed rounded-xl dark:border-slate-700">
                    <ImageIcon className="w-9 h-9 mb-2 opacity-50" />
                    <p className="text-sm font-medium">No hay imágenes en esta carpeta</p>
                    <p className="text-xs text-slate-500 mt-1">Subí fotos con el botón de arriba</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2.5">
                    {filteredFiles.map((file) => {
                      const isSelected = selectedUrl === file.url;
                      return (
                        <div
                          key={file.url}
                          onClick={() => handleSelectFile(file)}
                          className={`group relative rounded-xl overflow-hidden border cursor-pointer transition-all aspect-video ${
                            isSelected
                              ? "border-sky-500 ring-2 ring-sky-500 shadow-md"
                              : "border-slate-200 dark:border-slate-700 hover:border-sky-400 dark:hover:border-sky-600"
                          }`}
                        >
                          <img
                            src={file.url}
                            alt={file.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                          {isSelected && (
                            <div className="absolute top-1.5 right-1.5 bg-sky-500 text-white p-1 rounded-full shadow-md">
                              <Check className="w-3 h-3" />
                            </div>
                          )}
                          <div className="absolute bottom-0 inset-x-0 bg-black/55 backdrop-blur-sm p-1.5 text-[10px] text-white truncate font-medium">
                            {file.name}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT PANEL — only rendered when image is selected */}
            <div
              className={`flex-shrink-0 border-l border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden transition-all duration-300 ${
                selectedFile ? "w-[280px] opacity-100" : "w-0 opacity-0 border-0"
              }`}
            >
              {selectedFile ? (
                <div className="flex flex-col h-full p-5 gap-4 overflow-y-auto">
                  <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex-shrink-0">
                    Vista Previa
                  </p>

                  <div
                    className="relative rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex-shrink-0 group"
                    style={{ aspectRatio: "16/10" }}
                  >
                    <img
                      src={selectedFile.url}
                      alt={selectedFile.name}
                      className="w-full h-full object-contain"
                    />
                    <button
                      onClick={() => setLightboxOpen(true)}
                      className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100"
                      title="Ver en tamaño completo"
                    >
                      <div className="bg-white/90 dark:bg-slate-900/90 rounded-full p-2 shadow-lg">
                        <ZoomIn className="w-4 h-4 text-slate-700 dark:text-slate-200" />
                      </div>
                    </button>
                  </div>

                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 flex flex-col gap-1">
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Nombre</p>
                      <p className="text-xs text-slate-700 dark:text-slate-200 font-semibold break-all leading-relaxed">
                        {selectedFile.name}
                      </p>
                    </div>
                    {selectedFile.size > 0 && (
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2 flex items-center justify-between">
                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Tamaño</p>
                        <p className="text-xs font-bold text-slate-600 dark:text-slate-300">{formatBytes(selectedFile.size)}</p>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => { setSelectedUrl(null); setSelectedFile(null); }}
                    className="mt-auto flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer self-start"
                  >
                    <X className="w-3.5 h-3.5" />
                    Deseleccionar
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
            <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[300px]">
              {selectedFile ? (
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-sky-500 flex-shrink-0" />
                  <span className="truncate">{selectedFile.name}</span>
                </span>
              ) : (
                "Elige una foto para continuar"
              )}
            </div>
            <div className="flex gap-2 flex-shrink-0">
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

      {lightboxOpen && selectedFile && (
        <div
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-6"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors"
            onClick={() => setLightboxOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={selectedFile.url}
            alt={selectedFile.name}
            className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <p className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white/70 text-sm bg-black/50 px-4 py-1.5 rounded-full backdrop-blur-sm whitespace-nowrap">
            {selectedFile.name}
          </p>
        </div>
      )}
    </>
  );
}
