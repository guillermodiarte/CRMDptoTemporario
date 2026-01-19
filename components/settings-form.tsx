"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";


import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle } from "lucide-react";

export function SettingsForm() {
  const { data: session } = useSession();
  const router = useRouter();

  const [cleaningFee, setCleaningFee] = useState<string>("5000");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Role check handled by Server Component


  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          setCleaningFee(String(data.value));
        }
      } catch (error) {
        console.error("Failed to fetch settings", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: parseFloat(cleaningFee) }),
      });

      if (!res.ok) throw new Error("Failed to save");

      setSuccess("Configuración guardada correctamente");
      setError(null);
      router.refresh();

      // Auto-dismiss
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      setError("Error al guardar la configuración");
      setSuccess(null);
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading" || loading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }



  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground">Administra los valores por defecto del sistema.</p>
      </div>



      {
        success && (
          <Alert className="border-green-500 bg-green-50 text-green-900">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Éxito</AlertTitle>
            <AlertDescription>
              {success}
            </AlertDescription>
          </Alert>
        )
      }

      {
        error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        )
      }

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Gastos de Limpieza</CardTitle>
          <CardDescription>
            Define el valor por defecto que se asignará automáticamente a las nuevas reservas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="cleaningFee">Gasto de limpieza por reserva (ARS)</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">$</span>
              <Input
                id="cleaningFee"
                type="number"
                value={cleaningFee}
                onChange={(e) => setCleaningFee(e.target.value)}
                placeholder="5000"
              />
            </div>
            <p className="text-[0.8rem] text-muted-foreground">
              Este valor será sugerido al crear una nueva reserva, pero podrás modificarlo manualmente en cada caso.
            </p>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {!saving && <Save className="mr-2 h-4 w-4" />}
              Guardar Cambios
            </Button>
          </div>
        </CardContent>
      </Card>
    </div >
  );
}
