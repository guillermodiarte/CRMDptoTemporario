"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Check, X, Star } from "lucide-react";
import { useRouter } from "next/navigation";

interface Receiver {
  id: string;
  name: string;
  accountInfo?: string | null;
  isDefault: boolean;
  order: number;
}

interface BalanceConfigClientProps {
  receivers: Receiver[];
  enabledUsers: string[];
  allUsers: { id: string; email: string; name?: string | null }[];
  isSuperAdmin: boolean;
}

export function BalanceConfigClient({ receivers: initialReceivers, enabledUsers: initialEnabledUsers, allUsers, isSuperAdmin }: BalanceConfigClientProps) {
  const router = useRouter();
  const [receivers, setReceivers] = useState<Receiver[]>(initialReceivers);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newForm, setNewForm] = useState({ name: "", accountInfo: "", isDefault: false });
  const [editForm, setEditForm] = useState({ name: "", accountInfo: "", isDefault: false });
  const [showNewForm, setShowNewForm] = useState(false);
  const [enabledUsers, setEnabledUsers] = useState<string[]>(initialEnabledUsers);

  const handleCreate = async () => {
    if (!newForm.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/payment-receivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newForm),
      });
      if (res.ok) {
        const created = await res.json();
        setReceivers(prev => {
          // If new one is default, clear others
          const updated = newForm.isDefault ? prev.map(r => ({ ...r, isDefault: false })) : prev;
          return [...updated, created];
        });
        setNewForm({ name: "", accountInfo: "", isDefault: false });
        setShowNewForm(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (r: Receiver) => {
    setEditingId(r.id);
    setEditForm({ name: r.name, accountInfo: r.accountInfo || "", isDefault: r.isDefault });
  };

  const handleUpdate = async (id: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/payment-receivers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        const updated = await res.json();
        setReceivers(prev => {
          const list = editForm.isDefault ? prev.map(r => ({ ...r, isDefault: false })) : prev;
          return list.map(r => r.id === id ? updated : r);
        });
        setEditingId(null);
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
        setReceivers(prev => prev.filter(r => r.id !== id));
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
        setReceivers(prev => prev.map(r => ({ ...r, isDefault: r.id === id })));
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabledUser = async (email: string) => {
    const newList = enabledUsers.includes(email)
      ? enabledUsers.filter(e => e !== email)
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
    <div className="flex-1 space-y-8 max-w-3xl w-full">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configuración de Balance</h1>
        <p className="text-muted-foreground text-sm mt-1">Gestiona los receptores de pago y los usuarios con acceso al panel de balance.</p>
      </div>

      {/* Receivers section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Receptores de Pago</h2>
          <button
            onClick={() => setShowNewForm(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
          >
            <Plus className="h-4 w-4" /> Agregar
          </button>
        </div>

        {/* New receiver form */}
        {showNewForm && (
          <div className="rounded-xl border bg-white dark:bg-slate-900 p-4 space-y-3 shadow-sm">
            <p className="text-sm font-semibold">Nuevo receptor</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Nombre *</label>
                <input
                  className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ej: Guillermo Diarte"
                  value={newForm.name}
                  onChange={e => setNewForm(v => ({ ...v, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Cuenta / CBU / Alias (opcional)</label>
                <input
                  className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ej: guillermo.mp o CBU 123..."
                  value={newForm.accountInfo}
                  onChange={e => setNewForm(v => ({ ...v, accountInfo: e.target.value }))}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                className="rounded"
                checked={newForm.isDefault}
                onChange={e => setNewForm(v => ({ ...v, isDefault: e.target.checked }))}
              />
              Receptor por defecto para señas
            </label>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setShowNewForm(false); setNewForm({ name: "", accountInfo: "", isDefault: false }); }}
                className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !newForm.name.trim()}
                className="px-3 py-1.5 text-sm font-medium rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-colors"
              >
                Guardar
              </button>
            </div>
          </div>
        )}

        {/* Receivers list */}
        <div className="space-y-2">
          {receivers.length === 0 && !showNewForm && (
            <p className="text-sm text-muted-foreground py-4 text-center border rounded-xl">No hay receptores aún. Agregá el primero.</p>
          )}
          {receivers.map(recv => (
            <div key={recv.id} className="rounded-xl border bg-white dark:bg-slate-900 p-4 shadow-sm">
              {editingId === recv.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      className="text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={editForm.name}
                      onChange={e => setEditForm(v => ({ ...v, name: e.target.value }))}
                    />
                    <input
                      className="text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={editForm.accountInfo}
                      onChange={e => setEditForm(v => ({ ...v, accountInfo: e.target.value }))}
                      placeholder="Cuenta / CBU / Alias"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" className="rounded" checked={editForm.isDefault} onChange={e => setEditForm(v => ({ ...v, isDefault: e.target.checked }))} />
                    Receptor por defecto para señas
                  </label>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button>
                    <button onClick={() => handleUpdate(recv.id)} disabled={saving} className="px-3 py-1.5 text-sm font-medium rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-colors"><Check className="h-4 w-4" /></button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{recv.name}</span>
                      {recv.isDefault && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded-full">
                          <Star className="h-3 w-3" /> Por defecto
                        </span>
                      )}
                    </div>
                    {recv.accountInfo && <p className="text-xs text-muted-foreground mt-0.5">{recv.accountInfo}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!recv.isDefault && (
                      <button
                        onClick={() => handleSetDefault(recv.id)}
                        title="Establecer como por defecto"
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                      >
                        <Star className="h-4 w-4" />
                      </button>
                    )}
                    <button onClick={() => startEdit(recv)} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(recv.id)} disabled={saving} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Access control section */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold">Acceso al Panel de Balance</h2>
        <p className="text-xs text-muted-foreground">Los usuarios marcados podrán ver el panel de Balance y el seguimiento de pagos. El superadmin siempre tiene acceso.</p>
        <div className="space-y-2">
          {allUsers.filter(u => !u.email.toLowerCase().includes('guillermo.diarte')).map(user => (
            <label key={user.id} className="flex items-center gap-3 p-3 rounded-xl border bg-white dark:bg-slate-900 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <input
                type="checkbox"
                className="rounded"
                checked={enabledUsers.includes(user.email.toLowerCase())}
                onChange={() => toggleEnabledUser(user.email.toLowerCase())}
              />
              <div>
                <p className="text-sm font-medium">{user.name || user.email}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
            </label>
          ))}
          {allUsers.filter(u => !u.email.toLowerCase().includes('guillermo.diarte')).length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4 border rounded-xl">No hay otros usuarios en esta sesión.</p>
          )}
        </div>
      </section>
    </div>
  );
}
