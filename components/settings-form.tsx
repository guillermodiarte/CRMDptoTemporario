"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { Loader2, Save, Download, Upload } from "lucide-react";


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
import { CheckCircle2, AlertCircle, Plus, Trash2, Pencil, Power, PowerOff } from "lucide-react";

export function SettingsForm() {
  const { data: session } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Settings State
  const [startYear, setStartYear] = useState<string>("2026");
  const [endYear, setEndYear] = useState<string>("2036");

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [settingsRes, suppliesRes] = await Promise.all([
          fetch("/api/settings"),
          fetch("/api/supplies")
        ]);

        if (settingsRes.ok) {
          const data = await settingsRes.json();
          setStartYear(String(data.startYear || 2026));
          setEndYear(String(data.endYear || 2036));
        }

        if (suppliesRes.ok) {
          const data = await suppliesRes.json();
          setSupplies(data.supplies || []);
        }
      } catch (error) {
        console.error("Failed to fetch data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSaveSettings = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    const start = parseInt(startYear);
    const end = parseInt(endYear);

    if (isNaN(start) || isNaN(end) || start < 2020 || end > 2100 || end < start) {
      setError("Años inválidos. Deben ser números entre 2020 y 2100, y fin >= inicio.");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startYear,
          endYear
        }),
      });

      if (!res.ok) throw new Error("Failed");
      setSuccess("Configuración de calendario guardada.");
      router.refresh();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError("Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSupply = async () => {
    if (!newSupplyName || !newSupplyCost) return;

    if (editingSupply) {
      // Update existing
      try {
        const res = await fetch("/api/supplies", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingSupply.id,
            name: newSupplyName,
            cost: newSupplyCost,
            isActive: editingSupply.isActive
          })
        });

        if (res.ok) {
          const updatedSupply = await res.json();
          setSupplies(supplies.map(s => s.id === updatedSupply.id ? updatedSupply : s));
          handleCancelEdit();
          setSuccess("Insumo actualizado.");
          setTimeout(() => setSuccess(null), 3000);
        }
      } catch {
        setError("Error al actualizar insumo.");
      }
    } else {
      // Create new
      try {
        const res = await fetch("/api/supplies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newSupplyName, cost: newSupplyCost })
        });
        if (res.ok) {
          const newSupply = await res.json();
          setSupplies([newSupply, ...supplies]);
          setNewSupplyName("");
          setNewSupplyCost("");
          setSuccess("Insumo agregado.");
          setTimeout(() => setSuccess(null), 3000);
        }
      } catch {
        setError("Error al agregar insumo.");
      }
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

  const handleToggleSupply = async (supply: any) => {
    try {
      const res = await fetch("/api/supplies", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: supply.id,
          name: supply.name,
          cost: supply.cost,
          isActive: !supply.isActive
        })
      });

      if (res.ok) {
        const updatedSupply = await res.json();
        setSupplies(supplies.map(s => s.id === updatedSupply.id ? updatedSupply : s));
        setSuccess(updatedSupply.isActive ? "Insumo activado." : "Insumo desactivado.");
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch {
      setError("Error al cambiar estado.");
    }
  };

  const handleDeleteSupply = (id: string) => {
    setSupplyToDelete(id);
  };

  const confirmDeleteSupply = async () => {
    if (!supplyToDelete) return;
    try {
      await fetch(`/api/supplies?id=${supplyToDelete}`, { method: "DELETE" });
      setSupplies(supplies.filter(s => s.id !== supplyToDelete));
      setSuccess("Insumo eliminado.");
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError("Error al eliminar.");
    } finally {
      setSupplyToDelete(null);
    }
  };

  // Calculate Total Active Supplies
  const totalSuppliesCost = supplies.filter(s => s.isActive).reduce((acc, curr) => acc + curr.cost, 0);

  // Backup Handlers
  const handleExport = async () => {
    setLoadingBackup(true);
    try {
      const res = await fetch("/api/backup");
      if (!res.ok) throw new Error("Export failed");
      const data = await res.json();

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setSuccess("Backup descargado correctamente.");
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      console.error(e);
      setError("Error al exportar backup.");
    } finally {
      setLoadingBackup(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!json.data || !json.timestamp) throw new Error("Invalid format");
        setBackupContent(json);
        setBackupToRestore(file);
      } catch (e) {
        setError("Archivo inválido.");
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  const confirmRestore = async () => {
    if (!backupContent) return;
    setLoadingBackup(true);
    try {
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(backupContent)
      });

      if (!res.ok) throw new Error("Import failed");

      setSuccess("Sistema restaurado correctamente. Recargando...");
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (e) {
      console.error(e);
      setError("Error crítico al restaurar.");
      setLoadingBackup(false);
      setBackupToRestore(null);
    }
  };

  if (loading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground">Administra los valores del sistema y los insumos globales.</p>
      </div>

      {success && (
        <Alert className="border-green-500 bg-green-50 text-green-900">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Éxito</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Supplies Section */}
      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle>Gastos de Insumos</CardTitle>
          <CardDescription>Gestión de insumos globales (se suman automáticamente a nuevas reservas).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          <div className="flex gap-4 items-end bg-slate-50 p-4 rounded-md border">
            <div className="grid gap-1.5 flex-1">
              <Label htmlFor="sName">{editingSupply ? "Editar Nombre" : "Nombre del Insumo"}</Label>
              <Input id="sName" value={newSupplyName} onChange={e => setNewSupplyName(e.target.value)} placeholder="Ej: Papel Higiénico" />
            </div>
            <div className="grid gap-1.5 w-32">
              <Label htmlFor="sCost">Costo ($)</Label>
              <Input id="sCost" type="number" value={newSupplyCost} onChange={e => setNewSupplyCost(e.target.value)} placeholder="0" />
            </div>

            <div className="flex gap-2">
              {editingSupply && (
                <Button variant="outline" onClick={handleCancelEdit}>
                  Cancelar
                </Button>
              )}
              <Button onClick={handleSaveSupply} disabled={!newSupplyName || !newSupplyCost}>
                {editingSupply ? <Save className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                {editingSupply ? "Actualizar" : "Agregar"}
              </Button>
            </div>
          </div>

          <div className="border rounded-md">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-3 font-medium">Nombre</th>
                  <th className="p-3 font-medium">Costo</th>
                  <th className="p-3 font-medium">Estado</th>
                  <th className="p-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {supplies.map(supply => (
                  <tr key={supply.id} className={`border-t ${!supply.isActive ? 'bg-slate-50 text-muted-foreground' : ''}`}>
                    <td className="p-3">{supply.name}</td>
                    <td className="p-3 font-medium">${supply.cost}</td>
                    <td className="p-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${supply.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                        {supply.isActive ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="p-3 text-right flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleSupply(supply)}
                        title={supply.isActive ? "Desactivar" : "Activar"}
                        className={`h-8 w-8 p-0 ${supply.isActive ? 'text-amber-600' : 'text-green-600'}`}
                      >
                        {supply.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEditSupply(supply)} className="h-8 w-8 p-0">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteSupply(supply.id)} className="text-red-600 h-8 w-8 p-0">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {supplies.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-muted-foreground">No hay insumos cargados.</td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-slate-100 font-semibold">
                <tr>
                  <td className="p-3">TOTAL GASTOS INSUMOS (Activos)</td>
                  <td className="p-3 text-lg">${totalSuppliesCost}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Settings */}
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Configuración de Calendario</CardTitle>
          <CardDescription>Rango de años visible en el sistema.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="startYear">Año Inicio</Label>
              <Input id="startYear" type="number" value={startYear} onChange={(e) => setStartYear(e.target.value)} />
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="endYear">Año Fin</Label>
              <Input id="endYear" type="number" value={endYear} onChange={(e) => setEndYear(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveSettings} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Guardar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Backup Section */}
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Copia de Seguridad</CardTitle>
          <CardDescription>Exporta o importa la base de datos completa.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              La exportación descarga un archivo JSON con todos los datos.
            </p>
            <Button variant="outline" onClick={handleExport} disabled={loadingBackup}>
              {loadingBackup ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Exportar Todo
            </Button>
          </div>

          <hr />

          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              La importación <strong>BORRARÁ TODOS</strong> los datos actuales y los reemplazará por los del archivo.
            </p>
            <div className="flex gap-2">
              <input
                type="file"
                accept=".json"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
              />
              <Button variant="outline" className="w-full text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => fileInputRef.current?.click()} disabled={loadingBackup}>
                {loadingBackup ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Importar Respaldo
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!supplyToDelete} onOpenChange={(open) => !open && setSupplyToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el insumo permanentemente. No afectará a las reservas pasadas que ya tienen guardado su costo histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 font-bold" onClick={confirmDeleteSupply}>
              Sí, Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!backupToRestore} onOpenChange={(open) => !open && setBackupToRestore(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 font-bold">⚠️ PELIGRO: Restauración Destructiva</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción <strong>ELIMINARÁ TODOS LOS DATOS ACTUALES</strong> de la base de datos (Reservas, Departamentos, Usuarios, etc.) y los reemplazará por los del archivo seleccionado.
              <br /><br />
              <strong>Archivo:</strong> {backupToRestore?.name}
              <br /><br />
              Esta acción no se puede deshacer. ¿Está completamente seguro?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 font-bold"
              onClick={confirmRestore}
            >
              {loadingBackup ? "Restaurando..." : "Sí, Reemplazar Todo"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
