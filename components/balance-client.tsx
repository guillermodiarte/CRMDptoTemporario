"use client";

import { useState, useMemo } from "react";
import { formatCurrency } from "@/lib/utils";
import {
  Banknote,
  CreditCard,
  TrendingUp,
  Settings,
  Gift,
  Users2,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Info,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";

interface Receiver {
  id: string;
  name: string;
  accountInfo?: string | null;
  isDefault: boolean;
  order: number;
}

interface ReservationRow {
  id: string;
  guestName: string;
  checkIn: string | Date;
  checkOut: string | Date;
  totalAmount: number;
  depositAmount: number;
  paymentStatus: string;
  paymentMethod?: string | null;
  paymentReceiver?: { id: string; name: string } | null;
  depositMethod?: string | null;
  depositReceiver?: { id: string; name: string } | null;
  department: { name: string };
}

interface SummaryStats {
  totalCash: number;
  totalTransfer: number;
  totalDeposits: number;
  transferByReceiver: { name: string; amount: number }[];
  depositByReceiver: { name: string; amount: number }[];
}

interface BalanceClientProps {
  reservations: ReservationRow[];
  receivers: Receiver[];
  summaryStats?: SummaryStats;
  isSuperAdmin: boolean;
}

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6", "#f97316", "#ec4899"];

const MONTHS = [
  { value: "all", label: "Todos los meses" },
  { value: "0", label: "Enero" },
  { value: "1", label: "Febrero" },
  { value: "2", label: "Marzo" },
  { value: "3", label: "Abril" },
  { value: "4", label: "Mayo" },
  { value: "5", label: "Junio" },
  { value: "6", label: "Julio" },
  { value: "7", label: "Agosto" },
  { value: "8", label: "Septiembre" },
  { value: "9", label: "Octubre" },
  { value: "10", label: "Noviembre" },
  { value: "11", label: "Diciembre" },
];

function MiniPieChart({ segments }: { segments: { value: number; color: string; label: string }[] }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total === 0)
    return (
      <div className="w-24 h-24 rounded-full border-4 border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs text-muted-foreground text-center p-2">
        Sin datos
      </div>
    );

  let cumulativePercent = 0;
  const radius = 40;
  const cx = 48;
  const cy = 48;
  const circumference = 2 * Math.PI * radius;

  return (
    <svg width="96" height="96" viewBox="0 0 96 96" className="rotate-[-90deg]">
      {segments.map((seg, i) => {
        const pct = seg.value / total;
        const offset = circumference * (1 - pct);
        const dashArray = `${circumference * pct} ${circumference * (1 - pct)}`;
        const strokeDashoffset = circumference * (1 - cumulativePercent);
        cumulativePercent += pct;
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={seg.color}
            strokeWidth="16"
            strokeDasharray={dashArray}
            strokeDashoffset={-circumference * (cumulativePercent - pct)}
            style={{ transition: "stroke-dasharray 0.5s ease" }}
          />
        );
      })}
    </svg>
  );
}

function StatCard({
  icon: Icon,
  label,
  amount,
  color,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  amount: number;
  color: string;
  sub?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-5 bg-white dark:bg-slate-900 shadow-xs hover:shadow-md transition-shadow`}
    >
      <div
        className={`absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 -translate-y-6 translate-x-6 ${color}`}
      />
      <div className="flex items-start gap-4">
        <div className={`p-2.5 rounded-xl ${color} bg-opacity-15 shrink-0`}>
          <Icon className={`h-5 w-5 ${color.replace("bg-", "text-")}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide truncate">{label}</p>
          <p className="text-2xl font-bold tracking-tight mt-0.5">{formatCurrency(amount)}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

export function BalanceClient({ reservations, receivers, isSuperAdmin }: BalanceClientProps) {
  const [filterReceiver, setFilterReceiver] = useState<string>("all");
  const [filterMethod, setFilterMethod] = useState<string>("all");
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());
  const [filterMonth, setFilterMonth] = useState<string>("all");

  const years = useMemo(() => {
    const ys = new Set<number>();
    reservations.forEach((r) => ys.add(new Date(r.checkIn).getFullYear()));
    ys.add(new Date().getFullYear());
    return Array.from(ys).sort((a, b) => b - a);
  }, [reservations]);

  // Step backward / forward through months
  const handlePrevMonth = () => {
    if (filterMonth === "all") {
      setFilterMonth(String(new Date().getMonth()));
      return;
    }
    const m = Number(filterMonth);
    if (m === 0) {
      setFilterMonth("11");
      setFilterYear((y) => y - 1);
    } else {
      setFilterMonth(String(m - 1));
    }
  };

  const handleNextMonth = () => {
    if (filterMonth === "all") {
      setFilterMonth(String(new Date().getMonth()));
      return;
    }
    const m = Number(filterMonth);
    if (m === 11) {
      setFilterMonth("0");
      setFilterYear((y) => y + 1);
    } else {
      setFilterMonth(String(m + 1));
    }
  };

  // Filter reservations by selected Year and Month
  const periodReservations = useMemo(() => {
    return reservations.filter((r) => {
      const d = new Date(r.checkIn);
      const year = d.getFullYear();
      if (year !== filterYear) return false;
      if (filterMonth !== "all") {
        const month = d.getMonth();
        if (month !== Number(filterMonth)) return false;
      }
      return true;
    });
  }, [reservations, filterYear, filterMonth]);

  // Compute stats dynamically for the selected period
  const computedStats = useMemo(() => {
    let totalCash = 0;
    let totalTransfer = 0;
    let totalDeposits = 0;
    const transferByReceiver: Record<string, { name: string; amount: number }> = {};
    const depositByReceiver: Record<string, { name: string; amount: number }> = {};

    for (const res of periodReservations) {
      const isPaid = res.paymentStatus === "PAID";
      const isPartial = res.paymentStatus === "PARTIAL";

      // 1. Seña (deposit)
      const hadDeposit =
        (res.depositAmount || 0) > 0 &&
        (isPartial || (res.depositAmount || 0) < res.totalAmount || !!res.depositMethod);
      const depositAmt = hadDeposit ? res.depositAmount || 0 : 0;

      if (depositAmt > 0) {
        totalDeposits += depositAmt;
        const dMethod = res.depositMethod || "TRANSFER";
        const dRecv = res.depositReceiver;

        if (dMethod === "CASH") {
          totalCash += depositAmt;
        } else {
          totalTransfer += depositAmt;
          if (dRecv) {
            if (!depositByReceiver[dRecv.id]) {
              depositByReceiver[dRecv.id] = { name: dRecv.name, amount: 0 };
            }
            depositByReceiver[dRecv.id].amount += depositAmt;

            if (!transferByReceiver[dRecv.id]) {
              transferByReceiver[dRecv.id] = { name: dRecv.name, amount: 0 };
            }
            transferByReceiver[dRecv.id].amount += depositAmt;
          }
        }
      }

      // 2. Final payment (only for PAID reservations)
      if (isPaid) {
        const remainingAmt = Math.max(0, res.totalAmount - depositAmt);
        if (remainingAmt > 0) {
          const payMethod = (res as any).paymentMethod || "CASH";
          const payRecv = res.paymentReceiver;

          if (payMethod === "CASH") {
            totalCash += remainingAmt;
          } else if (payMethod === "TRANSFER") {
            totalTransfer += remainingAmt;
            if (payRecv) {
              if (!transferByReceiver[payRecv.id]) {
                transferByReceiver[payRecv.id] = { name: payRecv.name, amount: 0 };
              }
              transferByReceiver[payRecv.id].amount += remainingAmt;
            }
          }
        }
      }
    }

    return {
      totalCash,
      totalTransfer,
      totalDeposits,
      transferByReceiver: Object.values(transferByReceiver),
      depositByReceiver: Object.values(depositByReceiver),
    };
  }, [periodReservations]);

  const grandTotal = computedStats.totalCash + computedStats.totalTransfer;

  // Build pie segments dynamically from filtered period
  const pieSegments = useMemo(() => {
    const segments: { value: number; color: string; label: string }[] = [];
    if (computedStats.totalCash > 0) {
      segments.push({ value: computedStats.totalCash, color: "#22c55e", label: "Efectivo" });
    }
    computedStats.transferByReceiver.forEach((r, i) => {
      if (r.amount > 0) {
        segments.push({ value: r.amount, color: COLORS[i % COLORS.length], label: `Transfer. ${r.name}` });
      }
    });
    return segments;
  }, [computedStats]);

  // Filter table rows by method & receiver within the selected period
  const filtered = useMemo(() => {
    return periodReservations.filter((r) => {
      if (filterMethod !== "all") {
        if (filterMethod === "CASH" && r.paymentMethod !== "CASH") return false;
        if (filterMethod === "TRANSFER" && r.paymentMethod !== "TRANSFER") return false;
        if (filterMethod === "DEPOSIT" && !r.depositAmount) return false;
      }
      if (filterReceiver !== "all") {
        const matchesFinal = r.paymentReceiver?.id === filterReceiver;
        const matchesDeposit = r.depositReceiver?.id === filterReceiver;
        if (!matchesFinal && !matchesDeposit) return false;
      }
      return true;
    });
  }, [periodReservations, filterMethod, filterReceiver]);

  const periodLabel =
    filterMonth === "all"
      ? `Año ${filterYear}`
      : `${MONTHS.find((m) => m.value === filterMonth)?.label} ${filterYear}`;

  return (
    <div className="flex-1 space-y-6 max-w-7xl w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Balance de Pagos</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Seguimiento de ingresos por método y receptor ·{" "}
            <span className="font-semibold text-slate-800 dark:text-slate-200">{periodLabel}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Month & Year Selectors Bar */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-1 shadow-2xs">
            <Calendar className="h-4 w-4 text-slate-400 dark:text-slate-500 ml-2 shrink-0" />

            {/* Prev month button (visible when a specific month is selected) */}
            {filterMonth !== "all" && (
              <button
                type="button"
                onClick={handlePrevMonth}
                title="Mes anterior"
                className="p-1 rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
            )}

            {/* Month select */}
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="text-sm font-semibold px-2 py-1.5 rounded-lg bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value} className="dark:bg-slate-900">
                  {m.label}
                </option>
              ))}
            </select>

            {/* Next month button (visible when a specific month is selected) */}
            {filterMonth !== "all" && (
              <button
                type="button"
                onClick={handleNextMonth}
                title="Mes siguiente"
                className="p-1 rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}

            <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700 mx-1" />

            {/* Year select */}
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(Number(e.target.value))}
              className="text-sm font-semibold px-2 py-1.5 rounded-lg bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              {years.map((y) => (
                <option key={y} value={y} className="dark:bg-slate-900">
                  {y}
                </option>
              ))}
            </select>
          </div>

          {isSuperAdmin && (
            <Link
              href="/dashboard/balance/config"
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs"
            >
              <Settings className="h-4 w-4" />
              Configurar
            </Link>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={TrendingUp}
          label="Total Ingresado"
          amount={grandTotal}
          color="bg-indigo-500"
          sub={`${periodReservations.filter((r) => r.paymentStatus === "PAID").length} reservas pagadas`}
        />
        <StatCard
          icon={Banknote}
          label="Efectivo"
          amount={computedStats.totalCash}
          color="bg-emerald-500"
          sub={
            grandTotal > 0
              ? `${Math.round((computedStats.totalCash / grandTotal) * 100)}% del total`
              : undefined
          }
        />
        <StatCard
          icon={CreditCard}
          label="Transferencias"
          amount={computedStats.totalTransfer}
          color="bg-blue-500"
          sub={
            grandTotal > 0
              ? `${Math.round((computedStats.totalTransfer / grandTotal) * 100)}% del total`
              : undefined
          }
        />
        <StatCard
          icon={Gift}
          label="Señas Recibidas"
          amount={computedStats.totalDeposits}
          color="bg-amber-500"
          sub={`${periodReservations.filter((r) => (r.depositAmount || 0) > 0).length} reservas con seña`}
        />
      </div>

      {/* Charts + Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribution pie chart */}
        <div className="rounded-2xl border bg-white dark:bg-slate-900 shadow-xs p-5">
          <h3 className="font-semibold text-base mb-4">Distribución de Ingresos</h3>
          <div className="flex items-center gap-6">
            <div className="shrink-0">
              <MiniPieChart segments={pieSegments} />
            </div>
            <div className="space-y-2 flex-1 min-w-0">
              {pieSegments.length === 0 && (
                <p className="text-sm text-muted-foreground">Sin datos de pagos para este período.</p>
              )}
              {pieSegments.map((seg, i) => (
                <div key={i} className="flex items-center justify-between gap-2 text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                    <span className="truncate text-muted-foreground">{seg.label}</span>
                  </div>
                  <span className="font-semibold shrink-0">{formatCurrency(seg.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* By receiver breakdown */}
        <div className="rounded-2xl border bg-white dark:bg-slate-900 shadow-xs p-5">
          <h3 className="font-semibold text-base mb-4">Por Receptor</h3>
          <div className="space-y-3">
            {receivers.length === 0 && (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Info className="h-4 w-4" />
                No hay receptores configurados.
                {isSuperAdmin && (
                  <Link href="/dashboard/balance/config" className="underline text-indigo-600">
                    Configurar
                  </Link>
                )}
              </div>
            )}
            {receivers.map((recv, i) => {
              const transferAmt =
                computedStats.transferByReceiver.find((t) => t.name === recv.name)?.amount || 0;
              const depositAmt =
                computedStats.depositByReceiver.find((d) => d.name === recv.name)?.amount || 0;
              const total = transferAmt + depositAmt;
              const pct = grandTotal > 0 ? Math.round((total / grandTotal) * 100) : 0;
              return (
                <div key={recv.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="font-medium">{recv.name}</span>
                      {recv.isDefault && (
                        <span className="text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded-full font-semibold">
                          Por defecto
                        </span>
                      )}
                    </div>
                    <span className="font-bold">{formatCurrency(total)}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }}
                    />
                  </div>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    {transferAmt > 0 && <span>Transferencias: {formatCurrency(transferAmt)}</span>}
                    {depositAmt > 0 && <span>Señas: {formatCurrency(depositAmt)}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filters for table */}
      <div className="flex flex-wrap gap-3 items-center">
        <span className="text-sm font-medium text-muted-foreground">Filtrar:</span>
        <select
          value={filterMethod}
          onChange={(e) => setFilterMethod(e.target.value)}
          className="text-sm px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none font-medium cursor-pointer"
        >
          <option value="all">Todos los métodos</option>
          <option value="CASH">Efectivo</option>
          <option value="TRANSFER">Transferencia</option>
          <option value="DEPOSIT">Con seña</option>
        </select>
        <select
          value={filterReceiver}
          onChange={(e) => setFilterReceiver(e.target.value)}
          className="text-sm px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none font-medium cursor-pointer"
        >
          <option value="all">Todos los receptores</option>
          {receivers.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} {filtered.length === 1 ? "reserva" : "reservas"} en{" "}
          {filterMonth === "all"
            ? `el año ${filterYear}`
            : `${MONTHS.find((m) => m.value === filterMonth)?.label} ${filterYear}`}
        </span>
      </div>

      {/* Reservations table */}
      <div className="rounded-2xl border bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50/70 dark:bg-slate-800/50">
                <th className="text-left px-4 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wide">
                  Huésped
                </th>
                <th className="text-left px-4 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wide">
                  Depto.
                </th>
                <th className="text-left px-4 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wide">
                  Fechas
                </th>
                <th className="text-right px-4 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wide">
                  Total
                </th>
                <th className="text-center px-4 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wide">
                  Seña
                </th>
                <th className="text-center px-4 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wide">
                  Pago Final
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-muted-foreground text-sm">
                    Sin reservas para los filtros seleccionados ({periodLabel}).
                  </td>
                </tr>
              )}
              {filtered.map((res) => {
                const depositAmt = res.depositAmount || 0;
                const remaining = res.totalAmount - depositAmt;
                return (
                  <tr key={res.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{res.guestName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{res.department.name}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {format(new Date(res.checkIn), "dd/MM/yy")} → {format(new Date(res.checkOut), "dd/MM/yy")}
                    </td>
                    <td className="px-4 py-3 text-right font-bold">{formatCurrency(res.totalAmount)}</td>
                    <td className="px-4 py-3 text-center">
                      {depositAmt > 0 ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="font-semibold text-amber-600 dark:text-amber-400">
                            {formatCurrency(depositAmt)}
                          </span>
                          {res.depositMethod && (
                            <span className="text-[10px] text-muted-foreground">
                              {res.depositMethod === "CASH"
                                ? "💵 Efectivo"
                                : `💳 ${res.depositReceiver?.name || "Transf."}`}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {res.paymentStatus === "PAID" ? (
                        <div className="flex flex-col items-center gap-0.5">
                          {remaining > 0 && (
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(remaining)}
                            </span>
                          )}
                          {res.paymentMethod ? (
                            <span className="text-[10px] text-muted-foreground">
                              {res.paymentMethod === "CASH"
                                ? "💵 Efectivo"
                                : `💳 ${res.paymentReceiver?.name || "Transf."}`}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-full">
                              PAGADO
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full">
                          PARCIAL
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
