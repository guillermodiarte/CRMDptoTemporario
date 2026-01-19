import prisma from "@/lib/prisma";
import { FinanceView } from "@/components/finance-view";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { getDollarRate } from "@/lib/dollar";

export default async function FinancePage({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string; year?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  const userRole = (session?.user as any)?.role;

  const today = new Date();
  const params = await searchParams;
  const selectedYear = params?.year ? parseInt(params.year) : today.getFullYear();
  const selectedMonth = params?.month ? parseInt(params.month) : today.getMonth();

  const startDate = new Date(selectedYear, selectedMonth, 1);
  const endDate = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);

  // 1. Obtener la tasa del dólar (necesaria para los cálculos de ingresos)
  const dollarRate = await getDollarRate();

  // 2. Fetch de datos
  const expenses = await prisma.expense.findMany({
    where: {
      isDeleted: false,
      date: { gte: startDate, lte: endDate },
    },
    include: { department: true },
    orderBy: { date: "desc" },
  });

  const reservations = await prisma.reservation.findMany({
    where: {
      status: { not: "CANCELLED" },
      checkIn: { gte: startDate, lte: endDate },
    },
  });

  const departments = await prisma.department.findMany({
    orderBy: { name: 'asc' }
  });

  // 3. Cálculos de Resumen (Con corrección de decimales)
  // Gastos de limpieza: Solo de reservas PAGADAS y que NO sean NO-SHOW
  const cleaningExpenses = reservations.reduce((acc: number, curr: any) => {
    if (curr.paymentStatus === 'PAID' && curr.status !== 'NO_SHOW') {
      return acc + (curr.cleaningFee || 0);
    }
    return acc;
  }, 0);

  const totalExpenseRaw = expenses.reduce((acc: number, curr: { amount: number }) => acc + curr.amount, 0) + cleaningExpenses;
  const totalExpense = Number(totalExpenseRaw.toFixed(2));

  const totalIncomeRaw = reservations.reduce((acc: number, curr: any) => {
    let amount = 0;
    if (curr.paymentStatus === 'PAID') amount = curr.totalAmount;
    if (curr.paymentStatus === 'PARTIAL') amount = curr.depositAmount || 0;
    if (curr.currency === 'USD') amount = amount * dollarRate;
    return acc + amount;
  }, 0);
  const totalIncome = Number(totalIncomeRaw.toFixed(2));

  const netProfit = Number((totalIncome - totalExpense).toFixed(2));

  // 4. Estadísticas Anuales para el Gráfico
  const yearStart = new Date(selectedYear, 0, 1);
  const yearEnd = new Date(selectedYear, 11, 31);

  const allYearExpenses = await prisma.expense.findMany({
    where: { isDeleted: false, date: { gte: yearStart, lte: yearEnd } }
  });
  const allYearReservations = await prisma.reservation.findMany({
    where: { status: { not: "CANCELLED" }, checkIn: { gte: yearStart, lte: yearEnd } }
  });

  const monthlyStats = Array.from({ length: 12 }).map((_, i) => ({
    name: format(new Date(selectedYear, i, 1), 'MMM', { locale: es }),
    income: 0,
    expense: 0
  }));

  allYearReservations.forEach((r: any) => {
    const month = new Date(r.checkIn).getMonth();
    if (monthlyStats[month]) {
      let amount = 0;
      if (r.paymentStatus === 'PAID') amount = r.totalAmount;
      else if (r.paymentStatus === 'PARTIAL') amount = r.depositAmount || 0;
      if (r.currency === 'USD') amount = amount * dollarRate;
      monthlyStats[month].income += amount;
    }

    if (monthlyStats[month] && r.paymentStatus === 'PAID' && r.status !== 'NO_SHOW') {
      monthlyStats[month].expense += (r.cleaningFee || 0);
    }
  });

  allYearExpenses.forEach((e: any) => {
    const month = new Date(e.date).getMonth();
    if (monthlyStats[month]) monthlyStats[month].expense += e.amount;
  });

  // Limpiar decimales de las estadísticas mensuales
  const cleanedMonthlyStats = monthlyStats.map(stat => ({
    ...stat,
    income: Number(stat.income.toFixed(2)),
    expense: Number(stat.expense.toFixed(2))
  }));

  // 5. Distribución de Gastos (Gráfico de torta)
  const distributionMap: Record<string, number> = {};
  expenses.forEach((e: any) => {
    if (!distributionMap[e.type]) distributionMap[e.type] = 0;
    distributionMap[e.type] += e.amount;
  });

  if (cleaningExpenses > 0) {
    distributionMap["Limpieza"] = cleaningExpenses;
  }

  const distribution = Object.keys(distributionMap).map((key) => ({
    name: key,
    value: Number(distributionMap[key].toFixed(2)),
  }));

  // 6. Estadísticas por Departamento (Nuevo Gráfico)
  const departmentStatsMap: Record<string, { name: string; income: number; expense: number; isActive: boolean }> = {};

  // Inicializar
  departments.forEach(d => {
    departmentStatsMap[d.id] = { name: d.name, income: 0, expense: 0, isActive: d.isActive };
  });

  // Ingresos por departamento (Reservas del mes mostrado)
  reservations.forEach(r => {
    if (departmentStatsMap[r.departmentId]) {
      let amount = 0;
      if (r.paymentStatus === 'PAID') amount = r.totalAmount;
      else if (r.paymentStatus === 'PARTIAL') amount = r.depositAmount || 0;
      if (r.currency === 'USD') amount = amount * dollarRate;
      departmentStatsMap[r.departmentId].income += amount;
    }
  });

  // Gastos Directos por departamento
  expenses.forEach(e => {
    if (e.departmentId && departmentStatsMap[e.departmentId]) {
      departmentStatsMap[e.departmentId].expense += e.amount;
    }
  });

  // Gastos de Limpieza por departamento
  reservations.forEach(r => {
    if (r.departmentId && departmentStatsMap[r.departmentId] && r.paymentStatus === 'PAID' && r.status !== 'NO_SHOW') {
      departmentStatsMap[r.departmentId].expense += (r.cleaningFee || 0);
    }
  });

  const departmentStats = Object.values(departmentStatsMap)
    .filter(d => d.isActive || (d.income > 0 || d.expense > 0))
    .map(d => ({
      name: d.name,
      income: Number(d.income.toFixed(2)),
      expense: Number(d.expense.toFixed(2)),
      profit: Number((d.income - d.expense).toFixed(2))
    }));

  return (
    <FinanceView
      expenses={expenses}
      departments={departments}
      monthlyStats={cleanedMonthlyStats}
      distribution={distribution}
      departmentStats={departmentStats}
      summary={{ totalIncome, totalExpense, netProfit }}
      role={userRole}
      date={startDate}
    />
  );
}