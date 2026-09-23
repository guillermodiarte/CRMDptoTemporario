"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatSignedCurrency, cn } from "@/lib/utils";
import {
  Receipt,
  Wrench,
  FileText,
  Percent,
  ExternalLink,
  Calendar,
  User,
  ArrowDownLeft,
} from "lucide-react";

export interface ModalExpenseRow {
  id: string;
  type: string;
  description: string;
  amount: number;
  quantity?: number | null;
  unitPrice?: number | null;
  date: string | Date;
  department?: { name: string } | null;
  paymentReceiver?: { id: string; name: string } | null;
  paymentReceiverId?: string | null;
}

interface PartnerExpensesModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiverName: string;
  periodLabel: string;
  expenses: ModalExpenseRow[];
  totalExpensesAmount?: number;
}

export function PartnerExpensesModal({
  isOpen,
  onClose,
  receiverName,
  periodLabel,
  expenses,
  totalExpensesAmount,
}: PartnerExpensesModalProps) {
  const [activeTab, setActiveTab] = useState<"all" | "SUPPLY" | "TAX" | "COMMISSION">("all");

  const supplyExpenses = useMemo(
    () => expenses.filter((e) => e.type === "SUPPLY"),
    [expenses]
  );
  const taxExpenses = useMemo(
    () => expenses.filter((e) => e.type === "TAX"),
    [expenses]
  );
  const commissionExpenses = useMemo(
    () => expenses.filter((e) => e.type === "COMMISSION"),
    [expenses]
  );

  const supplyTotal = useMemo(
    () => supplyExpenses.reduce((sum, e) => sum + (e.amount || 0), 0),
    [supplyExpenses]
  );
  const taxTotal = useMemo(
    () => taxExpenses.reduce((sum, e) => sum + (e.amount || 0), 0),
    [taxExpenses]
  );
  const commissionTotal = useMemo(
    () => commissionExpenses.reduce((sum, e) => sum + (e.amount || 0), 0),
    [commissionExpenses]
  );

  const computedTotal = supplyTotal + taxTotal + commissionTotal;
  const displayTotal = totalExpensesAmount ?? computedTotal;

  const renderExpenseSection = (
    list: ModalExpenseRow[],
    title: string,
    icon: React.ReactNode,
    total: number,
    showDetails: boolean = false,
    colorClasses: { bg: string; text: string; border: string; badge: string }
  ) => {
    return (
      <div className={cn("rounded-xl border bg-card overflow-hidden shadow-xs", colorClasses.border)}>
        {/* Header of Section */}
        <div className={cn("px-4 py-3 border-b flex items-center justify-between flex-wrap gap-2", colorClasses.bg)}>
          <div className="flex items-center gap-2">
            <span className={cn("p-1.5 rounded-lg", colorClasses.badge)}>
              {icon}
            </span>
            <div>
              <h4 className="font-bold text-sm text-foreground">{title}</h4>
              <span className="text-[11px] text-muted-foreground">
                {list.length} {list.length === 1 ? "movimiento" : "movimientos"}
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className={cn("font-bold text-sm block", colorClasses.text)}>
              {total > 0 ? formatSignedCurrency(-total) : "$ 0"}
            </span>
            <span className="text-[10px] text-muted-foreground">Subtotal sección</span>
          </div>
        </div>

        {/* Desktop View Table */}
        <div className="hidden md:block overflow-x-auto max-h-[320px]">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40 text-xs">
                <TableHead className="w-[85px] py-2">Fecha</TableHead>
                <TableHead className="py-2">Detalle / Concepto</TableHead>
                <TableHead className="w-[120px] py-2">Depto.</TableHead>
                {showDetails && <TableHead className="w-[60px] text-right py-2">Cant.</TableHead>}
                {showDetails && <TableHead className="w-[90px] text-right py-2">P. Unit</TableHead>}
                <TableHead className="w-[110px] text-right py-2">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((exp) => (
                <TableRow key={exp.id} className="hover:bg-muted/30 text-xs">
                  <TableCell className="font-medium text-muted-foreground whitespace-nowrap">
                    {format(new Date(exp.date), "dd/MM/yyyy")}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-foreground">{exp.description}</div>
                    {exp.paymentReceiver && (
                      <span className="text-[10px] text-muted-foreground">
                        Pagó: {exp.paymentReceiver.name}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] font-normal py-0 px-1.5 truncate max-w-[110px]">
                      {exp.department?.name || "Global"}
                    </Badge>
                  </TableCell>
                  {showDetails && (
                    <TableCell className="text-right text-muted-foreground">
                      {exp.quantity || 1}
                    </TableCell>
                  )}
                  {showDetails && (
                    <TableCell className="text-right text-muted-foreground whitespace-nowrap">
                      {exp.unitPrice ? formatCurrency(exp.unitPrice) : "-"}
                    </TableCell>
                  )}
                  <TableCell className="text-right font-bold text-red-600 dark:text-red-400 whitespace-nowrap">
                    -{formatCurrency(exp.amount)}
                  </TableCell>
                </TableRow>
              ))}

              {list.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={showDetails ? 6 : 4}
                    className="text-center py-6 text-xs text-muted-foreground"
                  >
                    No se registraron gastos en esta sección para este período.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile View List */}
        <div className="md:hidden divide-y divide-border max-h-[320px] overflow-y-auto">
          {list.map((exp) => (
            <div key={exp.id} className="p-3 flex justify-between items-start gap-2 text-xs">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="font-medium text-foreground leading-snug">{exp.description}</div>
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span>{format(new Date(exp.date), "dd/MM/yy")}</span>
                  <span>•</span>
                  <Badge variant="secondary" className="text-[9px] py-0 px-1 font-normal">
                    {exp.department?.name || "Global"}
                  </Badge>
                </div>
                {showDetails && (exp.quantity || 1) > 1 && (
                  <div className="text-[10px] text-muted-foreground">
                    {exp.quantity} x {exp.unitPrice ? formatCurrency(exp.unitPrice) : ""}
                  </div>
                )}
              </div>
              <div className="text-right shrink-0">
                <span className="font-bold text-red-600 dark:text-red-400 block">
                  -{formatCurrency(exp.amount)}
                </span>
              </div>
            </div>
          ))}

          {list.length === 0 && (
            <div className="p-6 text-center text-xs text-muted-foreground">
              No se registraron gastos en esta sección para este período.
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-5 pb-4 border-b bg-slate-50/70 dark:bg-slate-900/70 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400">
                  <Receipt className="h-4 w-4" />
                </div>
                <DialogTitle className="text-lg font-bold">
                  Gastos Desembolsados: {receiverName}
                </DialogTitle>
              </div>
              <DialogDescription className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" /> {periodLabel}
                </span>
                <span>•</span>
                <span>{expenses.length} {expenses.length === 1 ? "gasto registrado" : "gastos registrados"}</span>
              </DialogDescription>
            </div>

            {/* Total pill */}
            <div className="flex items-center gap-3">
              <div className="px-3.5 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/70 text-right">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                  Total Desembolsado
                </span>
                <span className="text-base sm:text-lg font-extrabold text-red-700 dark:text-red-400">
                  {displayTotal > 0 ? formatSignedCurrency(-displayTotal) : "$ 0"}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Filter Tabs / Category Pills */}
          <div className="flex items-center gap-1.5 pt-3 overflow-x-auto">
            <Button
              variant={activeTab === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("all")}
              className="h-7 text-xs rounded-full px-3"
            >
              Todos ({expenses.length})
            </Button>
            <Button
              variant={activeTab === "SUPPLY" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("SUPPLY")}
              className="h-7 text-xs rounded-full px-3 flex items-center gap-1"
            >
              <Wrench className="h-3 w-3" />
              Insumos ({supplyExpenses.length}) • {formatCurrency(supplyTotal)}
            </Button>
            <Button
              variant={activeTab === "TAX" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("TAX")}
              className="h-7 text-xs rounded-full px-3 flex items-center gap-1"
            >
              <FileText className="h-3 w-3" />
              Impuestos ({taxExpenses.length}) • {formatCurrency(taxTotal)}
            </Button>
            <Button
              variant={activeTab === "COMMISSION" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("COMMISSION")}
              className="h-7 text-xs rounded-full px-3 flex items-center gap-1"
            >
              <Percent className="h-3 w-3" />
              Comisiones ({commissionExpenses.length}) • {formatCurrency(commissionTotal)}
            </Button>
          </div>
        </DialogHeader>

        {/* Body / Sections Container */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {expenses.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-xl border border-dashed text-muted-foreground">
              <Receipt className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm font-medium">No hay gastos registrados para este socio en el período.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Los gastos cargados en Finanzas con este socio asignado aparecerán aquí automáticamente.
              </p>
            </div>
          ) : (
            <>
              {(activeTab === "all" || activeTab === "SUPPLY") &&
                renderExpenseSection(
                  supplyExpenses,
                  "Insumos y Mantenimiento",
                  <Wrench className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
                  supplyTotal,
                  true,
                  {
                    bg: "bg-emerald-50/40 dark:bg-emerald-950/20",
                    text: "text-emerald-700 dark:text-emerald-400",
                    border: "border-emerald-200/70 dark:border-emerald-900/50",
                    badge: "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300",
                  }
                )}

              {(activeTab === "all" || activeTab === "TAX") &&
                renderExpenseSection(
                  taxExpenses,
                  "Impuestos y Servicios",
                  <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />,
                  taxTotal,
                  false,
                  {
                    bg: "bg-blue-50/40 dark:bg-blue-950/20",
                    text: "text-blue-700 dark:text-blue-400",
                    border: "border-blue-200/70 dark:border-blue-900/50",
                    badge: "bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300",
                  }
                )}

              {(activeTab === "all" || activeTab === "COMMISSION") &&
                renderExpenseSection(
                  commissionExpenses,
                  "Comisiones Booking/Airbnb",
                  <Percent className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
                  commissionTotal,
                  false,
                  {
                    bg: "bg-amber-50/40 dark:bg-amber-950/20",
                    text: "text-amber-700 dark:text-amber-400",
                    border: "border-amber-200/70 dark:border-amber-900/50",
                    badge: "bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300",
                  }
                )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-slate-50/70 dark:bg-slate-900/70 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <span>Para editar o añadir comprobantes, gestiona los movimientos desde Finanzas.</span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Link href="/dashboard/finance" onClick={onClose}>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                Ir a Finanzas <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <Button size="sm" onClick={onClose} className="text-xs">
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
