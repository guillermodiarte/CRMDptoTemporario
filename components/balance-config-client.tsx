"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Check, X, Star, ArrowLeft, Percent, Sparkles, AlertCircle, ShieldCheck, Users, Sliders, RefreshCw, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

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

  // Shares Modal State
  const [showSharesModal, setShowSharesModal] = useState(false);
  const [sharesForm, setSharesForm] = useState<{ id: string; name: string; percent: number }[]>([]);
  const [savingShares, setSavingShares] = useState(false);

  // Cleaning expense toggle state
  const [cleaningEnabled, setCleaningEnabled] = useState(initialCleaningExpenseEnabled);
  const [savingCleaning, setSavingCleaning] = useState(false);

  // Manual transfers edit toggle state
  const [manualTransfersEditEnabled, setManualTransfersEditEnabled] = useState(initialManualTransfersEditEnabled);
  const [savingManualTransfers, setSavingManualTransfers] = useState(false);

  const totalPercent = Math.round(receivers.reduce((sum, r) => sum + (r.profitSharePercent || 0), 0) * 10) / 10;
  const sharesTotal = Math.round(sharesForm.reduce((sum, s) => sum + s.percent, 0) * 10) / 10;

  const openSharesModal = () => {
    setSharesForm(
      receivers.map((r) => ({
        id: r.id,
        name: r.name,
        percent: Number(r.profitSharePercent) || 0,
      }))
    );
    setShowSharesModal(true);
  };

  const handleShareChange = (id: string, newPercent: number) => {
    const val = Math.min(100, Math.max(0, Math.round(newPercent * 10) / 10));
    setSharesForm((prev) => {
      if (prev.length === 2) {
        // 2 receivers: automatic zero-sum rebalancing
        const otherVal = Math.max(0, Math.round((100 - val) * 10) / 10);
        return prev.map((item) =>
          item.id === id ? { ...item, percent: val } : { ...item, percent: otherVal }
        );
      }
      // 3+ receivers: direct update
      return prev.map((item) => (item.id === id ? { ...item, percent: val } : item));
    });
  };

  const handleSplitEqually = () => {
    if (sharesForm.length === 0) return;
    const count = sharesForm.length;
    const rawShare = Math.floor((100 / count) * 10) / 10;
    const remainder = Math.round((100 - rawShare * count) * 10) / 10;

    setSharesForm((prev) =>
      prev.map((item, idx) => ({
        ...item,
        percent: idx === 0 ? Math.round((rawShare + remainder) * 10) / 10 : rawShare,
      }))
    );
  };

  const handleAutoComplete = (targetId: string) => {
    setSharesForm((prev) => {
      const othersSum = prev
        .filter((item) => item.id !== targetId)
        .reduce((sum, item) => sum + item.percent, 0);
      const remaining = Math.max(0, Math.round((100 - othersSum) * 10) / 10);
      return prev.map((item) => (item.id === targetId ? { ...item, percent: remaining } : item));
    });
  };

  const handleSaveShares = async () => {
    if (Math.abs(sharesTotal - 100) > 0.5) {
      toast.error(`La suma debe dar exactamente 100% (actual: ${sharesTotal.toFixed(1)}%)`);
      return;
    }
    setSavingShares(true);
    try {
      const res = await fetch("/api/payment-receivers/shares", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shares: sharesForm.map((s) => ({
            id: s.id,
            profitSharePercent: s.percent,
          })),
        }),
      });
      if (res.ok) {
        const updatedList = await res.json();
        setReceivers(updatedList);
        setShowSharesModal(false);
        toast.success("Distribución de ganancias actualizada al 100%");
        router.refresh();
      } else {
        const errMsg = await res.text();
        toast.error(errMsg || "Error al guardar distribución");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSavingShares(false);
    }
  };

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
        router.refresh();
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
      const editedPercent = Number(editForm.profitSharePercent) || 0;

      // If there are exactly 2 receivers, auto-balance the other partner!
      if (receivers.length === 2) {
        const otherReceiver = receivers.find((r) => r.id !== id);
        if (otherReceiver) {
          const otherPercent = Math.max(0, Math.round((100 - editedPercent) * 10) / 10);

          await fetch("/api/payment-receivers/shares", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              shares: [
                { id, profitSharePercent: editedPercent },
                { id: otherReceiver.id, profitSharePercent: otherPercent },
              ],
            }),
          });
        }
      }

      const res = await fetch(`/api/payment-receivers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editForm,
          profitSharePercent: editedPercent,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setReceivers((prev) => {
          let list = editForm.isDefault ? prev.map((r) => ({ ...r, isDefault: false })) : prev;
          if (prev.length === 2) {
            const otherPercent = Math.max(0, Math.round((100 - editedPercent) * 10) / 10);
            list = list.map((r) =>
              r.id === id ? updated : { ...r, profitSharePercent: otherPercent }
            );
          } else {
            list = list.map((r) => (r.id === id ? updated : r));
          }
          return list;
        });
        setEditingId(null);
        toast.success(
          receivers.length === 2
            ? "Socio actualizado (el otro socio se calibró automáticamente al 100%)"
            : "Socio actualizado"
        );
        router.refresh();
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
        const remaining = receivers.filter((r) => r.id !== id);
        setReceivers(remaining);
        // If only 1 receiver left, assign 100%
        if (remaining.length === 1) {
          await fetch("/api/payment-receivers/shares", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              shares: [{ id: remaining[0].id, profitSharePercent: 100 }],
            }),
          });
          setReceivers([{ ...remaining[0], profitSharePercent: 100 }]);
        }
        toast.success("Receptor eliminado");
        router.refresh();
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
              <div className="flex items-center gap-2 flex-wrap">
                {receivers.length > 0 && (
                  <button
                    type="button"
                    onClick={openSharesModal}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Sliders className="h-4 w-4" /> Distribuir % Ganancias
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowNewForm((v) => !v)}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer shadow-xs"
                >
                  <Plus className="h-4 w-4" /> Agregar Socio
                </button>
              </div>
            </div>

            {/* Profit Share Summary Alert */}
            {receivers.length > 0 && (
              <div
                className={`p-3.5 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 border ${
                  totalPercent === 100
                    ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                    : totalPercent === 0
                    ? "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300"
                    : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  {totalPercent === 100 ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                  )}
                  <span>
                    {totalPercent === 100
                      ? "Distribución equilibrada: 100% asignado entre los socios."
                      : totalPercent === 0
                      ? "Porcentajes en 0%: La ganancia neta se dividirá en partes iguales entre los socios."
                      : `Suma actual de porcentajes: ${totalPercent}%. Para un balance exacto, la suma debe dar 100%.`}
                  </span>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <span className="font-extrabold text-xs">{totalPercent}% total</span>
                  <button
                    type="button"
                    onClick={openSharesModal}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer shadow-xs"
                  >
                    {totalPercent === 100 ? "Modificar %" : "Ajustar al 100%"}
                  </button>
                </div>
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

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">% Ganancia Asignado</label>
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.5"
                              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold pr-8"
                              value={editForm.profitSharePercent || ""}
                              onChange={(e) => setEditForm((v) => ({ ...v, profitSharePercent: Number(e.target.value) || 0 }))}
                            />
                            <span className="absolute right-3 top-2.5 text-xs text-muted-foreground font-bold">%</span>
                          </div>
                          {receivers.length === 2 && (
                            <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug">
                              💡 Al guardar, {receivers.find((r) => r.id !== recv.id)?.name || "el otro socio"} se calibrará automáticamente a{" "}
                              <strong className="text-indigo-600 dark:text-indigo-400 font-bold">
                                {Math.max(0, Math.round((100 - (Number(editForm.profitSharePercent) || 0)) * 10) / 10)}%
                              </strong>{" "}
                              para sumar exactamente 100%.
                            </p>
                          )}
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
      {/* Dialog Modal: Distribuir Porcentajes de Ganancias */}
      <Dialog open={showSharesModal} onOpenChange={setShowSharesModal}>
        <DialogContent className="sm:max-w-[540px] p-0 overflow-hidden rounded-2xl">
          <DialogHeader className="p-5 pb-3 border-b bg-slate-50/70 dark:bg-slate-900/50">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <Sliders className="h-5 w-5" />
              <DialogTitle className="text-lg font-bold">Distribución de Porcentajes de Ganancias</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Asigna el porcentaje de ganancia neta correspondiente a cada socio. La suma total de todos los socios debe dar exactamente 100%.
            </DialogDescription>
          </DialogHeader>

          <div className="p-5 space-y-5">
            {/* Visual Progress Bar & Alert */}
            <div className="space-y-2 p-3.5 rounded-xl border bg-slate-50/60 dark:bg-slate-800/40">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Total acumulado:</span>
                <span
                  className={cn(
                    "font-extrabold px-2.5 py-0.5 rounded-full text-xs flex items-center gap-1",
                    Math.abs(sharesTotal - 100) <= 0.5
                      ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                      : sharesTotal > 100
                      ? "bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-800"
                      : "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                  )}
                >
                  {Math.abs(sharesTotal - 100) <= 0.5 ? (
                    <>
                      <Check className="h-3 w-3" /> 100% Exacto
                    </>
                  ) : sharesTotal > 100 ? (
                    <>
                      <AlertCircle className="h-3 w-3" /> {sharesTotal.toFixed(1)}% (Sobra {(sharesTotal - 100).toFixed(1)}%)
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-3 w-3" /> {sharesTotal.toFixed(1)}% (Falta {(100 - sharesTotal).toFixed(1)}%)
                    </>
                  )}
                </span>
              </div>

              {/* Segmented Bar */}
              <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex shadow-inner">
                {sharesForm.map((s, idx) => {
                  const colors = [
                    "bg-indigo-600",
                    "bg-emerald-500",
                    "bg-amber-500",
                    "bg-purple-500",
                    "bg-blue-500",
                    "bg-rose-500",
                  ];
                  const widthPct = sharesTotal > 0 ? (s.percent / Math.max(100, sharesTotal)) * 100 : 0;
                  return (
                    <div
                      key={s.id}
                      style={{ width: `${widthPct}%` }}
                      className={cn(colors[idx % colors.length], "h-full transition-all duration-200")}
                      title={`${s.name}: ${s.percent}%`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground font-medium">Acciones rápidas:</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSplitEqually}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3" /> Partes iguales ({sharesForm.length > 0 ? (100 / sharesForm.length).toFixed(1) : 0}%)
                </button>
              </div>
            </div>

            {/* Partner percentage rows */}
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {sharesForm.map((s, idx) => {
                const colors = [
                  "bg-indigo-600 text-white",
                  "bg-emerald-500 text-white",
                  "bg-amber-500 text-white",
                  "bg-purple-500 text-white",
                  "bg-blue-500 text-white",
                  "bg-rose-500 text-white",
                ];
                return (
                  <div
                    key={s.id}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={cn(
                            "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                            colors[idx % colors.length]
                          )}
                        >
                          {idx + 1}
                        </span>
                        <span className="font-bold text-sm truncate text-slate-900 dark:text-slate-100">
                          {s.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            value={s.percent}
                            onChange={(e) => handleShareChange(s.id, Number(e.target.value) || 0)}
                            className="w-20 text-right font-extrabold text-sm px-2 py-1 pr-6 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <span className="absolute right-2 top-1 text-xs text-muted-foreground font-bold">
                            %
                          </span>
                        </div>

                        {sharesForm.length > 2 && (
                          <button
                            type="button"
                            onClick={() => handleAutoComplete(s.id)}
                            title="Completar el porcentaje restante para llegar al 100%"
                            className="text-[11px] font-semibold px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            Restante
                          </button>
                        )}
                      </div>
                    </div>

                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={s.percent}
                      onChange={(e) => handleShareChange(s.id, Number(e.target.value) || 0)}
                      className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>
                );
              })}
            </div>

            {sharesForm.length === 2 && (
              <p className="text-xs text-muted-foreground text-center bg-indigo-50/50 dark:bg-indigo-950/30 p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
                💡 Al mover el porcentaje de un socio, el otro se calibra automáticamente para sumar siempre 100%.
              </p>
            )}
          </div>

          <DialogFooter className="p-4 border-t bg-slate-50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              {Math.abs(sharesTotal - 100) > 0.5 ? (
                <span className="text-red-600 dark:text-red-400 font-semibold flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" /> La suma debe dar 100% para guardar.
                </span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Suma perfecta de 100%.
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => setShowSharesModal(false)}
                className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveShares}
                disabled={savingShares || Math.abs(sharesTotal - 100) > 0.5}
                className="px-4 py-2 text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-xs"
              >
                {savingShares ? "Guardando..." : "Guardar Distribución (100%)"}
              </button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

