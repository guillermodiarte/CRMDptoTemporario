"use client";

import { useState, useEffect } from "react";
import { Department, Expense } from "@prisma/client";
import { Pencil, Trash2, Plus, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExpenseForm } from "./expense-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { MonthSelector } from "./month-selector";
import { FinanceActions } from "./finance-actions";
import { formatCurrency, formatAxisNumber } from "@/lib/utils";
import { useRouter } from "next/navigation";
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

interface FinanceViewProps {
  expenses: (Expense & { department: { name: string } | null })[];
  departments: Department[];
  monthlyStats: any[];
  distribution: any[];
  summary: { totalIncome: number; totalExpense: number; netProfit: number };
  role?: string;
  date?: Date;
  platformStats?: any[];
  departmentStats?: any[];
  startYear?: number;
  endYear?: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];
const PLATFORM_COLORS: Record<string, string> = {
  'AIRBNB': '#FF5A5F', // Airbnb Red
  'BOOKING': '#003580', // Booking Blue
  'DIRECT': '#10b981',  // Green
  'OTHER': '#888888'
};

export function FinanceView({ expenses, departments, monthlyStats, distribution, summary, role, date = new Date(), departmentStats = [], platformStats = [], startYear, endYear }: FinanceViewProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const isVisualizer = role === 'VISUALIZER';

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const supplyExpenses = expenses.filter(e => e.type === 'SUPPLY');
  const taxExpenses = expenses.filter(e => e.type === 'TAX');
  const commissionExpenses = expenses.filter(e => e.type === 'COMMISSION');

  const onEdit = (expense: any) => {
    setEditingExpense(expense);
    setOpen(true);
  };

  const onDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      router.refresh();
      setDeleteId(null);
    } catch (error) {
      alert("Error eliminando");
    } finally {
      setIsDeleting(false);
    }
  };

  const onAddWithType = (type: string) => {
    setEditingExpense({
      type,
      description: "",
      amount: 0,
      quantity: 1,
      unitPrice: 0,
      departmentId: "global",
    });
    setOpen(true);
  };

  const renderExpenseTable = (list: typeof expenses, title: string, showDetails: boolean = false, defaultType?: string) => (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
        {!isVisualizer && defaultType && (
          <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => onAddWithType(defaultType)}>
            <Plus className="h-3 w-3" /> <span className="sr-only sm:not-sr-only sm:inline-block">Agregar</span>
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0 overflow-auto max-h-[400px]">
        {/* Desktop Table */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Fecha</TableHead>
                <TableHead>Detalle</TableHead>
                {showDetails && <TableHead className="text-right text-xs">Cant.</TableHead>}
                {showDetails && <TableHead className="text-right text-xs">P. Unit</TableHead>}
                <TableHead className="text-right">Total</TableHead>
                {!isVisualizer && <TableHead className="w-[90px]"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((exp) => (
                <TableRow key={exp.id} className="group">
                  <TableCell className="text-xs">{format(new Date(exp.date), "dd/MM")}</TableCell>
                  <TableCell className="text-xs">
                    <div className="font-medium truncate max-w-[120px] lg:max-w-none">{exp.description}</div>
                    <div className="text-muted-foreground text-[10px] truncate">{exp.department?.name || "Global"}</div>
                  </TableCell>
                  {showDetails && <TableCell className="text-right text-xs">{exp.quantity || 1}</TableCell>}
                  {showDetails && <TableCell className="text-right text-xs">{formatCurrency(exp.unitPrice || 0)}</TableCell>}
                  <TableCell className="text-right text-xs font-medium">{formatCurrency(exp.amount)}</TableCell>
                  {!isVisualizer && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEdit(exp)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-600" onClick={() => setDeleteId(exp.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {list.length === 0 && (
                <TableRow>
                  <TableCell colSpan={showDetails ? (isVisualizer ? 5 : 6) : (isVisualizer ? 3 : 4)} className="text-center text-xs text-muted-foreground h-16">
                    Sin movimientos
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile List View */}
        <div className="md:hidden">
          {list.map((exp) => (
            <div key={exp.id} className="p-3 border-b last:border-0 flex justify-between items-start gap-2">
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm whitespace-normal break-words leading-tight">{exp.description}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{format(new Date(exp.date), "dd/MM")} • {exp.department?.name || "Global"}</div>
                {showDetails && ((exp.quantity || 0) > 1 || (exp.unitPrice || 0) > 0) && (
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {exp.quantity || 1} x {formatCurrency(exp.unitPrice || 0)}
                  </div>
                )}
              </div>
              <div className="text-right shrink-0">
                <div className="font-bold text-sm text-red-600">-${exp.amount}</div>
                {!isVisualizer && (
                  <div className="flex justify-end gap-1 mt-1">
                    <Button variant="outline" size="sm" onClick={() => onEdit(exp)} className="h-8 px-3 text-xs">
                      Editar
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => setDeleteId(exp.id)} className="h-8 w-8 p-0">
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {list.length === 0 && (
            <div className="text-center py-6 text-xs text-muted-foreground">
              Sin movimientos
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  // Determine default date for new expenses
  const today = new Date();
  const isCurrentMonth = date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
  const formDefaultDate = isCurrentMonth ? today : date;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="w-full md:w-auto">
          <h2 className="text-3xl font-bold tracking-tight">Finanzas</h2>
          <div className="mt-2 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <MonthSelector startYear={startYear} endYear={endYear} />
            <FinanceActions expenses={expenses} departments={departments} date={date} />
          </div>
        </div>

        {!isVisualizer && isMounted && (
          <Dialog open={open} onOpenChange={(val) => {
            setOpen(val);
            if (!val) setEditingExpense(null);
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingExpense(null)} className="w-full md:w-auto">
                <Plus className="mr-2 h-4 w-4" /> Agregar Gasto
              </Button>
            </DialogTrigger>
            <DialogContent onCloseAutoFocus={(e) => e.preventDefault()}>
              <DialogHeader>
                <DialogTitle>{editingExpense?.id ? "Editar Gasto" : "Agregar Gasto"}</DialogTitle>
              </DialogHeader>
              <ExpenseForm
                departments={departments}
                setOpen={setOpen}
                initialData={editingExpense}
                defaultDate={formDefaultDate}
              />
            </DialogContent>
          </Dialog>
        )}

        {isMounted && (
          <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
            <AlertDialogContent onCloseAutoFocus={(e) => e.preventDefault()}>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar gasto?</AlertDialogTitle>
                <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteId && onDelete(deleteId)} className="bg-red-600">
                  {isDeleting ? "Eliminando..." : "Eliminar"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-2 grid-cols-3 md:gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="p-2 md:p-6 pb-1 md:pb-2">
            <CardTitle className="text-base md:text-sm font-bold leading-tight md:leading-none text-center md:text-left">
              <span className="md:hidden">Ingresos</span>
              <span className="hidden md:inline">Ingresos Totales (Mes)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 md:p-6 pt-0 md:pt-0 text-center md:text-left">
            <div className="text-xl md:text-2xl font-bold text-green-600 truncate tracking-tight">
              <span className="md:hidden">+{formatCurrency(summary.totalIncome, 'ARS', 0)}</span>
              <span className="hidden md:inline">+{formatCurrency(summary.totalIncome)}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-2 md:p-6 pb-1 md:pb-2">
            <CardTitle className="text-base md:text-sm font-bold leading-tight md:leading-none text-center md:text-left">
              <span className="md:hidden">Gastos</span>
              <span className="hidden md:inline">Gastos Totales (Mes)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 md:p-6 pt-0 md:pt-0 text-center md:text-left">
            <div className="text-xl md:text-2xl font-bold text-red-600 truncate tracking-tight">
              <span className="md:hidden">-{formatCurrency(summary.totalExpense, 'ARS', 0)}</span>
              <span className="hidden md:inline">-{formatCurrency(summary.totalExpense)}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-2 md:p-6 pb-1 md:pb-2">
            <CardTitle className="text-base md:text-sm font-bold leading-tight md:leading-none text-center md:text-left">
              <span className="md:hidden">Ganancia</span>
              <span className="hidden md:inline">Ganancia Neta (Mes)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 md:p-6 pt-0 md:pt-0 text-center md:text-left">
            <div className="text-xl md:text-2xl font-bold text-blue-600 truncate tracking-tight">
              <span className="md:hidden">{formatCurrency(summary.netProfit, 'ARS', 0)}</span>
              <span className="hidden md:inline">{formatCurrency(summary.netProfit)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Charts Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Ganancia por Departamento (Mes)</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={departmentStats}>
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => formatAxisNumber(value)} width={80} />
                <Tooltip formatter={(value: number | undefined) => formatCurrency(value || 0)} />
                <Legend />
                <Bar dataKey="income" name="Ingresos" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" name="Ganancia" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gastos por Tipo (Mes)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={distribution.map(d => ({
                    ...d,
                    name: d.name === "COMMISSION" ? "Comisión" :
                      d.name === "TAX" ? "Impuestos" :
                        d.name === "SUPPLY" ? "Insumos" :
                          d.name === "Limpieza" ? "Limpieza" : d.name
                  }))}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Global Anual (Ingresos vs Gastos)</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyStats}>
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => formatAxisNumber(value)} width={80} />
                <Tooltip formatter={(value: number | undefined) => formatCurrency(value || 0)} />
                <Legend />
                <Bar dataKey="income" name="Ingresos" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Middle Row: Platform Chart, Tax, Commission */}
      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-3">
        {/* Platform Pie Chart */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Reservas por Plataforma</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={platformStats}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {platformStats.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={PLATFORM_COLORS[entry.name] || PLATFORM_COLORS['OTHER']}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any, name: string) => [
                    `${value} reservas`,
                    name === 'AIRBNB' ? 'Airbnb' : name === 'BOOKING' ? 'Booking' : name === 'DIRECT' ? 'Directo' : name
                  ]}
                />
                <Legend formatter={(val) => {
                  const label = val === 'AIRBNB' ? 'Airbnb' : val === 'BOOKING' ? 'Booking' : val === 'DIRECT' ? 'Directo' : val;
                  const count = platformStats.find(p => p.name === val)?.value || 0;
                  return `${label} (${count})`;
                }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tax Table */}
        <div className="col-span-1">
          {renderExpenseTable(taxExpenses, "Impuestos y Servicios", false, "TAX")}
        </div>

        {/* Commission Table */}
        <div className="col-span-1">
          {renderExpenseTable(commissionExpenses, "Comisiones Booking/Airbnb", false, "COMMISSION")}
        </div>

        {/* Supply Table (Span 2 columns) */}
        <div className="col-span-1 lg:col-span-2">
          {renderExpenseTable(supplyExpenses, "Insumos y Mantenimiento", true, "SUPPLY")}
        </div>
      </div>
    </div>
  );
}
