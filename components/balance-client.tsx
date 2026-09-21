"use client";

import { useState, useMemo } from "react";
import { formatCurrency, formatSignedCurrency, cn } from "@/lib/utils";
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
  Globe,
  Pencil,
  Loader2,
  Check,
  X,
  AlertCircle,
  Wallet,
  Receipt,
  Scale,
  ArrowUpRight,
  ArrowDownLeft,
  Sparkles,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Receiver {
  id: string;
  name: string;
  accountInfo?: string | null;
  isDefault: boolean;
  order: number;
  profitSharePercent?: number;
}

interface ExpenseRow {
  id: string;
  type: string;
  description: string;
  amount: number;
  date: string | Date;
  department?: { name: string } | null;
  paymentReceiver?: { id: string; name: string } | null;
  paymentReceiverId?: string | null;
}

interface ReservationRow {
  id: string;
  guestName: string;
  checkIn: string | Date;
  checkOut: string | Date;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  totalAmount: number;
  depositAmount: number;
  paymentStatus: string;
  status: string;
  currency?: string | null;
  exchangeRate?: number | null;
  source?: string | null;
  paymentMethod?: string | null;
  paymentReceiver?: { id: string; name: string } | null;
  paymentReceiverId?: string | null;
  depositMethod?: string | null;
  depositReceiver?: { id: string; name: string } | null;
  depositReceiverId?: string | null;
  department: { name: string };
}

interface SummaryStats {
  totalCash: number;
  totalTransfer: number;
  totalDeposits: number;
  transferByReceiver: { name: string; amount: number }[];
  depositByReceiver: { name: string; amount: number }[];
}

export interface ManualTransferAdjustment {
  year: number;
  month: number;
  editedAt: string;
  editedBy: string;
  receivers: Record<string, number>;
}

interface BalanceClientProps {
  reservations: ReservationRow[];
  receivers: Receiver[];
  expenses?: ExpenseRow[];
  cleaningExpenseEnabled?: boolean;
  summaryStats?: SummaryStats;
  dollarRate?: number;
  isSuperAdmin: boolean;
  userRole?: string;
  manualTransfersEditEnabled?: boolean;
  initialManualTransfers?: Record<string, ManualTransferAdjustment>;
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
      className={`relative overflow-hidden rounded-2xl border p-4 md:p-5 bg-white dark:bg-slate-900 shadow-xs hover:shadow-md transition-shadow`}
    >
      <div
        className={`absolute top-0 right-0 w-20 h-20 rounded-full opacity-10 -translate-y-5 translate-x-5 ${color}`}
      />
      <div className="flex items-start gap-3">
        <div className={`p-2 md:p-2.5 rounded-xl ${color} bg-opacity-15 shrink-0`}>
          <Icon className={`h-4 w-4 md:h-5 md:w-5 ${color.replace("bg-", "text-")}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] md:text-xs text-muted-foreground font-medium uppercase tracking-wide truncate">{label}</p>
          <p className="text-lg md:text-xl xl:text-2xl font-bold tracking-tight mt-0.5 break-all leading-tight">{formatCurrency(amount)}</p>
          {sub && <p className="text-[10px] md:text-xs text-muted-foreground mt-1 truncate">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

export function BalanceClient({
  reservations: initialReservations,
  receivers,
  expenses = [],
  cleaningExpenseEnabled = false,
  dollarRate = 1485,
  isSuperAdmin,
  userRole = "ADMIN",
  manualTransfersEditEnabled = false,
  initialManualTransfers = {},
}: BalanceClientProps) {
  const isVisualizer = userRole === "VISUALIZER";
  const [reservations, setReservations] = useState<ReservationRow[]>(initialReservations);
  const [filterReceiver, setFilterReceiver] = useState<string>("all");
  const [filterMethod, setFilterMethod] = useState<string>("all");
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());
  const [filterMonth, setFilterMonth] = useState<string>(() => String(new Date().getMonth()));

  // ─── Manual Transfers Adjustment State ───
  const [manualTransfers, setManualTransfers] = useState<Record<string, ManualTransferAdjustment>>(initialManualTransfers);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualModalMonth, setManualModalMonth] = useState<string>(() => String(new Date().getMonth()));
  const [manualModalAmounts, setManualModalAmounts] = useState<Record<string, number>>({});
  const [savingManualAdjustment, setSavingManualAdjustment] = useState(false);
  const [resettingManualAdjustment, setResettingManualAdjustment] = useState(false);

  // Active adjustment for currently selected period
  const activeAdjustmentKey = filterMonth !== "all" ? `${filterYear}_${filterMonth}` : null;
  const activeAdjustment = activeAdjustmentKey ? manualTransfers[activeAdjustmentKey] : null;

  // ─── Edit Payment Modal State ───
  const [editingRes, setEditingRes] = useState<ReservationRow | null>(null);
  const [editForm, setEditForm] = useState({
    paymentStatus: "PAID",
    paymentMethod: "CASH",
    paymentReceiverId: "",
    depositAmount: 0,
    depositMethod: "TRANSFER",
    depositReceiverId: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const openEditModal = (r: ReservationRow) => {
    setEditingRes(r);
    setEditForm({
      paymentStatus: r.paymentStatus || "PAID",
      paymentMethod: r.paymentMethod || "CASH",
      paymentReceiverId: r.paymentReceiverId || r.paymentReceiver?.id || receivers.find((rec) => rec.isDefault)?.id || receivers[0]?.id || "",
      depositAmount: r.depositAmount || 0,
      depositMethod: r.depositMethod || "TRANSFER",
      depositReceiverId: r.depositReceiverId || r.depositReceiver?.id || receivers.find((rec) => rec.isDefault)?.id || receivers[0]?.id || "",
    });
  };

  const handleSavePayment = async () => {
    if (!editingRes) return;
    setSavingEdit(true);
    try {
      const payload: any = {
        paymentStatus: editForm.paymentStatus,
        paymentMethod: editForm.paymentMethod,
        paymentReceiverId: editForm.paymentMethod === "TRANSFER" ? editForm.paymentReceiverId || null : null,
        depositAmount: Number(editForm.depositAmount) || 0,
        depositMethod: editForm.depositMethod,
        depositReceiverId: editForm.depositMethod === "TRANSFER" ? editForm.depositReceiverId || null : null,
      };

      const res = await fetch(`/api/reservations/${editingRes.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Error al guardar cambios de pago");
      }

      // Update local state
      const targetReceiver = receivers.find((rec) => rec.id === payload.paymentReceiverId);
      const targetDepositReceiver = receivers.find((rec) => rec.id === payload.depositReceiverId);

      setReservations((prev) =>
        prev.map((item) =>
          item.id === editingRes.id
            ? {
                ...item,
                ...payload,
                paymentReceiver: targetReceiver ? { id: targetReceiver.id, name: targetReceiver.name } : null,
                depositReceiver: targetDepositReceiver ? { id: targetDepositReceiver.id, name: targetDepositReceiver.name } : null,
              }
            : item
        )
      );

      toast.success("Pago actualizado correctamente");
      setEditingRes(null);
    } catch (err: any) {
      toast.error(err?.message || "Error al actualizar pago");
    } finally {
      setSavingEdit(false);
    }
  };

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

  // ─── Manual Transfers Handlers ───
  const openManualTransfersModal = () => {
    const targetMonth = filterMonth === "all" ? String(new Date().getMonth()) : filterMonth;
    setManualModalMonth(targetMonth);
    const targetKey = `${filterYear}_${targetMonth}`;
    const existing = manualTransfers[targetKey];

    const initialAmounts: Record<string, number> = {};
    receivers.forEach((recv) => {
      if (existing && existing.receivers && existing.receivers[recv.id] !== undefined) {
        initialAmounts[recv.id] = existing.receivers[recv.id];
      } else {
        const currentAmt = computedStats.transferByReceiver.find((t) => t.name === recv.name)?.amount || 0;
        initialAmounts[recv.id] = currentAmt;
      }
    });
    setManualModalAmounts(initialAmounts);
    setIsManualModalOpen(true);
  };

  const handleSaveManualAdjustment = async () => {
    setSavingManualAdjustment(true);
    try {
      const res = await fetch("/api/balance/manual-transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: filterYear,
          month: Number(manualModalMonth),
          receivers: manualModalAmounts,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const key = `${filterYear}_${manualModalMonth}`;
        setManualTransfers((prev) => ({
          ...prev,
          [key]: data.data,
        }));
        toast.success("Ajuste manual de transferencias guardado con éxito");
        setIsManualModalOpen(false);
      } else {
        toast.error("Error al guardar ajuste");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSavingManualAdjustment(false);
    }
  };

  const handleResetManualAdjustment = async () => {
    if (!activeAdjustmentKey || !confirm("¿Seguro que deseas restablecer al cálculo 100% automático? Se eliminarán los montos fijados manualmente.")) return;
    setResettingManualAdjustment(true);
    try {
      const res = await fetch(`/api/balance/manual-transfers?year=${filterYear}&month=${Number(filterMonth)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setManualTransfers((prev) => {
          const next = { ...prev };
          delete next[activeAdjustmentKey];
          return next;
        });
        toast.success("Cálculo automático de transferencias restablecido");
      } else {
        toast.error("Error al restablecer");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setResettingManualAdjustment(false);
    }
  };

  // Compute stats dynamically for the selected period (with Airbnb and Cancelled Deposits)
  const computedStats = useMemo(() => {
    let totalCash = 0;
    let totalTransfer = 0;
    let totalAirbnb = 0;
    let totalAirbnbUSD = 0;
    let totalDeposits = 0;
    let airbnbCount = 0;
    let depositCount = 0;
    let cancelledWithDepositCount = 0;
    let totalCollectedIncome = 0;
    const transferByReceiver: Record<string, { name: string; amount: number; manualBase?: number; futureTransfer?: number }> = {};
    const depositByReceiver: Record<string, { name: string; amount: number }> = {};

    const cutoffDate = activeAdjustment ? new Date(activeAdjustment.editedAt) : null;
    const futureTransfersByReceiver: Record<string, number> = {};

    for (const res of periodReservations) {
      const isCancelled = res.status === "CANCELLED" || res.paymentStatus === "CANCELLED";
      const isAirbnb = res.source === "AIRBNB";
      const isUSD = res.currency === "USD";
      const rate = res.exchangeRate && res.exchangeRate > 1 ? res.exchangeRate : dollarRate;

      const totalARS = isUSD ? res.totalAmount * rate : res.totalAmount;
      const depositARS = isUSD ? (res.depositAmount || 0) * rate : res.depositAmount || 0;

      // 1. Cancelled reservations that left a deposit
      if (isCancelled) {
        if (depositARS > 0) {
          totalCollectedIncome += depositARS;
          totalDeposits += depositARS;
          depositCount++;
          cancelledWithDepositCount++;

          if (res.depositMethod === "CASH") {
            totalCash += depositARS;
          } else {
            totalTransfer += depositARS;
            if (res.depositReceiver) {
              if (!depositByReceiver[res.depositReceiver.id]) {
                depositByReceiver[res.depositReceiver.id] = { name: res.depositReceiver.name, amount: 0 };
              }
              depositByReceiver[res.depositReceiver.id].amount += depositARS;

              if (!transferByReceiver[res.depositReceiver.id]) {
                transferByReceiver[res.depositReceiver.id] = { name: res.depositReceiver.name, amount: 0 };
              }
              transferByReceiver[res.depositReceiver.id].amount += depositARS;

              if (cutoffDate && res.depositReceiver) {
                const isDepositFuture = res.createdAt ? new Date(res.createdAt) > cutoffDate : false;
                if (isDepositFuture) {
                  futureTransfersByReceiver[res.depositReceiver.id] = (futureTransfersByReceiver[res.depositReceiver.id] || 0) + depositARS;
                }
              }
            }
          }
        }
        continue;
      }

      // 2. Airbnb reservations (added to total, converted to ARS)
      if (isAirbnb) {
        totalCollectedIncome += totalARS;
        totalAirbnb += totalARS;
        if (isUSD) totalAirbnbUSD += res.totalAmount;
        airbnbCount++;
        continue;
      }

      // 3. Direct / Booking / other normal reservations
      const isPaid = res.paymentStatus === "PAID";
      const isPartial = res.paymentStatus === "PARTIAL";

      // Seña (deposit)
      const hadDeposit = depositARS > 0 && (isPartial || depositARS < totalARS || !!res.depositMethod);
      const depositAmt = hadDeposit ? depositARS : 0;

      if (depositAmt > 0) {
        totalDeposits += depositAmt;
        depositCount++;
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

            if (cutoffDate) {
              const isDepositFuture = res.createdAt ? new Date(res.createdAt) > cutoffDate : false;
              if (isDepositFuture) {
                futureTransfersByReceiver[dRecv.id] = (futureTransfersByReceiver[dRecv.id] || 0) + depositAmt;
              }
            }
          }
        }
      }

      // Final payment (only for PAID reservations)
      if (isPaid) {
        const remainingAmt = Math.max(0, totalARS - depositAmt);
        if (remainingAmt > 0) {
          const payMethod = res.paymentMethod || "CASH";
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

              if (cutoffDate) {
                const isFinalPaymentFuture = (new Date(res.checkIn) > cutoffDate) || (res.createdAt ? new Date(res.createdAt) > cutoffDate : false);
                if (isFinalPaymentFuture) {
                  futureTransfersByReceiver[payRecv.id] = (futureTransfersByReceiver[payRecv.id] || 0) + remainingAmt;
                }
              }
            }
          }
        }
        totalCollectedIncome += totalARS;
      } else if (isPartial) {
        totalCollectedIncome += depositAmt;
      }
    }

    // IF ACTIVE ADJUSTMENT: override transfer amounts per receiver and calculate remaining cash
    if (activeAdjustment) {
      const adjustedTransferByReceiver: Record<string, { name: string; amount: number; manualBase: number; futureTransfer: number }> = {};
      let adjustedTotalTransfer = 0;

      receivers.forEach((recv) => {
        const manualBase = activeAdjustment.receivers && activeAdjustment.receivers[recv.id] !== undefined
          ? Number(activeAdjustment.receivers[recv.id])
          : 0;
        const futureTransfer = futureTransfersByReceiver[recv.id] || 0;
        const total = manualBase + futureTransfer;
        adjustedTransferByReceiver[recv.id] = {
          name: recv.name,
          amount: total,
          manualBase,
          futureTransfer,
        };
        adjustedTotalTransfer += total;
      });

      const adjustedTotalCash = Math.max(0, totalCollectedIncome - adjustedTotalTransfer - totalAirbnb);

      return {
        totalCash: adjustedTotalCash,
        totalTransfer: adjustedTotalTransfer,
        totalAirbnb,
        totalAirbnbUSD,
        airbnbCount,
        totalDeposits,
        depositCount,
        cancelledWithDepositCount,
        transferByReceiver: Object.values(adjustedTransferByReceiver),
        depositByReceiver: Object.values(depositByReceiver),
        isManualAdjustmentActive: true,
        activeAdjustment,
      };
    }

    return {
      totalCash,
      totalTransfer,
      totalAirbnb,
      totalAirbnbUSD,
      airbnbCount,
      totalDeposits,
      depositCount,
      cancelledWithDepositCount,
      transferByReceiver: Object.values(transferByReceiver),
      depositByReceiver: Object.values(depositByReceiver),
      isManualAdjustmentActive: false,
      activeAdjustment: null,
    };
  }, [periodReservations, dollarRate, activeAdjustment, receivers]);

  // Grand Total includes Cash + Transfer + Airbnb
  const grandTotal = computedStats.totalCash + computedStats.totalTransfer + computedStats.totalAirbnb;

  // Build pie segments dynamically from filtered period
  const pieSegments = useMemo(() => {
    const segments: { value: number; color: string; label: string }[] = [];
    if (computedStats.totalCash > 0) {
      segments.push({ value: computedStats.totalCash, color: "#22c55e", label: "Efectivo" });
    }
    if (computedStats.totalAirbnb > 0) {
      segments.push({ value: computedStats.totalAirbnb, color: "#f43f5e", label: "Airbnb" });
    }
    computedStats.transferByReceiver.forEach((r, i) => {
      if (r.amount > 0) {
        segments.push({ value: r.amount, color: COLORS[i % COLORS.length], label: `Transfer. ${r.name}` });
      }
    });
    return segments;
  }, [computedStats]);

  // ─── Expenses and Profit Split Calculations ───
  // Filter expenses by selected period
  const periodExpenses = useMemo(() => {
    return (expenses || []).filter((e) => {
      const d = new Date(e.date);
      const year = d.getFullYear();
      if (year !== filterYear) return false;
      if (filterMonth !== "all") {
        const month = d.getMonth();
        if (month !== Number(filterMonth)) return false;
      }
      return true;
    });
  }, [expenses, filterYear, filterMonth]);

  // Cleaning fees calculation for the period (only if enabled in balance config)
  const periodCleaningExpenses = useMemo(() => {
    if (!cleaningExpenseEnabled) return 0;
    return periodReservations.reduce((acc, r) => {
      if (r.paymentStatus === "PAID" && r.status !== "NO_SHOW") {
        return acc + ((r as any).cleaningFee || 0);
      }
      return acc;
    }, 0);
  }, [periodReservations, cleaningExpenseEnabled]);

  // Direct expenses sum
  const directExpensesTotal = useMemo(() => {
    return periodExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);
  }, [periodExpenses]);

  const totalPeriodExpenses = directExpensesTotal + periodCleaningExpenses;
  const netPeriodProfit = grandTotal - totalPeriodExpenses;

  // Group expenses by receiver
  const expensesByReceiver = useMemo(() => {
    const map: Record<string, { name: string; amount: number; count: number }> = {};
    let unassigned = 0;
    let unassignedCount = 0;

    for (const exp of periodExpenses) {
      const recId = exp.paymentReceiverId || exp.paymentReceiver?.id;
      if (recId) {
        const recName = exp.paymentReceiver?.name || receivers.find((r) => r.id === recId)?.name || "Socio";
        if (!map[recId]) map[recId] = { name: recName, amount: 0, count: 0 };
        map[recId].amount += exp.amount;
        map[recId].count++;
      } else {
        unassigned += exp.amount;
        unassignedCount++;
      }
    }

    return {
      byReceiver: map,
      unassigned,
      unassignedCount,
    };
  }, [periodExpenses, receivers]);

  // Partner profit split & settlement
  // Partner profit split & settlement (incorporating Airbnb priority allocation to Guillermo)
  const partnerSettlements = useMemo(() => {
    if (receivers.length === 0) return [];

    const totalConfiguredPercent = receivers.reduce((sum, r) => sum + (r.profitSharePercent || 0), 0);
    const useConfigured = totalConfiguredPercent > 0;

    // Identify which receiver receives Airbnb in their external account (Guillermo Diarte)
    const airbnbReceiver =
      receivers.find((r) => r.name.toLowerCase().includes("guillermo")) || receivers[0];

    const airbnbTotal = computedStats.totalAirbnb;
    const totalProfit = Math.max(0, netPeriodProfit);

    // Calculate base share percentages and ideal target profits
    const receiverShares = receivers.map((recv) => {
      const sharePct = useConfigured
        ? (recv.profitSharePercent || 0) / 100
        : 1 / receivers.length;
      return {
        recv,
        sharePct,
        targetProfit: totalProfit * sharePct,
        isAirbnbReceiver: recv.id === airbnbReceiver.id,
      };
    });

    // Non-Airbnb profit pool available to distribute
    const nonAirbnbProfit = Math.max(0, totalProfit - airbnbTotal);
    const othersTargetSum = receiverShares
      .filter((rs) => !rs.isAirbnbReceiver)
      .reduce((sum, rs) => sum + rs.targetProfit, 0);

    return receiverShares.map(({ recv, sharePct, targetProfit, isAirbnbReceiver }) => {
      // Local transfer amount that entered this receiver's local account
      const localTransferAmt = computedStats.transferByReceiver.find((t) => t.name === recv.name)?.amount || 0;

      // Airbnb amount (credited directly to Guillermo's foreign account)
      const airbnbIncome = isAirbnbReceiver ? airbnbTotal : 0;
      const totalIncomeInAccount = localTransferAmt + airbnbIncome;

      // Expenses paid by this receiver
      const expenseInfo = expensesByReceiver.byReceiver[recv.id];
      const expensesPaid = expenseInfo ? expenseInfo.amount : 0;

      // Net money currently in this partner's power
      const netHeld = totalIncomeInAccount - expensesPaid;

      // Entitled profit according to the business rule:
      // - If Airbnb <= Guillermo's target share: both receive their full target share.
      // - If Airbnb > Guillermo's target share: Guillermo gets 100% of Airbnb, and others share the remaining non-Airbnb profit.
      let entitledProfit = 0;
      if (isAirbnbReceiver) {
        if (nonAirbnbProfit >= othersTargetSum) {
          entitledProfit = targetProfit;
        } else {
          entitledProfit = airbnbTotal;
        }
      } else {
        if (nonAirbnbProfit >= othersTargetSum) {
          entitledProfit = targetProfit;
        } else {
          entitledProfit = othersTargetSum > 0 ? nonAirbnbProfit * (targetProfit / othersTargetSum) : 0;
        }
      }

      // Settlement adjustment:
      // Entitled profit minus net money already held.
      // > 0: what this partner withdraws from physical cash box (A cobrar en efectivo)
      // < 0: partner holds surplus and must contribute (A transferir / liquidar)
      const settlementAdjustment = entitledProfit - netHeld;

      return {
        receiver: recv,
        sharePct: sharePct * 100,
        isAirbnbReceiver,
        localTransferAmt,
        airbnbIncome,
        totalIncomeInAccount,
        expensesPaid,
        netHeld,
        entitledProfit,
        settlementAdjustment,
      };
    });
  }, [receivers, computedStats, expensesByReceiver, netPeriodProfit]);

  // Filter table rows by method & receiver within the selected period
  const filtered = useMemo(() => {
    return periodReservations.filter((r) => {
      const isCancelled = r.status === "CANCELLED" || r.paymentStatus === "CANCELLED";
      const isAirbnb = r.source === "AIRBNB";

      if (filterMethod !== "all") {
        if (filterMethod === "CASH" && (r.paymentMethod !== "CASH" || isAirbnb)) return false;
        if (filterMethod === "TRANSFER" && (r.paymentMethod !== "TRANSFER" || isAirbnb)) return false;
        if (filterMethod === "AIRBNB" && !isAirbnb) return false;
        if (filterMethod === "DEPOSIT" && (!r.depositAmount || r.depositAmount <= 0)) return false;
        if (filterMethod === "CANCELLED" && !isCancelled) return false;
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
    <div className="flex-1 space-y-6 w-full">
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

      {/* Primary Financial Summary: Ingresos, Gastos, Ganancia Neta */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
        <StatCard
          icon={TrendingUp}
          label="Ingresos Totales"
          amount={grandTotal}
          color="bg-emerald-500"
          sub={`${periodReservations.filter((r) => r.paymentStatus === "PAID" || (r.depositAmount || 0) > 0).length} reservas cobradas`}
        />
        <StatCard
          icon={Receipt}
          label="Gastos del Período"
          amount={totalPeriodExpenses}
          color="bg-rose-500"
          sub={
            cleaningExpenseEnabled
              ? `${periodExpenses.length} gastos + limpieza computada`
              : `${periodExpenses.length} gastos · limpieza sin computar`
          }
        />
        <StatCard
          icon={Scale}
          label="Ganancia Neta"
          amount={netPeriodProfit}
          color={netPeriodProfit >= 0 ? "bg-indigo-500" : "bg-red-500"}
          sub={`${formatCurrency(grandTotal)} - ${formatCurrency(totalPeriodExpenses)}`}
        />
      </div>

      {/* Payment Channels Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4">
        <StatCard
          icon={Banknote}
          label="Efectivo en Mano"
          amount={computedStats.totalCash}
          color="bg-emerald-500"
          sub={
            computedStats.isManualAdjustmentActive
              ? "Restante por ajuste manual"
              : grandTotal > 0
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
            computedStats.isManualAdjustmentActive
              ? "Base manual + posteriores"
              : grandTotal > 0
              ? `${Math.round((computedStats.totalTransfer / grandTotal) * 100)}% del total`
              : undefined
          }
        />
        <StatCard
          icon={Globe}
          label="Airbnb"
          amount={computedStats.totalAirbnb}
          color="bg-rose-500"
          sub={computedStats.airbnbCount > 0 ? `${computedStats.airbnbCount} res. · USD ${computedStats.totalAirbnbUSD.toFixed(1)}` : "0 reservas"}
        />
        <StatCard
          icon={Gift}
          label="Señas Recibidas"
          amount={computedStats.totalDeposits}
          color="bg-amber-500"
          sub={`${computedStats.depositCount} reservas con seña`}
        />
      </div>

      {/* Charts + Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
            <div>
              <h3 className="font-semibold text-base">Cobros por Transferencia Bancaria (Cuentas)</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {computedStats.isManualAdjustmentActive
                  ? "Montos fijados manualmente con fecha de corte."
                  : "Monto total ingresado en cuentas bancarias por transferencias."}
              </p>
            </div>

            {manualTransfersEditEnabled && !isVisualizer && (
              <div className="flex items-center gap-2 shrink-0">
                {computedStats.isManualAdjustmentActive && (
                  <button
                    type="button"
                    onClick={handleResetManualAdjustment}
                    disabled={resettingManualAdjustment}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer disabled:opacity-50"
                    title="Restablecer al cálculo 100% automático desde reservas"
                  >
                    {resettingManualAdjustment ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                    <span>Restablecer</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={openManualTransfersModal}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer shadow-2xs"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  <span>{computedStats.isManualAdjustmentActive ? "Editar Ajuste" : "Editar Montos"}</span>
                </button>
              </div>
            )}
          </div>

          {/* Active Manual Adjustment Banner */}
          {computedStats.isManualAdjustmentActive && computedStats.activeAdjustment && (
            <div className="mb-4 p-3 rounded-xl border border-amber-200 dark:border-amber-800/80 bg-amber-50/80 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between gap-2 flex-wrap font-semibold">
                  <span>Montos editados manualmente</span>
                  <span className="text-[11px] font-normal opacity-85">
                    {format(new Date(computedStats.activeAdjustment.editedAt), "dd/MM/yyyy HH:mm", { locale: es })} hs
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed opacity-90">
                  Se fijó una base manual y no se computan transferencias pasadas del mes. El restante de ingresos se computa en efectivo. Solo se suman las transferencias posteriores a la fecha de corte.
                </p>
              </div>
            </div>
          )}

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
              const item = computedStats.transferByReceiver.find((t) => t.name === recv.name);
              const total = item?.amount || 0;
              const manualBase = item?.manualBase;
              const futureTransfer = item?.futureTransfer;
              const depositAmt =
                computedStats.depositByReceiver.find((d) => d.name === recv.name)?.amount || 0;
              const finalPaymentAmt = Math.max(0, total - depositAmt);
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

                  {computedStats.isManualAdjustmentActive ? (
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground pt-0.5">
                      <span className="text-blue-600 dark:text-blue-400 font-semibold">
                        Base manual: {formatCurrency(manualBase || 0)}
                      </span>
                      {futureTransfer !== undefined && futureTransfer > 0 ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          + Posteriores: {formatCurrency(futureTransfer)}
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500">Sin transferencias posteriores</span>
                      )}
                    </div>
                  ) : (
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      {depositAmt > 0 && <span>Señas: {formatCurrency(depositAmt)}</span>}
                      {finalPaymentAmt > 0 && <span>Pagos finales: {formatCurrency(finalPaymentAmt)}</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* División de Ganancias y Liquidación entre Socios */}
      {receivers.length > 0 && (
        <div className="rounded-2xl border bg-white dark:bg-slate-900 shadow-xs p-5 md:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Users2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="font-bold text-lg">División de Ganancias y Liquidación entre Socios</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Cálculo del saldo neto en poder de cada socio (ingresos cobrados en su cuenta menos gastos que pagó) versus la ganancia que le corresponde.
              </p>
            </div>

            {isSuperAdmin && (
              <Link
                href="/dashboard/balance/config"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 transition-colors cursor-pointer"
              >
                <Settings className="h-3.5 w-3.5" /> Modificar % de Ganancias
              </Link>
            )}
          </div>

          {/* Partner Cards Grid - Full Width & Responsive */}
          <div
            className={cn(
              "grid gap-4 lg:gap-6 w-full",
              partnerSettlements.length === 1 && "grid-cols-1",
              partnerSettlements.length === 2 && "grid-cols-1 md:grid-cols-2",
              partnerSettlements.length >= 3 && "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
            )}
          >
            {partnerSettlements.map((item, i) => (
              <div
                key={item.receiver.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-4 sm:p-5 space-y-3.5 relative overflow-hidden shadow-2xs flex flex-col justify-between"
              >
                <div
                  className="absolute top-0 left-0 h-1.5 w-full"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />

                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2 pt-1">
                    <div>
                      <h4 className="font-bold text-base text-slate-900 dark:text-slate-100">{item.receiver.name}</h4>
                      {item.receiver.accountInfo && (
                        <p className="text-xs text-muted-foreground">{item.receiver.accountInfo}</p>
                      )}
                    </div>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50 shrink-0">
                      {item.sharePct.toFixed(1)}% participación
                    </span>
                  </div>

                  <div className="space-y-2 pt-1 text-xs sm:text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Cobrado en banco local:</span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-400">
                        {formatSignedCurrency(item.localTransferAmt, true)}
                      </span>
                    </div>

                    {item.isAirbnbReceiver && item.airbnbIncome > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Cobrado por Airbnb (cuenta exterior):</span>
                        <span className="font-bold text-blue-700 dark:text-blue-400">
                          {formatSignedCurrency(item.airbnbIncome, true)}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Gastos desembolsados:</span>
                      <span className="font-bold text-red-700 dark:text-red-400">
                        {item.expensesPaid > 0 ? formatSignedCurrency(-item.expensesPaid) : "$ 0"}
                      </span>
                    </div>

                    <div className="flex justify-between items-center border-t border-dashed border-slate-200 dark:border-slate-700 pt-2 font-medium">
                      <span className="text-slate-700 dark:text-slate-300 font-semibold">Dinero neto en su poder:</span>
                      <span
                        className={cn(
                          "font-bold",
                          item.netHeld < -0.001
                            ? "text-red-700 dark:text-red-400"
                            : item.netHeld > 0.001
                            ? "text-emerald-700 dark:text-emerald-400"
                            : "text-slate-800 dark:text-slate-200"
                        )}
                      >
                        {formatSignedCurrency(item.netHeld, item.netHeld > 0.001)}
                      </span>
                    </div>

                    <div className="flex flex-col pt-2 border-t border-slate-200 dark:border-slate-800">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-700 dark:text-slate-300 font-semibold">Ganancia que le corresponde:</span>
                        <span className="font-bold text-indigo-700 dark:text-indigo-400">
                          {formatCurrency(item.entitledProfit)}
                        </span>
                      </div>
                      {item.isAirbnbReceiver && item.airbnbIncome > 0 && (
                        <span className="text-[11px] text-muted-foreground mt-1">
                          ({formatCurrency(item.airbnbIncome)} cobrado por Airbnb + {formatCurrency(Math.max(0, item.entitledProfit - item.airbnbIncome))} a cobrar en efectivo)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Settlement Badge */}
                <div className="pt-2">
                  {item.settlementAdjustment > 0.5 ? (
                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs sm:text-sm font-semibold flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-medium">
                        <ArrowDownLeft className="h-4 w-4 text-emerald-700 dark:text-emerald-400 shrink-0" /> A cobrar en efectivo:
                      </span>
                      <span className="text-sm sm:text-base font-extrabold text-emerald-700 dark:text-emerald-400">
                        {formatSignedCurrency(item.settlementAdjustment, true)}
                      </span>
                    </div>
                  ) : item.settlementAdjustment < -0.5 ? (
                    <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-red-900 dark:text-red-200 text-xs sm:text-sm font-semibold flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-medium">
                        <ArrowUpRight className="h-4 w-4 text-red-700 dark:text-red-400 shrink-0" /> A transferir / compensar:
                      </span>
                      <span className="text-sm sm:text-base font-extrabold text-red-700 dark:text-red-400">
                        {formatSignedCurrency(item.settlementAdjustment)}
                      </span>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-semibold flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" /> Saldo al día:
                      </span>
                      <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">$ 0</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Cash Box Banner */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm text-emerald-950 dark:text-emerald-100">
            <div className="flex items-center gap-2">
              <Banknote className="h-4 w-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
              <span>
                <strong>Efectivo en mano (caja física): {formatCurrency(computedStats.totalCash)}.</strong> Es el dinero disponible en billetes para que cada socio retire su monto <strong>"A cobrar en efectivo"</strong>.
              </span>
            </div>
            {computedStats.totalAirbnb > 0 && (
              <span className="shrink-0 font-medium text-slate-700 dark:text-slate-300">
                Airbnb: <strong className="text-blue-700 dark:text-blue-400">{formatCurrency(computedStats.totalAirbnb)}</strong> (en cuenta exterior de Guillermo)
              </span>
            )}
          </div>
        </div>
      )}

      {/* Gastos del Período */}
      <div className="rounded-2xl border bg-white dark:bg-slate-900 shadow-xs p-5 md:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-red-700 dark:text-red-400" />
              <h3 className="font-bold text-lg">Gastos del Período</h3>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Desglose de gastos registrados en Finanzas y asignados a cada socio según quién los pagó.
            </p>
          </div>
          <Link
            href="/dashboard/finance"
            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 cursor-pointer"
          >
            Ir a Finanzas →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl border bg-slate-50/60 dark:bg-slate-800/40">
            <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider block">Total Gastos</span>
            <span className="text-lg font-bold text-red-700 dark:text-red-400 block mt-0.5">
              {formatSignedCurrency(-totalPeriodExpenses)}
            </span>
            <span className="text-[10px] text-muted-foreground block mt-1">
              {periodExpenses.length} movimientos en total
            </span>
          </div>

          {receivers.map((recv) => {
            const expInfo = expensesByReceiver.byReceiver[recv.id];
            const amt = expInfo?.amount || 0;
            const count = expInfo?.count || 0;
            return (
              <div key={recv.id} className="p-3.5 rounded-xl border bg-slate-50/60 dark:bg-slate-800/40">
                <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider block truncate">
                  Pagado por {recv.name}
                </span>
                <span className="text-lg font-bold text-red-700 dark:text-red-400 block mt-0.5">
                  {amt > 0 ? formatSignedCurrency(-amt) : "$ 0"}
                </span>
                <span className="text-[10px] text-muted-foreground block mt-1">
                  {count} {count === 1 ? "gasto registrado" : "gastos registrados"}
                </span>
              </div>
            );
          })}

          {expensesByReceiver.unassigned > 0 && (
            <div className="p-3.5 rounded-xl border bg-slate-50/60 dark:bg-slate-800/40">
              <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider block truncate">
                Sin Socio Asignado
              </span>
              <span className="text-lg font-bold text-red-700 dark:text-red-400 block mt-0.5">
                {formatSignedCurrency(-expensesByReceiver.unassigned)}
              </span>
              <span className="text-[10px] text-muted-foreground block mt-1">
                {expensesByReceiver.unassignedCount} gastos generales
              </span>
            </div>
          )}

          <div className="p-3.5 rounded-xl border bg-slate-50/60 dark:bg-slate-800/40">
            <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider block truncate">
              Gastos de Limpieza
            </span>
            <span className="text-lg font-bold text-red-700 dark:text-red-400 block mt-0.5">
              {periodCleaningExpenses > 0 ? formatSignedCurrency(-periodCleaningExpenses) : "$ 0"}
            </span>
            <span className="text-[10px] text-muted-foreground block mt-1">
              {cleaningExpenseEnabled ? "Activado (se resta del balance)" : "Desactivado (métrica de ref.)"}
            </span>
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
          <option value="AIRBNB">Airbnb</option>
          <option value="DEPOSIT">Con seña</option>
          <option value="CANCELLED">Canceladas con seña</option>
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
                {!isVisualizer && (
                  <th className="text-center px-4 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wide">
                    Acción
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={isVisualizer ? 6 : 7} className="text-center py-10 text-muted-foreground text-sm">
                    Sin reservas para los filtros seleccionados ({periodLabel}).
                  </td>
                </tr>
              )}
              {filtered.map((res) => {
                const isCancelled = res.status === "CANCELLED" || res.paymentStatus === "CANCELLED";
                const isAirbnb = res.source === "AIRBNB";
                const isUSD = res.currency === "USD";
                const rate = res.exchangeRate && res.exchangeRate > 1 ? res.exchangeRate : dollarRate;
                const totalARS = isUSD ? res.totalAmount * rate : res.totalAmount;
                const depositARS = isUSD ? (res.depositAmount || 0) * rate : res.depositAmount || 0;
                const remaining = Math.max(0, totalARS - depositARS);

                return (
                  <tr key={res.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors">
                    {/* Guest */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium">{res.guestName}</span>
                        {isAirbnb && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-md">
                            Airbnb
                          </span>
                        )}
                        {isCancelled && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 rounded-md">
                            Cancelada
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Department */}
                    <td className="px-4 py-3 text-muted-foreground">{res.department.name}</td>

                    {/* Dates */}
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {format(new Date(res.checkIn), "dd/MM/yy")} → {format(new Date(res.checkOut), "dd/MM/yy")}
                    </td>

                    {/* Total */}
                    <td className="px-4 py-3 text-right">
                      <div className="font-bold">{formatCurrency(totalARS)}</div>
                      {isUSD && (
                        <div className="text-[10px] text-muted-foreground">USD {res.totalAmount.toFixed(2)}</div>
                      )}
                      {isCancelled && (
                        <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                          Seña retenida: {formatCurrency(depositARS)}
                        </div>
                      )}
                    </td>

                    {/* Seña */}
                    <td className="px-4 py-3 text-center">
                      {depositARS > 0 ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="font-semibold text-amber-600 dark:text-amber-400">
                            {formatCurrency(depositARS)}
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

                    {/* Final Payment */}
                    <td className="px-4 py-3 text-center">
                      {isAirbnb ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 rounded-full">
                          AIRBNB PAY
                        </span>
                      ) : isCancelled ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-full">
                          SEÑA RETENIDA
                        </span>
                      ) : res.paymentStatus === "PAID" ? (
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

                    {/* Actions */}
                    {!isVisualizer && (
                      <td className="px-4 py-3 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(res)}
                          className="h-8 w-8 p-0 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg cursor-pointer"
                          title="Editar método o cuenta de pago"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Edit Payment Modal ─── */}
      <Dialog open={!isVisualizer && !!editingRes} onOpenChange={(open) => !open && setEditingRes(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Editar Información de Pago</DialogTitle>
            <DialogDescription>
              {editingRes?.guestName} · Depto {editingRes?.department.name}
            </DialogDescription>
          </DialogHeader>

          {editingRes && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Monto Total de la Reserva:</span>
                <span className="font-bold text-base">
                  {formatCurrency(
                    editingRes.currency === "USD"
                      ? editingRes.totalAmount * (editingRes.exchangeRate && editingRes.exchangeRate > 1 ? editingRes.exchangeRate : dollarRate)
                      : editingRes.totalAmount
                  )}
                  {editingRes.currency === "USD" && (
                    <span className="text-xs text-muted-foreground font-normal ml-1">
                      (USD {editingRes.totalAmount.toFixed(2)})
                    </span>
                  )}
                </span>
              </div>

              {/* 1. SEÑA */}
              <div className="space-y-2 border-t pt-3">
                <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">1. Seña / Anticipo</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Monto Seña</label>
                    <Input
                      type="number"
                      value={editForm.depositAmount}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, depositAmount: Number(e.target.value) }))}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Método de Seña</label>
                    <select
                      value={editForm.depositMethod}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, depositMethod: e.target.value }))}
                      className="w-full text-sm px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none"
                    >
                      <option value="TRANSFER">Transferencia</option>
                      <option value="CASH">Efectivo</option>
                    </select>
                  </div>
                </div>

                {editForm.depositMethod === "TRANSFER" && (
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Cuenta / Receptor de la Seña</label>
                    <select
                      value={editForm.depositReceiverId}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, depositReceiverId: e.target.value }))}
                      className="w-full text-sm px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none font-medium"
                    >
                      <option value="">Seleccionar cuenta receptor...</option>
                      {receivers.map((rec) => (
                        <option key={rec.id} value={rec.id}>
                          {rec.name} {rec.accountInfo ? `(${rec.accountInfo})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* 2. PAGO FINAL / SALDO */}
              <div className="space-y-2 border-t pt-3">
                <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">2. Pago Final / Saldo</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Estado de Pago</label>
                    <select
                      value={editForm.paymentStatus}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, paymentStatus: e.target.value }))}
                      className="w-full text-sm px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none font-medium"
                    >
                      <option value="PAID">PAGADO (Completo)</option>
                      <option value="PARTIAL">PARCIAL (Solo seña)</option>
                      <option value="UNPAID">PENDIENTE</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Método de Pago Final</label>
                    <select
                      value={editForm.paymentMethod}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, paymentMethod: e.target.value }))}
                      className="w-full text-sm px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none"
                    >
                      <option value="CASH">Efectivo</option>
                      <option value="TRANSFER">Transferencia</option>
                    </select>
                  </div>
                </div>

                {editForm.paymentMethod === "TRANSFER" && (
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Cuenta / Receptor Pago Final</label>
                    <select
                      value={editForm.paymentReceiverId}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, paymentReceiverId: e.target.value }))}
                      className="w-full text-sm px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none font-medium"
                    >
                      <option value="">Seleccionar cuenta receptor...</option>
                      {receivers.map((rec) => (
                        <option key={rec.id} value={rec.id}>
                          {rec.name} {rec.accountInfo ? `(${rec.accountInfo})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setEditingRes(null)}
              disabled={savingEdit}
              className="cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSavePayment}
              disabled={savingEdit}
              className="bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer font-medium"
            >
              {savingEdit ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Check className="h-4 w-4 mr-1.5" />}
              {savingEdit ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Manual Transfers Adjustment Dialog ─── */}
      <Dialog open={isManualModalOpen} onOpenChange={(open) => !savingManualAdjustment && setIsManualModalOpen(open)}>
        <DialogContent className="max-w-md w-full">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Pencil className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Ajuste Manual de Transferencias
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Establece el monto real acumulado por transferencia en cada cuenta bancaria para este período.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Month selector if in 'all' view or display current month */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Período a ajustar:</span>
              <div className="flex items-center gap-2">
                <select
                  value={manualModalMonth}
                  onChange={(e) => {
                    const newM = e.target.value;
                    setManualModalMonth(newM);
                    const k = `${filterYear}_${newM}`;
                    const ex = manualTransfers[k];
                    const nextAmounts: Record<string, number> = {};
                    receivers.forEach((r) => {
                      if (ex?.receivers && ex.receivers[r.id] !== undefined) {
                        nextAmounts[r.id] = ex.receivers[r.id];
                      } else {
                        nextAmounts[r.id] = 0;
                      }
                    });
                    setManualModalAmounts(nextAmounts);
                  }}
                  className="font-bold bg-white dark:bg-slate-900 border rounded-lg px-2.5 py-1 text-xs focus:outline-none cursor-pointer"
                >
                  {MONTHS.filter((m) => m.value !== "all").map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label} {filterYear}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Explanatory Notice */}
            <div className="p-3 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/20 text-blue-900 dark:text-blue-300 text-xs space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <Info className="h-4 w-4 shrink-0" />
                ¿Cómo funciona este ajuste?
              </p>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px] opacity-90">
                <li>Los montos fijados reemplazan las transferencias registradas hasta la fecha.</li>
                <li>El resto de los ingresos del mes se asigna automáticamente a <strong>efectivo en mano</strong>.</li>
                <li>Las transferencias ingresadas con fecha posterior se sumarán al monto base.</li>
              </ul>
            </div>

            {/* Inputs per receiver */}
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {receivers.map((recv) => {
                const currentVal = manualModalAmounts[recv.id] !== undefined ? manualModalAmounts[recv.id] : 0;
                return (
                  <div key={recv.id} className="p-3 rounded-xl border bg-white dark:bg-slate-900 shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-semibold block">{recv.name}</span>
                        {recv.accountInfo && (
                          <span className="text-[10px] text-muted-foreground block">{recv.accountInfo}</span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrency(currentVal)}
                      </span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs font-bold text-muted-foreground">$</span>
                      <Input
                        type="number"
                        min="0"
                        step="100"
                        className="pl-7 text-sm font-semibold"
                        placeholder="0"
                        value={currentVal === 0 ? "" : currentVal}
                        onChange={(e) => {
                          const val = Math.max(0, Number(e.target.value) || 0);
                          setManualModalAmounts((prev) => ({
                            ...prev,
                            [recv.id]: val,
                          }));
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total Preview */}
            <div className="flex items-center justify-between pt-2 border-t text-sm font-bold">
              <span>Total Transferencias Base:</span>
              <span className="text-blue-600 dark:text-blue-400">
                {formatCurrency(Object.values(manualModalAmounts).reduce((a, b) => a + (Number(b) || 0), 0))}
              </span>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => setIsManualModalOpen(false)}
              disabled={savingManualAdjustment}
              className="cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSaveManualAdjustment}
              disabled={savingManualAdjustment}
              className="bg-blue-600 hover:bg-blue-700 text-white cursor-pointer font-semibold"
            >
              {savingManualAdjustment ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <Check className="h-4 w-4 mr-1.5" />
              )}
              {savingManualAdjustment ? "Guardando..." : "Guardar Ajuste"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
