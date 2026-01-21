"use client";

import { useState, useEffect } from "react";
import { Department, Expense } from "@prisma/client";
import { Pencil, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExpenseForm } from "./expense-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { MonthSelector } from "./month-selector";
import { FinanceActions } from "./finance-actions";
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
  departmentStats?: any[];
  startYear?: number;
  endYear?: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export function FinanceView({ expenses, departments, monthlyStats, distribution, summary, role, date = new Date(), departmentStats = [], startYear, endYear }: FinanceViewProps) {
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

  const renderExpenseTable = (list: typeof expenses, title: string, showDetails: boolean = false) => (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
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
                  {showDetails && <TableCell className="text-right text-xs">${exp.unitPrice || 0}</TableCell>}
                  <TableCell className="text-right text-xs font-medium">${exp.amount}</TableCell>
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
                    {exp.quantity || 1} x ${exp.unitPrice || 0}
                  </div>
                )}
              </div>
              <div className="text-right shrink-0">
                <div className="font-bold text-sm text-red-600">-${exp.amount}</div>
                {!isVisualizer && (
                  <div className="flex justify-end gap-1 mt-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEdit(exp)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => setDeleteId(exp.id)}>
                      <Trash2 className="h-3 w-3" />
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
                <DialogTitle>{editingExpense ? "Editar Gasto" : "Agregar Gasto"}</DialogTitle>
              </DialogHeader>
              <ExpenseForm
                departments={departments}
                setOpen={setOpen}
                initialData={editingExpense}
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
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Ingresos Totales (Mes)</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-600">+${summary.totalIncome.toLocaleString()}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Gastos Totales (Mes)</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-red-600">-${summary.totalExpense.toLocaleString()}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Ganancia Neta (Mes)</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-blue-600">${summary.netProfit.toLocaleString()}</div></CardContent>
        </Card>
      </div>

      {/* Charts */}
      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Ganancia por Departamento (Mes)</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={departmentStats}>
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                <Tooltip />
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
                <Tooltip />
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
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                <Tooltip />
                <Legend />
                <Bar dataKey="income" name="Ingresos" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Categorized Expenses Tables */}
      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-3">
        {renderExpenseTable(supplyExpenses, "Insumos y Mantenimiento", true)}
        {renderExpenseTable(taxExpenses, "Impuestos y Servicios")}
        {renderExpenseTable(commissionExpenses, "Comisiones Booking/Airbnb")}
      </div>
    </div>
  );
}
