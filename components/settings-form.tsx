"use client";

import { useEffect, useState, useRef } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Save,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Pencil,
  Power,
  PowerOff,
  FileSpreadsheet,
  Globe,
  MessageSquare,
  PhoneCall,
  Mail,
  MapPin,
  ArrowUp,
  ArrowDown,
  Image as ImageIcon,
  Layers,
  Eye,
  Settings,
  Package,
  Sparkles,
  Sliders,
  Send,
  FolderOpen,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import Papa from "papaparse";
import { ImportPreviewModal, ImportPreviewRow, ImportStats } from "./import-preview-modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { SiteConfig, SITE_CONFIG_DEFAULTS, HeroSlide, DEFAULT_HERO_SLIDES } from "@/lib/site.config";
import { MediaPickerModal } from "./media-picker-modal";

interface SettingsFormProps {
  activeParkingCount?: number;
}

type TabType = "general" | "insumos" | "identidad" | "slides" | "contacto" | "smtp";

export function SettingsForm({ activeParkingCount = 0 }: SettingsFormProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // SuperAdmin detection
  const userEmail = session?.user?.email?.toLowerCase().trim();
  const isSuperAdmin = userEmail === "guillermo.diarte@gmail.com" || (session?.user as any)?.isSuperAdmin === true;

  // Active Tab State
  const [activeTab, setActiveTab] = useState<TabType>("general");

  // Media Picker State
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<{ field: string; slideId?: string } | null>(null);
  const [pickerFolder, setPickerFolder] = useState<string>("slides");

  // Site Config State (SuperAdmin only)
  const [siteConfig, setSiteConfig] = useState<SiteConfig>(SITE_CONFIG_DEFAULTS);
  const [savingSiteConfig, setSavingSiteConfig] = useState(false);

  // Settings State
  const [startYear, setStartYear] = useState<string>("2026");
  const [endYear, setEndYear] = useState<string>("2036");
  const [showParking, setShowParking] = useState<boolean>(true);
  const [cleaningFee, setCleaningFee] = useState<string>("0");

  // Supplies State
  const [supplies, setSupplies] = useState<any[]>([]);
  const [newSupplyName, setNewSupplyName] = useState("");
  const [newSupplyCost, setNewSupplyCost] = useState("");
  const [editingSupply, setEditingSupply] = useState<any | null>(null);
  const [supplyToDelete, setSupplyToDelete] = useState<string | null>(null);

  // Backup State
  const [loadingBackup, setLoadingBackup] = useState(false);
  const [backupToRestore, setBackupToRestore] = useState<File | null>(null);
  const [backupContent, setBackupContent] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Import/Export State
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [previewRows, setPreviewRows] = useState<ImportPreviewRow[]>([]);
  const [stats, setStats] = useState<ImportStats>({ total: 0, new: 0, updated: 0, same: 0, errors: 0 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const promises: Promise<Response>[] = [
          fetch("/api/settings"),
          fetch("/api/supplies"),
        ];
        if (isSuperAdmin) {
          promises.push(fetch("/api/site-config"));
        }

        const [settingsRes, suppliesRes, siteConfigRes] = await Promise.all(promises);

        if (settingsRes && settingsRes.ok) {
          const data = await settingsRes.json();
          setStartYear(String(data.startYear || 2026));
          setEndYear(String(data.endYear || 2036));
          setShowParking(data.showParking !== false);
          setCleaningFee(String(data.cleaningFee || 0));
        }

        if (suppliesRes && suppliesRes.ok) {
          const data = await suppliesRes.json();
          setSupplies(data.supplies || []);
        }

        if (siteConfigRes && siteConfigRes.ok) {
          const cfgData = await siteConfigRes.json();
          setSiteConfig(prev => ({ ...SITE_CONFIG_DEFAULTS, ...prev, ...cfgData }));
        }
      } catch (error) {
        console.error("Failed to fetch data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isSuperAdmin]);

  const handleSaveSettings = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startYear: parseInt(startYear),
          endYear: parseInt(endYear),
          showParking,
          cleaningFee: parseFloat(cleaningFee) || 0,
        }),
      });

      if (!res.ok) throw new Error("Error al guardar la configuración");

      setSuccess("Configuración guardada exitosamente.");
      router.refresh();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSiteConfig = async () => {
    setSavingSiteConfig(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/site-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(siteConfig),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Error al guardar la configuración del sitio");
      }

      const data = await res.json();
      if (data.config) {
        setSiteConfig(prev => ({ ...SITE_CONFIG_DEFAULTS, ...prev, ...data.config }));
      }
      setSuccess("Configuración del sitio público guardada correctamente.");
      router.refresh();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Error al guardar la configuración del sitio.");
    } finally {
      setSavingSiteConfig(false);
    }
  };

  // ─── Hero Slides Helpers ──────────────────────────────────────────
  const heroSlidesList: HeroSlide[] = (() => {
    try {
      if (siteConfig.heroSlides) {
        const parsed = typeof siteConfig.heroSlides === "string" ? JSON.parse(siteConfig.heroSlides) : siteConfig.heroSlides;
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_HERO_SLIDES;
  })();

  const updateHeroSlides = (slides: HeroSlide[]) => {
    setSiteConfig(prev => ({
      ...prev,
      heroSlides: JSON.stringify(slides),
    }));
  };

  const handleAddSlide = () => {
    const newSlide: HeroSlide = {
      id: `slide-${Date.now()}`,
      image: "",
      title: "Nuevo Slide",
      subtitle: "Texto descriptivo para la portada",
      buttonText: "",
      buttonLink: "",
    };
    updateHeroSlides([...heroSlidesList, newSlide]);
  };

  const handleUpdateSlide = (id: string, updates: Partial<HeroSlide>) => {
    const updated = heroSlidesList.map(s => s.id === id ? { ...s, ...updates } : s);
    updateHeroSlides(updated);
  };

  const handleDeleteSlide = (id: string) => {
    if (heroSlidesList.length <= 1) {
      setError("Debe haber al menos 1 slide en la portada.");
      setTimeout(() => setError(null), 3000);
      return;
    }
    const updated = heroSlidesList.filter(s => s.id !== id);
    updateHeroSlides(updated);
  };

  const handleMoveSlide = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= heroSlidesList.length) return;
    const list = [...heroSlidesList];
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;
    updateHeroSlides(list);
  };

  // --- Media Picker Callback -----------------------------------------------
  const handleMediaSelected = (url: string) => {
    if (!pickerTarget) return;
    const f = pickerTarget.field;
    if (f === "slideImage" && pickerTarget.slideId) {
      handleUpdateSlide(pickerTarget.slideId, { image: url });
    } else {
      setSiteConfig(prev => ({ ...prev, [f]: url }));
    }
  };

  const openPicker = (field: string, folder = "slides", slideId?: string) => {
    setPickerTarget({ field, slideId });
    setPickerFolder(folder);
    setPickerOpen(true);
  };

  // --- Direct Image Uploads for Site Config --------------------------------
  const handleDirectUpload = async (field: keyof SiteConfig, folder: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSavingSiteConfig(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("files", file);
      formData.append("folder", folder);

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Error al subir archivo");

      const data = await res.json();
      if (data.urls && data.urls.length > 0) {
        setSiteConfig(prev => ({ ...prev, [field]: data.urls[0] }));
        setSuccess("Imagen subida correctamente. Recorda guardar los cambios.");
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err: any) {
      setError(err?.message || "Error al subir archivo");
    } finally {
      setSavingSiteConfig(false);
      e.target.value = "";
    }
  };

  const handleSlideImageUpload = async (slideId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSavingSiteConfig(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("files", file);
      formData.append("folder", "slides");

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Error al subir la imagen del slide");

      const data = await res.json();
      if (data.urls && data.urls.length > 0) {
        handleUpdateSlide(slideId, { image: data.urls[0] });
        setSuccess("Imagen subida correctamente.");
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err: any) {
      setError(err?.message || "Error al subir la imagen");
    } finally {
      setSavingSiteConfig(false);
      e.target.value = "";
    }
  };

  // ─── Supplies Handlers ────────────────────────────────────────────
  const handleSaveSupply = async () => {
    if (!newSupplyName || !newSupplyCost) return;
    try {
      const cost = parseFloat(newSupplyCost);
      if (isNaN(cost)) return;

      if (editingSupply) {
        const res = await fetch("/api/supplies", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingSupply.id, name: newSupplyName, cost }),
        });
        if (res.ok) {
          const updated = await res.json();
          setSupplies(supplies.map(s => s.id === updated.id ? updated : s));
          setEditingSupply(null);
          setNewSupplyName("");
          setNewSupplyCost("");
        }
      } else {
        const res = await fetch("/api/supplies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newSupplyName, cost }),
        });
        if (res.ok) {
          const created = await res.json();
          setSupplies([...supplies, created]);
          setNewSupplyName("");
          setNewSupplyCost("");
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleSupply = async (supply: any) => {
    try {
      const res = await fetch("/api/supplies", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: supply.id, isActive: !supply.isActive }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSupplies(supplies.map(s => s.id === updated.id ? updated : s));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSupply = async (id: string) => {
    try {
      const res = await fetch(`/api/supplies?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setSupplies(supplies.filter(s => s.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditSupply = (supply: any) => {
    setEditingSupply(supply);
    setNewSupplyName(supply.name);
    setNewSupplyCost(String(supply.cost));
  };

  const handleCancelEdit = () => {
    setEditingSupply(null);
    setNewSupplyName("");
    setNewSupplyCost("");
  };

  const totalSuppliesCost = supplies
    .filter(s => s.isActive)
    .reduce((acc, s) => acc + (s.cost || 0), 0);

  // ─── Backup Handlers ──────────────────────────────────────────────
  const handleExportBackup = async () => {
    setLoadingBackup(true);
    try {
      const res = await fetch("/api/backup");
      if (!res.ok) throw new Error("Error al exportar base de datos");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup_completo_${format(new Date(), "yyyyMMdd_HHmm")}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingBackup(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBackupToRestore(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        setBackupContent(json);
      } catch (err) {
        setError("El archivo seleccionado no es un JSON válido");
        setBackupToRestore(null);
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmRestore = async () => {
    if (!backupContent) return;

    setLoadingBackup(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(backupContent),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al restaurar");
      }

      setSuccess("Base de datos restaurada correctamente. Recargando...");
      setBackupToRestore(null);
      setBackupContent(null);
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingBackup(false);
    }
  };

  // ─── SMTP Test ────────────────────────────────────────────────────
  const handleTestSmtp = async () => {
    setTestingSmtp(true);
    setSmtpTestResult(null);
    try {
      const res = await fetch("/api/contact/test-smtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          smtpHost: siteConfig.smtpHost,
          smtpPort: siteConfig.smtpPort,
          smtpUser: siteConfig.smtpUser,
          smtpPassword: siteConfig.smtpPassword,
          smtpFromName: siteConfig.smtpFromName,
          recipient: siteConfig.email || siteConfig.smtpUser,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSmtpTestResult({ success: true, message: data.message || "Correo de prueba enviado con éxito." });
      } else {
        setSmtpTestResult({ success: false, message: data.error || "Falló la prueba SMTP." });
      }
    } catch (err: any) {
      setSmtpTestResult({ success: false, message: err.message || "Error al conectar con el servidor SMTP." });
    } finally {
      setTestingSmtp(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      {/* Media Picker Modal */}
      <MediaPickerModal
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={handleMediaSelected}
        initialFolder={pickerFolder}
      />

      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Configuración</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Administra los valores del sistema, insumos globales y la web pública.
        </p>
      </div>

      {/* Notifications */}
      {error && (
        <Alert variant="destructive" className="border-red-500/50 bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-emerald-500/50 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <AlertTitle>Éxito</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* ── Submenu Horizontal Tabs (Like Edit Department Modal) ── */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-200/70 dark:bg-slate-800/80 rounded-2xl border border-slate-300/60 dark:border-slate-700/60 w-full overflow-x-auto shadow-xs">
        <button
          onClick={() => setActiveTab("general")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 ${
            activeTab === "general"
              ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Settings className="w-4 h-4 text-slate-500" /> General & Sistema
        </button>

        <button
          onClick={() => setActiveTab("insumos")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 ${
            activeTab === "insumos"
              ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Package className="w-4 h-4 text-amber-500" /> Insumos Globales
        </button>

        {isSuperAdmin && (
          <>
            <button
              onClick={() => setActiveTab("identidad")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 ${
                activeTab === "identidad"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Sparkles className="w-4 h-4 text-sky-500" /> Identidad & Login
            </button>

            <button
              onClick={() => setActiveTab("slides")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 ${
                activeTab === "slides"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <ImageIcon className="w-4 h-4 text-indigo-500" /> Slides de Portada ({heroSlidesList.length})
            </button>

            <button
              onClick={() => setActiveTab("contacto")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 ${
                activeTab === "contacto"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <PhoneCall className="w-4 h-4 text-emerald-500" /> Contacto & Ubicación
            </button>

            <button
              onClick={() => setActiveTab("smtp")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 ${
                activeTab === "smtp"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Mail className="w-4 h-4 text-violet-500" /> Correo SMTP
            </button>
          </>
        )}
      </div>

      {/* ── TAB 1: GENERAL & SISTEMA ── */}
      {activeTab === "general" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-200">
          {/* General Options */}
          <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Settings className="w-5 h-5 text-sky-500" /> Configuración General
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">
                Opciones operativas y rangos de calendario.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="cleaningFee" className="font-semibold text-slate-800 dark:text-slate-200">Gasto de Limpieza Global ($)</Label>
                <Input
                  id="cleaningFee"
                  type="number"
                  value={cleaningFee}
                  onChange={(e) => setCleaningFee(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="startYear" className="font-semibold text-slate-800 dark:text-slate-200">Año Inicio</Label>
                  <Input
                    id="startYear"
                    type="number"
                    value={startYear}
                    onChange={(e) => setStartYear(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="endYear" className="font-semibold text-slate-800 dark:text-slate-200">Año Fin</Label>
                  <Input
                    id="endYear"
                    type="number"
                    value={endYear}
                    onChange={(e) => setEndYear(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={handleSaveSettings} disabled={saving} className="bg-sky-600 hover:bg-sky-500 text-white font-semibold cursor-pointer">
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Guardar Configuración
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Menu Options & Backup */}
          <div className="space-y-6">
            {/* Menu Visibility */}
            <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-indigo-500" /> Menú del Sistema
                </CardTitle>
                <CardDescription className="text-slate-500 dark:text-slate-400">
                  Visibilidad de módulos en el menú lateral.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/40">
                  <div className="space-y-0.5">
                    <Label htmlFor="showParking" className="font-semibold text-slate-900 dark:text-slate-100">Módulo Cocheras</Label>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Mostrar u ocultar la opción de Cocheras en el menú lateral.
                    </p>
                  </div>
                  <Switch
                    id="showParking"
                    checked={showParking}
                    onCheckedChange={(val) => {
                      setShowParking(val);
                      // Auto save on toggle
                      fetch("/api/settings", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ showParking: val }),
                      }).then(() => router.refresh());
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Database Backup */}
            <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Download className="w-5 h-5 text-amber-500" /> Copia de Seguridad
                </CardTitle>
                <CardDescription className="text-slate-500 dark:text-slate-400">
                  Exporta o importa la base de datos completa.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  onClick={handleExportBackup}
                  disabled={loadingBackup}
                  className="w-full justify-center font-semibold cursor-pointer border-slate-300 dark:border-slate-700"
                >
                  {loadingBackup ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                  Exportar Base de Datos (JSON)
                </Button>

                <div className="pt-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".json"
                    className="hidden"
                  />
                  <Button
                    variant="destructive"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loadingBackup}
                    className="w-full justify-center font-semibold cursor-pointer"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Restaurar Base de Datos
                  </Button>
                </div>

                {backupToRestore && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl mt-3 space-y-2">
                    <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                      ⚠️ Atención: La restauración reemplazará los datos actuales por los del archivo.
                    </p>
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => setBackupToRestore(null)}>Cancelar</Button>
                      <Button size="sm" variant="destructive" onClick={handleConfirmRestore} disabled={loadingBackup}>
                        {loadingBackup ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                        Confirmar Restauración
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── TAB 2: INSUMOS GLOBALES ── */}
      {activeTab === "insumos" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Package className="w-5 h-5 text-amber-500" /> Gastos de Insumos
                </CardTitle>
                <CardDescription className="text-slate-500 dark:text-slate-400">
                  Gestión de insumos globales y cálculo automático de costos.
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Form to add/edit supply */}
              <div className="flex flex-col md:flex-row gap-4 items-end bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="grid gap-1.5 w-full md:flex-1">
                  <Label htmlFor="sName" className="font-semibold text-slate-800 dark:text-slate-200">{editingSupply ? "Editar Nombre" : "Nombre del Insumo"}</Label>
                  <Input
                    id="sName"
                    value={newSupplyName}
                    onChange={e => setNewSupplyName(e.target.value)}
                    placeholder="Ej: Papel Higiénico"
                    className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div className="grid gap-1.5 w-full md:w-32">
                  <Label htmlFor="sCost" className="font-semibold text-slate-800 dark:text-slate-200">Costo ($)</Label>
                  <Input
                    id="sCost"
                    type="number"
                    value={newSupplyCost}
                    onChange={e => setNewSupplyCost(e.target.value)}
                    placeholder="0"
                    className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                  />
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                  {editingSupply && (
                    <Button variant="outline" onClick={handleCancelEdit} className="flex-1 md:flex-none cursor-pointer">
                      Cancelar
                    </Button>
                  )}
                  <Button onClick={handleSaveSupply} disabled={!newSupplyName || !newSupplyCost} className="flex-1 md:flex-none bg-sky-600 hover:bg-sky-500 text-white font-semibold cursor-pointer">
                    {editingSupply ? <Save className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                    {editingSupply ? "Actualizar" : "Agregar"}
                  </Button>
                </div>
              </div>

              {/* Desktop Table View */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden hidden md:block">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 dark:bg-slate-950/70 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3 font-semibold">Nombre</th>
                      <th className="p-3 font-semibold">Costo</th>
                      <th className="p-3 font-semibold">Estado</th>
                      <th className="p-3 font-semibold text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supplies.map(supply => (
                      <tr key={supply.id} className={`border-t border-slate-100 dark:border-slate-800/60 ${!supply.isActive ? 'bg-slate-50 dark:bg-slate-800/40 text-muted-foreground' : ''}`}>
                        <td className="p-3 font-medium text-slate-900 dark:text-slate-100">{supply.name}</td>
                        <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">${supply.cost}</td>
                        <td className="p-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${supply.isActive ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                            {supply.isActive ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        <td className="p-3 text-right flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleSupply(supply)}
                            title={supply.isActive ? "Desactivar" : "Activar"}
                            className={`h-8 w-8 p-0 cursor-pointer ${supply.isActive ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}
                          >
                            {supply.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleEditSupply(supply)} className="h-8 w-8 p-0 cursor-pointer text-slate-500 hover:text-slate-700 dark:hover:text-slate-200">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteSupply(supply.id)} className="text-red-600 dark:text-red-400 h-8 w-8 p-0 cursor-pointer">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {supplies.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-slate-400">No hay insumos cargados.</td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-slate-100 dark:bg-slate-800/80 font-bold text-slate-900 dark:text-slate-100 border-t border-slate-200 dark:border-slate-700">
                    <tr>
                      <td className="p-3.5">TOTAL GASTOS INSUMOS (Activos)</td>
                      <td className="p-3.5 text-lg font-extrabold text-sky-600 dark:text-sky-400">${totalSuppliesCost}</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── TAB 3: IDENTIDAD & LOGIN ── */}
      {isSuperAdmin && activeTab === "identidad" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-sky-500" /> Identidad de Marca y Pantalla de Login
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">
                Logotipos, nombres del sistema y personalización de la pantalla de inicio de sesión.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Site Name and Slogan */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="font-semibold text-slate-800 dark:text-slate-200">Nombre del Sitio / Complejo</Label>
                  <Input
                    value={siteConfig.siteName}
                    onChange={e => setSiteConfig(prev => ({ ...prev, siteName: e.target.value }))}
                    className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-slate-800 dark:text-slate-200">URL del Sitio Web</Label>
                  <Input
                    value={siteConfig.siteUrl}
                    onChange={e => setSiteConfig(prev => ({ ...prev, siteUrl: e.target.value }))}
                    className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold text-slate-800 dark:text-slate-200">Eslogan / Frase Principal</Label>
                <textarea
                  rows={2}
                  value={siteConfig.siteSlogan}
                  onChange={e => setSiteConfig(prev => ({ ...prev, siteSlogan: e.target.value }))}
                  className="w-full p-3 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <hr className="border-slate-200 dark:border-slate-800 my-4" />

              {/* Logo Pickers - each one has a Light Mode and Dark Mode variant */}
              {/* Helper: reusable logo picker pair */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
              {[
                {
                  title: "Logo Web / Navbar",
                  iconColor: "text-sky-500",
                  accentColor: "sky",
                  fieldLight: "logoUrl" as const,
                  fieldDark: "logoUrlDark" as const,
                  sizeField: "logoSize" as const,
                  sizeLabel: "Alto en Navbar",
                  sizeMin: 20,
                  sizeMax: 120,
                  sizeStep: 2,
                  defaultSize: "40",
                  sizeUnit: "px",
                  sizeDesc: "Alto en barra de navegación pública",
                  folder: "logos",
                  defaultLight: "Sin logo personalizado",
                  defaultDark: "Igual que el claro si no se configura",
                },
                {
                  title: "Logo Admin (Sidebar)",
                  iconColor: "text-teal-500",
                  accentColor: "teal",
                  fieldLight: "adminLogoUrl" as const,
                  fieldDark: "adminLogoUrlDark" as const,
                  sizeField: "adminLogoSize" as const,
                  sizeLabel: "Alto en Sidebar",
                  sizeMin: 24,
                  sizeMax: 120,
                  sizeStep: 2,
                  defaultSize: "46",
                  sizeUnit: "px",
                  sizeDesc: "Alto en menú lateral del panel",
                  folder: "logos",
                  defaultLight: "Default: Di'Arte Horizontal",
                  defaultDark: "Igual que el claro si no se configura",
                },
                {
                  title: "Logo Pantalla Login",
                  iconColor: "text-indigo-500",
                  accentColor: "indigo",
                  fieldLight: "loginLogoUrl" as const,
                  fieldDark: "loginLogoUrlDark" as const,
                  sizeField: "loginLogoSize" as const,
                  sizeLabel: "Ancho en Login",
                  sizeMin: 100,
                  sizeMax: 400,
                  sizeStep: 4,
                  defaultSize: "208",
                  sizeUnit: "px",
                  sizeDesc: "Ancho en tarjeta de inicio de sesión",
                  folder: "logos",
                  defaultLight: "Default: Di'Arte Vertical",
                  defaultDark: "Igual que el claro si no se configura",
                },
              ].map(({
                title,
                iconColor,
                fieldLight,
                fieldDark,
                sizeField,
                sizeLabel,
                sizeMin,
                sizeMax,
                sizeStep,
                defaultSize,
                sizeUnit,
                sizeDesc,
                folder,
                defaultLight,
                defaultDark,
              }) => {
                const currentVal = Number(siteConfig[sizeField]) || Number(defaultSize);

                return (
                  <div key={fieldLight} className="p-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-800/40 space-y-3 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className={`font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 text-xs uppercase tracking-wide`}>
                          <ImageIcon className={`w-4 h-4 ${iconColor}`} /> {title}
                        </Label>
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {currentVal}{sizeUnit}
                        </span>
                      </div>

                      {/* Light Mode Logo */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-300 border border-amber-400"></span>
                          Modo Claro
                        </div>
                        <div className="h-20 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white flex items-center justify-center overflow-hidden p-2">
                          {siteConfig[fieldLight] ? (
                            <img
                              src={siteConfig[fieldLight]}
                              alt={`${title} Claro`}
                              style={
                                sizeField === "loginLogoSize"
                                  ? { width: `${Math.min(currentVal * 0.45, 140)}px`, maxHeight: "100%" }
                                  : { height: `${Math.min(currentVal * 0.8, 64)}px`, maxWidth: "100%" }
                              }
                              className="object-contain transition-all duration-150"
                            />
                          ) : (
                            <span className="text-xs text-slate-400 text-center px-2">{defaultLight}</span>
                          )}
                        </div>
                        <div className="flex gap-1.5">
                          <Button size="sm" variant="outline" onClick={() => openPicker(fieldLight, folder)}
                            className="flex-1 text-xs cursor-pointer font-semibold h-7 px-2">
                            <FolderOpen className={`w-3 h-3 mr-1 ${iconColor}`} /> Galería
                          </Button>
                          <label className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold cursor-pointer h-7">
                            <Upload className="w-3 h-3" /> Subir
                            <input type="file" accept="image/*" onChange={e => handleDirectUpload(fieldLight, folder, e)} className="hidden" />
                          </label>
                          {siteConfig[fieldLight] && (
                            <button onClick={() => setSiteConfig(prev => ({ ...prev, [fieldLight]: "" }))}
                              className="h-7 w-7 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg border border-red-200 dark:border-red-900/60 cursor-pointer transition-colors" title="Quitar logo">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Dark Mode Logo */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          <span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-700 border border-slate-500"></span>
                          Modo Oscuro
                        </div>
                        <div className="h-20 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-950 flex items-center justify-center overflow-hidden p-2">
                          {siteConfig[fieldDark] ? (
                            <img
                              src={siteConfig[fieldDark]}
                              alt={`${title} Oscuro`}
                              style={
                                sizeField === "loginLogoSize"
                                  ? { width: `${Math.min(currentVal * 0.45, 140)}px`, maxHeight: "100%" }
                                  : { height: `${Math.min(currentVal * 0.8, 64)}px`, maxWidth: "100%" }
                              }
                              className="object-contain transition-all duration-150"
                            />
                          ) : (
                            <span className="text-xs text-slate-500 text-center px-2">{defaultDark}</span>
                          )}
                        </div>
                        <div className="flex gap-1.5">
                          <Button size="sm" variant="outline" onClick={() => openPicker(fieldDark, folder)}
                            className="flex-1 text-xs cursor-pointer font-semibold h-7 px-2 border-slate-700 text-slate-300">
                            <FolderOpen className="w-3 h-3 mr-1 text-slate-400" /> Galería
                          </Button>
                          <label className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-semibold cursor-pointer h-7">
                            <Upload className="w-3 h-3" /> Subir
                            <input type="file" accept="image/*" onChange={e => handleDirectUpload(fieldDark, folder, e)} className="hidden" />
                          </label>
                          {siteConfig[fieldDark] && (
                            <button onClick={() => setSiteConfig(prev => ({ ...prev, [fieldDark]: "" }))}
                              className="h-7 w-7 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg border border-red-200 dark:border-red-900/60 cursor-pointer transition-colors" title="Quitar logo oscuro">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Dimensiones / Control de Tamaño */}
                    <div className="pt-3 mt-1 border-t border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <Sliders className="w-3 h-3 text-slate-400" /> {sizeLabel}
                        </Label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={sizeMin}
                            max={sizeMax}
                            step={sizeStep}
                            value={siteConfig[sizeField] || defaultSize}
                            onChange={e => setSiteConfig(prev => ({ ...prev, [sizeField]: e.target.value }))}
                            className="w-14 h-6 text-center text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500"
                          />
                          <span className="text-[10px] text-slate-400 font-semibold">{sizeUnit}</span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min={sizeMin}
                        max={sizeMax}
                        step={sizeStep}
                        value={currentVal}
                        onChange={e => setSiteConfig(prev => ({ ...prev, [sizeField]: e.target.value }))}
                        className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
                      />
                      <div className="flex justify-between items-center text-[9px] text-slate-400">
                        <span>{sizeMin}{sizeUnit}</span>
                        <span className="text-[9px] text-slate-500 dark:text-slate-400 truncate max-w-[130px] text-center" title={sizeDesc}>{sizeDesc}</span>
                        <span>{sizeMax}{sizeUnit}</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Login Background (single — no dark variant) */}
              <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-800/40 space-y-3 flex flex-col justify-between">
                <div className="space-y-3">
                  <Label className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 text-xs uppercase tracking-wide">
                    <ImageIcon className="w-4 h-4 text-amber-500" /> Fondo Pantalla Login
                  </Label>
                  <div className="h-24 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden p-1">
                    {siteConfig.loginBgUrl ? (
                      <img src={siteConfig.loginBgUrl} alt="Fondo Login" className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <span className="text-xs text-slate-400">Default: Living room</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => openPicker("loginBgUrl", "general")}
                    className="flex-1 text-xs cursor-pointer font-semibold">
                    <FolderOpen className="w-3.5 h-3.5 mr-1 text-amber-500" /> Galería
                  </Button>
                  <label className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs">
                    <Upload className="w-3.5 h-3.5" /> Subir
                    <input type="file" accept="image/*" onChange={e => handleDirectUpload("loginBgUrl", "general", e)} className="hidden" />
                  </label>
                </div>
              </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
                <Button onClick={handleSaveSiteConfig} disabled={savingSiteConfig} className="bg-sky-600 hover:bg-sky-500 text-white font-bold cursor-pointer">
                  {savingSiteConfig ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Guardar Identidad
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── TAB 4: SLIDES DE PORTADA ── */}
      {isSuperAdmin && activeTab === "slides" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-indigo-500" /> Carrusel de Portada / Slides de Inicio
                </CardTitle>
                <CardDescription className="text-slate-500 dark:text-slate-400">
                  Agregá, ordená y personalizá las imágenes y mensajes que verán los huéspedes en la página principal.
                </CardDescription>
              </div>
              <Button onClick={handleAddSlide} className="bg-sky-600 hover:bg-sky-500 text-white font-semibold cursor-pointer shrink-0">
                <Plus className="mr-2 h-4 w-4" /> Agregar Nuevo Slide
              </Button>
            </CardHeader>

            <CardContent className="pb-4">
              {/* Slide Speed Control */}
              <div className="p-4 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/20 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    Velocidad del carrusel
                  </label>
                  <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 tabular-nums bg-indigo-100 dark:bg-indigo-900/60 px-3 py-1 rounded-full">
                    {(Number(siteConfig.heroSlideInterval) / 1000).toFixed(1)}s por slide
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 shrink-0">2s</span>
                  <input
                    type="range"
                    min={2000}
                    max={15000}
                    step={500}
                    value={Number(siteConfig.heroSlideInterval) || 6000}
                    onChange={e => setSiteConfig(prev => ({ ...prev, heroSlideInterval: e.target.value }))}
                    className="flex-1 h-2 rounded-full accent-indigo-500 cursor-pointer"
                  />
                  <span className="text-xs text-slate-500 shrink-0">15s</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {[2000, 4000, 6000, 8000, 10000, 12000].map(ms => (
                    <button
                      key={ms}
                      type="button"
                      onClick={() => setSiteConfig(prev => ({ ...prev, heroSlideInterval: String(ms) }))}
                      className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                        Number(siteConfig.heroSlideInterval) === ms
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400"
                      }`}
                    >
                      {ms / 1000}s
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Tiempo entre cambio automático de slides. Solo aplica si hay más de un slide y el usuario no está sobre la imagen.
                </p>
              </div>
            </CardContent>

            <CardContent className="space-y-6 pt-0">
              {heroSlidesList.map((slide, idx) => (
                <div
                  key={slide.id}
                  className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-4 shadow-xs"
                >
                  {/* Top Bar of Slide */}
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-950/80 px-3 py-1 rounded-full">
                      Slide #{idx + 1}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-slate-500 hover:text-slate-800 dark:hover:text-white"
                        disabled={idx === 0}
                        onClick={() => handleMoveSlide(idx, "up")}
                        title="Mover arriba"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-slate-500 hover:text-slate-800 dark:hover:text-white"
                        disabled={idx === heroSlidesList.length - 1}
                        onClick={() => handleMoveSlide(idx, "down")}
                        title="Mover abajo"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                        onClick={() => handleDeleteSlide(slide.id)}
                        title="Eliminar slide"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Image Field with Gallery Picker */}
                  <div className="space-y-2">
                    <Label className="font-semibold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wide">
                      Foto de Fondo del Slide
                    </Label>
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      <Input
                        value={slide.image}
                        onChange={e => handleUpdateSlide(slide.id, { image: e.target.value })}
                        placeholder="/uploads/slides/foto-slide.webp o URL externa"
                        className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 flex-1"
                      />
                      <div className="flex gap-2 w-full sm:w-auto">
                        <Button
                          variant="outline"
                          onClick={() => openPicker("slideImage", "slides", slide.id)}
                          className="flex-1 sm:flex-none text-xs font-semibold cursor-pointer border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40"
                        >
                          <FolderOpen className="w-3.5 h-3.5 mr-1.5 text-sky-500" />
                          Elegir de Galería
                        </Button>
                        <label className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs">
                          <Upload className="w-3.5 h-3.5" /> Subir
                          <input
                            type="file"
                            accept="image/*"
                            onChange={e => handleSlideImageUpload(slide.id, e)}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                    {/* Thumbnail preview */}
                    {slide.image && (
                      <div className="relative h-28 max-w-sm rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 mt-2">
                        <img src={slide.image} alt={slide.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>

                  {/* Title & Subtitle */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="font-semibold text-slate-800 dark:text-slate-200 text-xs">Título Principal</Label>
                      <Input
                        value={slide.title}
                        onChange={e => handleUpdateSlide(slide.id, { title: e.target.value })}
                        className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="font-semibold text-slate-800 dark:text-slate-200 text-xs">Subtítulo / Texto Descriptivo</Label>
                      <Input
                        value={slide.subtitle}
                        onChange={e => handleUpdateSlide(slide.id, { subtitle: e.target.value })}
                        className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                      />
                    </div>
                  </div>

                  {/* Optional Button */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div className="space-y-1">
                      <Label className="font-semibold text-slate-800 dark:text-slate-200 text-xs">Texto del Botón (Opcional)</Label>
                      <Input
                        value={slide.buttonText || ""}
                        onChange={e => handleUpdateSlide(slide.id, { buttonText: e.target.value })}
                        placeholder="Ej: Ver Departamentos"
                        className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="font-semibold text-slate-800 dark:text-slate-200 text-xs">Enlace del Botón (Opcional)</Label>
                      <Input
                        value={slide.buttonLink || ""}
                        onChange={e => handleUpdateSlide(slide.id, { buttonLink: e.target.value })}
                        placeholder="Ej: #departments o /contacto"
                        className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
                <Button onClick={handleSaveSiteConfig} disabled={savingSiteConfig} className="bg-sky-600 hover:bg-sky-500 text-white font-bold cursor-pointer">
                  {savingSiteConfig ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Guardar Slides
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── TAB 5: CONTACTO & UBICACIÓN ── */}
      {isSuperAdmin && activeTab === "contacto" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Phones & Social */}
          <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <PhoneCall className="w-5 h-5 text-emerald-500" /> Teléfonos, WhatsApp y Redes Sociales
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">
                Canales de contacto directo para consultas y reservas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="font-semibold text-slate-800 dark:text-slate-200">Teléfono Visible</Label>
                  <Input
                    value={siteConfig.phoneDisplay}
                    onChange={e => setSiteConfig(prev => ({ ...prev, phoneDisplay: e.target.value }))}
                    className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-slate-800 dark:text-slate-200">WhatsApp (Solo Números)</Label>
                  <Input
                    value={siteConfig.phoneWhatsApp}
                    onChange={e => setSiteConfig(prev => ({ ...prev, phoneWhatsApp: e.target.value }))}
                    placeholder="5493513146924"
                    className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-slate-800 dark:text-slate-200">Email de Contacto</Label>
                  <Input
                    value={siteConfig.email}
                    onChange={e => setSiteConfig(prev => ({ ...prev, email: e.target.value }))}
                    className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold text-slate-800 dark:text-slate-200">Mensaje por Defecto de WhatsApp</Label>
                <Input
                  value={siteConfig.whatsappDefaultMsg}
                  onChange={e => setSiteConfig(prev => ({ ...prev, whatsappDefaultMsg: e.target.value }))}
                  className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <Label className="font-semibold text-slate-800 dark:text-slate-200">Instagram URL</Label>
                  <Input
                    value={siteConfig.instagramUrl}
                    onChange={e => setSiteConfig(prev => ({ ...prev, instagramUrl: e.target.value }))}
                    placeholder="https://www.instagram.com/..."
                    className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-slate-800 dark:text-slate-200">Facebook URL</Label>
                  <Input
                    value={siteConfig.facebookUrl}
                    onChange={e => setSiteConfig(prev => ({ ...prev, facebookUrl: e.target.value }))}
                    placeholder="https://www.facebook.com/..."
                    className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location & Maps */}
          <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-red-500" /> Ubicación y Google Maps
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">
                Dirección física e integración con mapas interactivos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="font-semibold text-slate-800 dark:text-slate-200">Dirección</Label>
                  <Input
                    value={siteConfig.address}
                    onChange={e => setSiteConfig(prev => ({ ...prev, address: e.target.value }))}
                    className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-slate-800 dark:text-slate-200">Ciudad</Label>
                  <Input
                    value={siteConfig.city}
                    onChange={e => setSiteConfig(prev => ({ ...prev, city: e.target.value }))}
                    className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-slate-800 dark:text-slate-200">Provincia / País</Label>
                  <Input
                    value={`${siteConfig.province}, ${siteConfig.country}`}
                    onChange={e => {
                      const parts = e.target.value.split(",");
                      setSiteConfig(prev => ({
                        ...prev,
                        province: parts[0]?.trim() || "",
                        country: parts[1]?.trim() || "Argentina",
                      }));
                    }}
                    className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold text-slate-800 dark:text-slate-200">Google Maps Embed URL</Label>
                <Input
                  value={siteConfig.googleMapsEmbedUrl}
                  onChange={e => setSiteConfig(prev => ({ ...prev, googleMapsEmbedUrl: e.target.value }))}
                  className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-mono text-xs"
                />
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
                <Button onClick={handleSaveSiteConfig} disabled={savingSiteConfig} className="bg-sky-600 hover:bg-sky-500 text-white font-bold cursor-pointer">
                  {savingSiteConfig ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Guardar Contacto y Ubicación
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── TAB 6: CORREO SMTP ── */}
      {isSuperAdmin && activeTab === "smtp" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Mail className="w-5 h-5 text-violet-500" /> Servidor de Correo SMTP
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">
                Credenciales para el envío de notificaciones por email de reservas y contacto.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="font-semibold text-slate-800 dark:text-slate-200">Servidor SMTP (Host)</Label>
                  <Input
                    value={siteConfig.smtpHost}
                    onChange={e => setSiteConfig(prev => ({ ...prev, smtpHost: e.target.value }))}
                    placeholder="smtp.hostinger.com"
                    className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-slate-800 dark:text-slate-200">Puerto SMTP</Label>
                  <Input
                    type="number"
                    value={siteConfig.smtpPort}
                    onChange={e => setSiteConfig(prev => ({ ...prev, smtpPort: e.target.value }))}
                    placeholder="465"
                    className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-slate-800 dark:text-slate-200">Nombre del Remitente</Label>
                  <Input
                    value={siteConfig.smtpFromName}
                    onChange={e => setSiteConfig(prev => ({ ...prev, smtpFromName: e.target.value }))}
                    placeholder="Alojamientos Di'Arte"
                    className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="font-semibold text-slate-800 dark:text-slate-200">Usuario / Email SMTP</Label>
                  <Input
                    type="email"
                    value={siteConfig.smtpUser}
                    onChange={e => setSiteConfig(prev => ({ ...prev, smtpUser: e.target.value }))}
                    placeholder="contacto@alojamientosdiarte.com"
                    className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-slate-800 dark:text-slate-200">Contraseña SMTP</Label>
                  <Input
                    type="password"
                    value={siteConfig.smtpPassword}
                    onChange={e => setSiteConfig(prev => ({ ...prev, smtpPassword: e.target.value }))}
                    placeholder="••••••••••••"
                    className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-mono"
                  />
                </div>
              </div>

              {/* SMTP Live Test Box */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3 mt-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h5 className="font-bold text-sm text-slate-900 dark:text-slate-100">Prueba de Envío en Vivo</h5>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Envía un correo de prueba a <strong>{siteConfig.email || siteConfig.smtpUser}</strong> para verificar la conexión.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTestSmtp}
                    disabled={testingSmtp || !siteConfig.smtpHost || !siteConfig.smtpUser}
                    className="font-semibold cursor-pointer border-slate-300 dark:border-slate-700"
                  >
                    {testingSmtp ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Send className="w-3.5 h-3.5 mr-1.5 text-sky-500" />}
                    {testingSmtp ? "Probando..." : "Enviar Correo de Prueba"}
                  </Button>
                </div>

                {smtpTestResult && (
                  <div
                    className={`p-3 rounded-lg text-xs font-semibold ${
                      smtpTestResult.success
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900"
                        : "bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-900"
                    }`}
                  >
                    {smtpTestResult.success ? "✅ " : "❌ "}
                    {smtpTestResult.message}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
                <Button onClick={handleSaveSiteConfig} disabled={savingSiteConfig} className="bg-sky-600 hover:bg-sky-500 text-white font-bold cursor-pointer">
                  {savingSiteConfig ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Guardar Configuración SMTP
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
