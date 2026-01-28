import prisma from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CreditCard, CalendarDays, Activity } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { getFullDollarData, getDollarRate } from "@/lib/dollar";
import { getWeatherData } from "@/lib/weather";
import { DollarWidget } from "@/components/dollar-widget";
import { WeatherWidget } from "@/components/weather-widget";
import { NotesWidget } from "@/components/notes-widget";

export default async function DashboardPage() {
  const today = new Date();
  const dollarData = await getFullDollarData();
  const weatherData = await getWeatherData();
  const dollarRate = await getDollarRate();

  // 1. Check upcoming reservations
  const nextReservation = await prisma.reservation.findFirst({
    where: {
      checkIn: { gte: today },
      status: { not: "CANCELLED" }
    },
    orderBy: { checkIn: "asc" },
    include: { department: true }
  });

  // 2. Count active checks (people inside today)
  const activeReservations = await prisma.reservation.findMany({
    where: {
      checkIn: { lte: today },
      checkOut: { gte: today },
      status: { not: "CANCELLED" }
    },
    select: {
      id: true,
      guestName: true,
      guestPeopleCount: true,
      department: { select: { name: true } }
    }
  });

  const activeCount = activeReservations.length;

  // 3. Pending Payments (Future/Current & NOT No-Show)
  // Logic: "de la fecha actual en adelante" -> checkOut >= today (Includes current stay + future).
  // Exclude cancelled and no-show.
  const startOfToday = new Date(today);
  startOfToday.setHours(0, 0, 0, 0);

  const pendingPayments = await prisma.reservation.count({
    where: {
      paymentStatus: { not: "PAID" },
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
      checkOut: { gte: startOfToday }
    }
  });

  // 4. Future Reservations Count (from today onwards)
  const futureReservationsCount = await prisma.reservation.count({
    where: {
      checkIn: { gte: startOfToday },
      status: { not: "CANCELLED" }
    }
  });

  // Calculate Monthly Revenue (Finance Page Logic)
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const monthlyReservations = await prisma.reservation.findMany({
    where: {
      checkIn: { gte: startOfMonth, lte: endOfMonth },
      status: { not: "CANCELLED" }
    }
  });

  const monthlyRevenueRaw = monthlyReservations.reduce((acc, curr) => {
    let amount = 0;
    if (curr.paymentStatus === 'PAID') amount = curr.totalAmount;
    else if (curr.paymentStatus === 'PARTIAL') amount = curr.depositAmount || 0;

    if (curr.currency === 'USD') amount = amount * dollarRate;

    return acc + amount;
  }, 0);

  const monthlyRevenue = Number(monthlyRevenueRaw.toFixed(2));

  // Calculate Monthly Expenses
  const monthlyExpensesList = await prisma.expense.findMany({
    where: {
      isDeleted: false,
      date: { gte: startOfMonth, lte: endOfMonth }
    }
  });

  const cleaningExpenses = monthlyReservations.reduce((acc: number, curr: any) => {
    if (curr.paymentStatus === 'PAID' && curr.status !== 'NO_SHOW') {
      return acc + (curr.cleaningFee || 0);
    }
    return acc;
  }, 0);

  const totalMonthlyExpenses = monthlyExpensesList.reduce((acc, curr) => acc + curr.amount, 0) + cleaningExpenses;
  const netIncome = monthlyRevenue - totalMonthlyExpenses;

  // Capitalize helper
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  const formatDate = (date: Date) => {
    const d = format(date, "EEEE d 'de' MMMM", { locale: es });
    return capitalize(d).replace(/ de ([a-z])/g, (match) => " de " + match.charAt(4).toUpperCase() + match.slice(5));
  };

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Panel General</h2>
      </div>
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {/* WIDGET 1: INGRESOS TOTALES */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Ingresos Totales (Mes)
            </CardTitle>
            <CreditCard className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-xl lg:text-2xl font-bold truncate ${monthlyRevenue >= 0 ? "text-blue-600" : "text-red-600"}`}>
              <span className="md:hidden">{formatCurrency(monthlyRevenue, 'ARS', 0)}</span>
              <span className="hidden md:inline">{formatCurrency(monthlyRevenue)}</span>
            </div>
            <div className={`text-xs font-semibold mt-1 ${netIncome >= 0 ? "text-green-600" : "text-red-600"}`}>
              <span className="md:hidden">Neto: {formatCurrency(netIncome, 'ARS', 0)}</span>
              <span className="hidden md:inline">Neto: {formatCurrency(netIncome)}</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">
              {format(today, "MMMM", { locale: es })}
            </p>
          </CardContent>
        </Card>

        {/* WIDGET 2: OCUPACIÓN ACTUAL */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Ocupación Actual
            </CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>

            {activeCount > 0 ? (
              <div className="mt-1 text-xs text-muted-foreground space-y-1">
                {activeReservations.map(res => (
                  <div key={res.id} className="flex justify-between items-center">
                    <span className="truncate max-w-[120px]" title={res.guestName}>{res.guestName}</span>
                    <span>({res.guestPeopleCount} {res.guestPeopleCount === 1 ? 'persona' : 'personas'})</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">
                Sin reservas activas hoy
              </p>
            )}
          </CardContent>
        </Card>

        {/* WIDGET 3: PAGOS PENDIENTES */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagos Pendientes y Reservas</CardTitle>
            <Activity className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-end">
              <div>
                <div className="text-2xl font-bold">{pendingPayments}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Sin pagar o parciales
                </p>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold">{futureReservationsCount}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Reservas Futuras
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* WIDGET 4: PRÓXIMO INGRESO */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Próximo Ingreso
            </CardTitle>
            <CalendarDays className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {nextReservation ? formatDate(new Date(nextReservation.checkIn)) : "-"}
            </div>
            <p className="text-xs text-muted-foreground truncate mt-1">
              {nextReservation ? `${nextReservation.guestName} (${nextReservation.department.name})` : "Sin reservas próximas"}
            </p>
          </CardContent>
        </Card>

        <div className="col-span-2 md:col-span-2 lg:col-span-2 h-full">
          <NotesWidget />
        </div>
        <div className="col-span-2 md:col-span-1">
          <WeatherWidget data={weatherData} />
        </div>
        <div className="col-span-2 md:col-span-1">
          <DollarWidget data={dollarData} />
        </div>
      </div>
    </div>
  );
}
