"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Plus, Upload, CheckCircle2, AlertCircle, Database, FolderOpen } from "lucide-react";

type Mode = "idle" | "create" | "import";

export function InitialSetupClient() {
  const [mode, setMode] = useState<Mode>("idle");
  const [sessionName, setSessionName] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionName.trim()) return;
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch("/api/setup/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: sessionName.trim() }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setStatus({ type: "success", message: "¡Sesión creada! Recargando..." });
        // Hard reload so the server re-reads DB and the JWT session refreshes
        setTimeout(() => { window.location.href = "/select-session"; }, 1200);
      } else {
        setStatus({ type: "error", message: json.error || "Error al crear la sesión" });
      }
    } catch {
      setStatus({ type: "error", message: "Error de red. Intenta de nuevo." });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;
    setLoading(true);
    setStatus(null);
    try {
      const text = await selectedFile.text();
      const backup = JSON.parse(text);

      const res = await fetch("/api/setup/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(backup),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setStatus({
          type: "success",
          message: "¡Base de datos restaurada! Cerrando sesión para que inicies con tus credenciales de producción...",
        });
        // Sign out and redirect to login — the import replaced all users in the DB,
        // so the current JWT token points to a user that no longer exists.
        // The user must log in again with their production credentials.
        setTimeout(() => { window.location.href = "/api/auth/signout?callbackUrl=/admin"; }, 2500);
      } else {
        setStatus({ type: "error", message: json.error || "Error al restaurar la base de datos" });
      }
    } catch (err) {
      setStatus({ type: "error", message: "El archivo no es un backup válido (JSON inválido)" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-4">
              <Database className="h-10 w-10 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Configuración inicial</h1>
          <p className="text-muted-foreground">
            La base de datos está vacía. Elegí cómo querés empezar.
          </p>
        </div>

        {/* Status message */}
        {status && (
          <div
            className={`flex items-center gap-3 rounded-lg border p-4 text-sm ${
              status.type === "success"
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {status.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            {status.message}
          </div>
        )}

        {/* Option A: Create session */}
        <Card className={mode === "create" ? "ring-2 ring-primary" : ""}>
          <CardHeader
            className="cursor-pointer select-none"
            onClick={() => setMode(mode === "create" ? "idle" : "create")}
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Plus className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Crear primera sesión</CardTitle>
                <CardDescription>
                  Arrancá desde cero con una sesión nueva y vacía
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          {mode === "create" && (
            <CardContent>
              <form onSubmit={handleCreateSession} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="session-name">Nombre de la sesión</Label>
                  <Input
                    id="session-name"
                    placeholder="Ej: Alojamientos DiArte 2026"
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                    disabled={loading}
                    autoFocus
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading || !sessionName.trim()}>
                  {loading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creando sesión...</>
                  ) : (
                    <><Plus className="mr-2 h-4 w-4" /> Crear sesión</>
                  )}
                </Button>
              </form>
            </CardContent>
          )}
        </Card>

        {/* Option B: Import backup */}
        <Card className={mode === "import" ? "ring-2 ring-primary" : ""}>
          <CardHeader
            className="cursor-pointer select-none"
            onClick={() => setMode(mode === "import" ? "idle" : "import")}
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-orange-500/10 p-2">
                <Upload className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <CardTitle className="text-base">Importar base de datos</CardTitle>
                <CardDescription>
                  Restaurá un backup existente (.json) con todos tus datos
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          {mode === "import" && (
            <CardContent>
              <form onSubmit={handleImport} className="space-y-4">
                <div className="space-y-2">
                  <Label>Archivo de backup (.json)</Label>
                  <div
                    className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 p-8 text-center transition-colors hover:border-primary/50 hover:bg-muted/50"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {selectedFile ? (
                      <div className="space-y-1">
                        <CheckCircle2 className="mx-auto h-8 w-8 text-green-500" />
                        <p className="text-sm font-medium">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(selectedFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <FolderOpen className="mx-auto h-8 w-8 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Hacé click para seleccionar el archivo
                        </p>
                        <p className="text-xs text-muted-foreground">Solo archivos .json</p>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </div>
                </div>
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                  ⚠️ Esto <strong>reemplazará toda la base de datos</strong>. Solo usalo para inicializar el sistema en un servidor nuevo.
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  variant="outline"
                  disabled={loading || !selectedFile}
                >
                  {loading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Restaurando...</>
                  ) : (
                    <><Upload className="mr-2 h-4 w-4" /> Restaurar base de datos</>
                  )}
                </Button>
              </form>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
