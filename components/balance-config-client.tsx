"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Check, X, Star, ArrowLeft, Percent, Sparkles, AlertCircle, ShieldCheck, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function Switch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-indigo-600 dark:bg-indigo-500" : "bg-slate-200 dark:bg-slate-700"
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );
}

interface Receiver {
  id: string;
  name: string;
  accountInfo?: string | null;
  isDefault: boolean;
  order: number;
  profitSharePercent?: number;
}

interface BalanceConfigClientProps {
  receivers: Receiver[];
  enabledUsers: string[];
  allUsers: { id: string; email: string; name?: string | null }[];
  isSuperAdmin: boolean;
  initialCleaningExpenseEnabled?: boolean;
  initialManualTransfersEditEnabled?: boolean;
}

export function BalanceConfigClient({
  receivers: initialReceivers,
  enabledUsers: initialEnabledUsers,
  allUsers,
  isSuperAdmin,
  initialCleaningExpenseEnabled = false,
  initialManualTransfersEditEnabled = false,
}: BalanceConfigClientProps) {
  const router = useRouter();
  const [receivers, setReceivers] = useState<Receiver[]>(initialReceivers);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newForm, setNewForm] = useState({ name: "", accountInfo: "", isDefault: false, profitSharePercent: 0 });
  const [editForm, setEditForm] = useState({ name: "", accountInfo: "", isDefault: false, profitSharePercent: 0 });
  const [showNewForm, setShowNewForm] = useState(false);
  const [enabledUsers, setEnabledUsers] = useState<string[]>(initialEnabledUsers);

  // Cleaning expense toggle state
  const [cleaningEnabled, setCleaningEnabled] = useState(initialCleaningExpenseEnabled);
  const [savingCleaning, setSavingCleaning] = useState(false);

  // Manual transfers edit toggle state
  const [manualTransfersEditEnabled, setManualTransfersEditEnabled] = useState(initialManualTransfersEditEnabled);
  const [savingManualTransfers, setSavingManualTransfers] = useState(false);

  const totalPercent = receivers.reduce((sum, r) => sum + (r.profitSharePercent || 0), 0);

  const handleCreate = async () => {
    if (!newForm.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/payment-receivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newForm,
          profitSharePercent: Number(newForm.profitSharePercent) || 0,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setReceivers((prev) => {
          const updated = newForm.isDefault ? prev.map((r) => ({ ...r, isDefault: false })) : prev;
          return [...updated, created];
        });
        setNewForm({ name: "", accountInfo: "", isDefault: false, profitSharePercent: 0 });
        setShowNewForm(false);
        toast.success("Receptor creado correctamente");
      } else {
        toast.error("Error al crear receptor");
      }
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (r: Receiver) => {
    setEditingId(r.id);
    setEditForm({
      name: r.name,
      accountInfo: r.accountInfo || "",
      isDefault: r.isDefault,
      profitSharePercent: r.profitSharePercent || 0,
    });
  };

  const handleUpdate = async (id: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/payment-receivers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editForm,
          profitSharePercent: Number(editForm.profitSharePercent) || 0,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setReceivers((prev) => {
          const list = editForm.isDefault ? prev.map((r) => ({ ...r, isDefault: false })) : prev;
          return list.map((r) => (r.id === id ? updated : r));
        });
        setEditingId(null);
        toast.success("Receptor actualizado");
      } else {
        toast.error("Error al actualizar receptor");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este receptor?")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/payment-receivers/${id}`, { method: "DELETE" });
      if (res.ok) {
        setReceivers((prev) => prev.filter((r) => r.id !== id));
        toast.success("Receptor eliminado");
      } else {
        toast.error("Error al eliminar receptor");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/payment-receivers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      if (res.ok) {
        setReceivers((prev) => prev.map((r) => ({ ...r, isDefault: r.id === id })));
        toast.success("Receptor por defecto establecido");
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleManualTransfersEdit = async () => {
    const nextVal = !manualTransfersEditEnabled;
    setSavingManualTransfers(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "MANUAL_TRANSFERS_EDIT_ENABLED",
          value: String(nextVal),
        }),
      });
      if (res.ok) {
        setManualTransfersEditEnabled(nextVal);
        toast.success(
          nextVal
            ? "Edición manual de transferencias ACTIVADA"
            : "Edición manual de transferencias DESACTIVADA"
        );
        router.refresh();
      } else {
        toast.error("Error al guardar configuración");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSavingManualTransfers(false);
    }
  };

  const toggleCleaningExpense = async () => {
    const nextVal = !cleaningEnabled;
    setSavingCleaning(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "CLEANING_EXPENSE_IN_BALANCE",
          value: String(nextVal),
        }),
      });
      if (res.ok) {
        setCleaningEnabled(nextVal);
        toast.success(
          nextVal
            ? "Gastos de limpieza ACTIVADOS en Balance"
            : "Gastos de limpieza DESACTIVADOS en Balance"
        );
        router.refresh();
      } else {
        toast.error("Error al guardar configuración de limpieza");
      }
    } catch {
      toast.error("Error al conectar con el servidor");
    } finally {
      setSavingCleaning(false);
    }
  };

  const toggleEnabledUser = async (email: string) => {
    const newList = enabledUsers.includes(email)
      ? enabledUsers.filter((e) => e !== email)
      : [...enabledUsers, email];
    setEnabledUsers(newList);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "BALANCE_ENABLED_USERS", value: JSON.stringify(newList) }),
    });
    router.refresh();
  };

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Top Bar with Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div>
          <Link
            href="/dashboard/balance"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors mb-1.5 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" /> Volver al Balance
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Configuración de Balance</h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
            Gestiona los socios y cuentas de cobro, distribución de porcentajes y parámetros de cálculo.
          </p>
        </div>

        {isSuperAdmin && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border bg-slate-50 dark:bg-slate-900 text-xs font-medium text-slate-600 dark:text-slate-300 self-start sm:self-auto">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Acceso SuperAdmin
          </div>
        )}
      </div>

      {/* SECTION 1: Calculation Options (2 Columns on top) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Edición Manual de Transferencias */}
        <div className="rounded-2xl border bg-white dark:bg-slate-900 shadow-xs p-5 flex flex-col justify-between gap-3 transition-all hover:border-slate-300 dark:hover:border-slate-700">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shrink-0">
                <Pencil className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold leading-tight">Edición Manual de Transferencias</h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">Fijar fecha de corte y montos manuales</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span
                className={cn(
                  "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                  manualTransfersEditEnabled
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                )}
              >
                {manualTransfersEditEnabled ? "Activado" : "Desactivado"}
              </span>
              <Switch
                checked={manualTransfersEditEnabled}
                onChange={toggleManualTransfersEdit}
                disabled={savingManualTransfers}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Habilita el botón de edición en Balance para ingresar montos manuales por receptor. Las transferencias pasadas del mes se absorben y solo se suman automáticamente las transferencias posteriores. El remanente de ingresos va a efectivo.
          </p>
        </div>

        {/* Card 2: Gastos de Limpieza en Balance */}
        <div className="rounded-2xl border bg-white dark:bg-slate-900 shadow-xs p-5 flex flex-col justify-between gap-3 transition-all hover:border-slate-300 dark:hover:border-slate-700">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold leading-tight">Gastos de Limpieza en Balance</h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">Cómputo en el reparto neto entre socios</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span
                className={cn(
                  "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                  cleaningEnabled
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                )}
              >
                {cleaningEnabled ? "Activado" : "Desactivado"}
              </span>
              <Switch
                checked={cleaningEnabled}
                onChange={toggleCleaningExpense}
                disabled={savingCleaning}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Al activar esta opción, los costos de limpieza de cada reserva se descontarán como gastos reales del período en la liquidación de socios. Al desactivar, solo se muestran como referencia operativa.
          </p>
        </div>
      </div>

      {/* SECTION 2: Management Grid (Socios on Left, User Access on Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Receivers and Profit Split */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          {/* Receivers Card */}
          <div className="rounded-2xl border bg-white dark:bg-slate-900 shadow-xs p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">Socios y Receptores de Pago</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Cuentas bancarias donde ingresan transferencias y a las que se les imputan gastos y porcentaje de ganancias.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewForm((v) => !v)}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="h-4 w-4" /> Agregar Socio
              </button>
            </div>

            {/* Profit Share Summary Alert */}
            {receivers.length > 0 && (
              <div
                className={`p-3.5 rounded-xl text-xs flex items-center justify-between gap-2 border ${
                  totalPercent === 100
                    ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                    : totalPercent === 0
                    ? "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300"
                    : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Percent className="h-4 w-4 shrink-0" />
                  <span>
                    {totalPercent === 100
                      ? "Distribución equilibrada: 100% asignado entre los socios."
                      : totalPercent === 0
                      ? "Porcentajes en 0%: La ganancia neta se dividirá en partes iguales entre los socios."
                      : `Suma actual de porcentajes: ${totalPercent}%. Para un balance exacto, la suma debe dar 100%.`}
                  </span>
                </div>
                <span className="font-bold shrink-0">{totalPercent}% total</span>
              </div>
            )}

            {/* New Receiver Form */}
            {showNewForm && (
              <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-950/20 p-4 space-y-3">
                <p className="text-sm font-bold text-indigo-900 dark:text-indigo-200">Nuevo Socio / Receptor</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Nombre del Socio / Titular *</label>
                    <input
                      className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                      placeholder="Ej: Guillermo Diarte"
                      value={newForm.name}
                      onChange={(e) => setNewForm((v) => ({ ...v, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Cuenta / CBU / Alias (opcional)</label>
                    <input
                      className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Ej: guillermo.mp o CBU 123..."
                      value={newForm.accountInfo}
                      onChange={(e) => setNewForm((v) => ({ ...v, accountInfo: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center pt-1">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">% Ganancia que le corresponde</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold pr-8"
                        placeholder="50"
                        value={newForm.profitSharePercent || ""}
                        onChange={(e) => setNewForm((v) => ({ ...v, profitSharePercent: Number(e.target.value) || 0 }))}
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-muted-foreground font-bold">%</span>
                    </div>
                  </div>

                  <div className="pt-5">
                    <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                      <input
                        type="checkbox"
                        className="rounded h-4 w-4 text-indigo-600 cursor-pointer"
                        checked={newForm.isDefault}
                        onChange={(e) => setNewForm((v) => ({ ...v, isDefault: e.target.checked }))}
                      />
                      <span className="text-xs font-medium">Receptor por defecto para señas</span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewForm(false);
                      setNewForm({ name: "", accountInfo: "", isDefault: false, profitSharePercent: 0 });
                    }}
                    className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={saving || !newForm.name.trim()}
                    className="px-4 py-1.5 text-sm font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {saving ? "Guardando..." : "Guardar Socio"}
                  </button>
                </div>
              </div>
            )}

            {/* Receivers List */}
            <div className="space-y-3">
              {receivers.length === 0 && !showNewForm && (
                <div className="text-sm text-muted-foreground py-8 text-center border-2 border-dashed rounded-xl">
                  No hay socios/receptores registrados aún. Agregá el primero para comenzar a dividir ingresos y gastos.
                </div>
              )}

              {receivers.map((recv) => (
                <div
                  key={recv.id}
                  className="rounded-xl border bg-white dark:bg-slate-900 p-4 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                >
                  {editingId === recv.id ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">Nombre</label>
                          <input
                            className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                            value={editForm.name}
                            onChange={(e) => setEditForm((v) => ({ ...v, name: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">Cuenta / Alias</label>
                          <input
                            className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            value={editForm.accountInfo}
                            onChange={(e) => setEditForm((v) => ({ ...v, accountInfo: e.target.value }))}
                            placeholder="Cuenta / CBU / Alias"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">% Ganancia Asignado</label>
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold pr-8"
                              value={editForm.profitSharePercent || ""}
                              onChange={(e) => setEditForm((v) => ({ ...v, profitSharePercent: Number(e.target.value) || 0 }))}
                            />
                            <span className="absolute right-3 top-2.5 text-xs text-muted-foreground font-bold">%</span>
                          </div>
                        </div>

                        <div className="pt-5">
                          <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                            <input
                              type="checkbox"
                              className="rounded h-4 w-4 text-indigo-600 cursor-pointer"
                              checked={editForm.isDefault}
                              onChange={(e) => setEditForm((v) => ({ ...v, isDefault: e.target.checked }))}
                            />
                            <span>Receptor por defecto para señas</span>
                          </label>
                        </div>
                      </div>

                      <div className="flex gap-2 justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdate(recv.id)}
                          disabled={saving}
                          className="px-3 py-1.5 text-sm font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-colors cursor-pointer"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-base">{recv.name}</span>
                          {recv.isDefault && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">
                              <Star className="h-3 w-3 fill-amber-500 text-amber-500" /> Señas por defecto
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-800">
                            {recv.profitSharePercent ? `${recv.profitSharePercent}% de ganancias` : "Sin % asignado"}
                          </span>
                        </div>
                        {recv.accountInfo && <p className="text-xs text-muted-foreground">{recv.accountInfo}</p>}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {!recv.isDefault && (
                          <button
                            type="button"
                            onClick={() => handleSetDefault(recv.id)}
                            title="Establecer como por defecto para señas"
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors cursor-pointer"
                          >
                            <Star className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => startEdit(recv)}
                          title="Editar socio"
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors cursor-pointer"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(recv.id)}
                          disabled={saving}
                          title="Eliminar socio"
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Access Control */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6">
          <div className="rounded-2xl border bg-white dark:bg-slate-900 shadow-xs p-6 space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-base font-bold">Acceso al Panel de Balance</h2>
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Control de usuarios que tienen permitido ingresar al panel de Balance. El Superadmin siempre tiene acceso garantizado.
              </p>
            </div>

            <div className="space-y-2 pt-1">
              {allUsers
                .filter((u) => !u.email.toLowerCase().includes("guillermo.diarte"))
                .map((user) => {
                  const isChecked = enabledUsers.includes(user.email.toLowerCase());
                  return (
                    <label
                      key={user.id}
                      className={cn(
                        "flex items-center justify-between gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none",
                        isChecked
                          ? "bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800"
                          : "bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700 hover:bg-slate-100/50 dark:hover:bg-slate-800/60"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          className="rounded h-4 w-4 text-indigo-600 cursor-pointer shrink-0"
                          checked={isChecked}
                          onChange={() => toggleEnabledUser(user.email.toLowerCase())}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold leading-tight truncate text-slate-900 dark:text-slate-100">
                            {user.name || user.email}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                      </div>
                      <span
                        className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0",
                          isChecked
                            ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                        )}
                      >
                        {isChecked ? "Habilitado" : "Sin acceso"}
                      </span>
                    </label>
                  );
                })}

              {allUsers.filter((u) => !u.email.toLowerCase().includes("guillermo.diarte")).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6 border rounded-xl border-dashed">
                  No hay otros usuarios registrados en esta sesión.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

