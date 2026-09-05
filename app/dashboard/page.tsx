import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CreditCard, CalendarDays, Activity, Car, Plus, List, LogOut, LogIn, ChevronRight } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { getFullDollarData, getDollarRate } from "@/lib/dollar";
import { getWeatherData } from "@/lib/weather";
import { DollarWidget } from "@/components/dollar-widget";
import { WeatherWidget } from "@/components/weather-widget";
import { NotesWidget } from "@/components/notes-widget";

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  // Adjust for Argentina Time (UTC-3)
  const today = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const dollarData = await getFullDollarData();
  const weatherData = await getWeatherData();
  const dollarRate = await getDollarRate();

  const session = await auth();
  const sessionId = session?.user?.sessionId;
  const userRole = session?.user?.role; // 'ADMIN' | 'VISUALIZER'
  const isAdmin = userRole === 'ADMIN';

  // Shared date boundaries
  const startOfToday = new Date(today);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(today);
  endOfToday.setHours(23, 59, 59, 999);

  // 1. Next upcoming reservation
  const nextReservation = await prisma.reservation.findFirst({
    where: {
      checkIn: { gte: today },
      status: { notIn: ["CANCELLED", "PENDING_APPROVAL"] },
      sessionId: sessionId
    },
    orderBy: { checkIn: "asc" },
    include: { department: true }
  });

  // 2. Active reservations (people currently staying)
  const activeReservations = await prisma.reservation.findMany({
    where: {
      checkIn: { lte: today },
      checkOut: { gte: today },
      status: { notIn: ["CANCELLED", "PENDING_APPROVAL"] },
      sessionId: sessionId
    },
    select: {
      id: true,
      guestName: true,
      guestPeopleCount: true,
      bedsRequired: true,
      department: { select: { name: true, type: true } }
    }
  });

  const activeCount = activeReservations.length;
  const hasParking = activeReservations.some(r => r.department.type === 'PARKING');
  const hasApartment = activeReservations.some(r => r.department.type === 'APARTMENT');

  let HeaderIcon = Users;
  let showBothIcons = false;
  if (hasParking && !hasApartment) HeaderIcon = Car;
  else if (hasParking && hasApartment) showBothIcons = true;

  // 3. Pending Payments
  const pendingPayments = await prisma.reservation.count({
    where: {
      paymentStatus: { not: "PAID" },
      status: { notIn: ["CANCELLED", "NO_SHOW", "PENDING_APPROVAL"] },
      checkOut: { gte: startOfToday },
      sessionId: sessionId
    }
  });

  // 4. Future Reservations Count
  const futureReservationsCount = await prisma.reservation.count({
    where: {
      checkIn: { gte: startOfToday },
      status: { notIn: ["CANCELLED", "PENDING_APPROVAL"] },
      sessionId: sessionId
    }
  });

  // 5. Today's checkouts
  const todaysCheckouts = await prisma.reservation.findMany({
    where: {
      checkOut: { gte: startOfToday, lte: endOfToday },
      status: { notIn: ["CANCELLED", "PENDING_APPROVAL", "NO_SHOW"] },
      sessionId: sessionId
    },
    select: {
      id: true,
      guestName: true,
      checkIn: true,
      checkOut: true,
      department: { select: { name: true, type: true } }
    },
    orderBy: { checkOut: "asc" }
  });

  // 6. Today's check-ins (guests arriving today)
  const todaysCheckins = await prisma.reservation.findMany({
    where: {
      checkIn: { gte: startOfToday, lte: endOfToday },
      status: { notIn: ["CANCELLED", "PENDING_APPROVAL", "NO_SHOW"] },
      sessionId: sessionId
    },
    select: {
      id: true,
      guestName: true,
      checkIn: true,
      checkOut: true,
      department: { select: { name: true, type: true } }
    },
    orderBy: { checkIn: "asc" }
  });

  // 7. Monthly Revenue
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

  const monthlyReservations = await prisma.reservation.findMany({
    where: {
      checkIn: { gte: startOfMonth, lte: endOfMonth },
      sessionId: sessionId
    }
  });

  const monthlyRevenueRaw = monthlyReservations.reduce((acc, curr) => {
    let amount = 0;
    if (curr.paymentStatus === 'PAID') amount = curr.totalAmount;
    else if (curr.paymentStatus === 'PARTIAL' || (curr.paymentStatus as any) === 'CANCELLED') amount = curr.depositAmount || 0;
    if (curr.currency === 'USD') amount = amount * dollarRate;
    return acc + amount;
  }, 0);
  const monthlyRevenue = Number(monthlyRevenueRaw.toFixed(2));

  // Monthly Expenses
  const monthlyExpensesList = await prisma.expense.findMany({
    where: {
      isDeleted: false,
      date: { gte: startOfMonth, lte: endOfMonth },
      sessionId: sessionId
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

  // Helpers
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

      {/* ═══════════════════════════════════════════════════════
          MOBILE LAYOUT (hidden on md+)
          Order: Quick Actions → Retiros → Ingresos de Hoy →
                 Ingresos Mes | Ocupación → Pagos | Próximo →
                 Notas → Clima → Dólar
      ═══════════════════════════════════════════════════════ */}
      <div className="md:hidden space-y-4">

        {/* Quick Actions */}
        <Card className="bg-white dark:bg-slate-900 shadow-sm border-slate-200 dark:border-slate-800">
          <CardContent className="p-4">
            <div className={`grid gap-3 ${isAdmin ? 'grid-cols-3' : 'grid-cols-2'}`}>
              {/* Create Reservation — ADMIN only */}
              {isAdmin && (
                <Link href="/dashboard/reservations?new=true" className="flex flex-col items-center justify-center gap-2 p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 active:scale-95 transition-transform">
                  <div className="h-10 w-10 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-md">
                    <Plus className="h-6 w-6" />
                  </div>
                  <span className="text-[10px] font-bold text-center leading-tight">Crear<br />Reserva</span>
                </Link>
              )}
              {/* View Reservations */}
              <Link href="/dashboard/reservations" className="flex flex-col items-center justify-center gap-2 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 active:scale-95 transition-transform">
                <div className="h-10 w-10 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 rounded-full flex items-center justify-center border border-emerald-200 dark:border-emerald-700 shadow-sm">
                  <List className="h-6 w-6" />
                </div>
                <span className="text-[10px] font-bold text-center leading-tight">Ver<br />Reservas</span>
              </Link>
              {/* Calendar */}
              <Link href="/dashboard/calendar" className="flex flex-col items-center justify-center gap-2 p-2 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 active:scale-95 transition-transform">
                <div className="h-10 w-10 bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 rounded-full flex items-center justify-center border border-purple-200 dark:border-purple-700 shadow-sm">
                  <CalendarDays className="h-6 w-6" />
                </div>
                <span className="text-[10px] font-bold text-center leading-tight">Calendario</span>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Retiros de Hoy */}
        <Card className="border-rose-200/60 dark:border-rose-900/40">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              <span>Retiros de Hoy</span>
              {todaysCheckouts.length > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                  {todaysCheckouts.length}
                </span>
              )}
            </CardTitle>
            <LogOut className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            {todaysCheckouts.length > 0 ? (
              <div className="space-y-2.5">
                {todaysCheckouts.map(res => {
                  const checkInDate = new Date(res.checkIn);
                  const month = checkInDate.getMonth();
                  const year = checkInDate.getFullYear();
                  return (
                    <Link
                      key={res.id}
                      href={`/dashboard/reservations?month=${month}&year=${year}&highlight=${res.id}`}
                      className="flex items-center justify-between rounded-xl bg-rose-50/90 hover:bg-rose-100/90 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 border border-rose-200/80 dark:border-rose-900/60 px-4 py-3 transition-all active:scale-[0.98] shadow-xs cursor-pointer group"
                    >
                      <span className="text-base font-bold text-slate-800 dark:text-slate-100 truncate max-w-[58%] group-hover:text-rose-700 dark:group-hover:text-rose-300 transition-colors">
                        {res.guestName}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-sm text-rose-600 dark:text-rose-400 font-semibold">
                          {res.department.type === 'PARKING' ? '🚗 Cochera' : `🏠 ${res.department.name}`}
                        </span>
                        <ChevronRight className="h-4 w-4 text-rose-400 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No hay retiros programados para hoy</p>
            )}
          </CardContent>
        </Card>

        {/* Llegadas de Hoy */}
        <Card className="border-emerald-200/60 dark:border-emerald-900/40">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              <span>Llegadas de Hoy</span>
              {todaysCheckins.length > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold">
                  {todaysCheckins.length}
                </span>
              )}
            </CardTitle>
            <LogIn className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            {todaysCheckins.length > 0 ? (
              <div className="space-y-2.5">
                {todaysCheckins.map(res => {
                  const checkInDate = new Date(res.checkIn);
                  const month = checkInDate.getMonth();
                  const year = checkInDate.getFullYear();
                  return (
                    <Link
                      key={res.id}
                      href={`/dashboard/reservations?month=${month}&year=${year}&highlight=${res.id}`}
                      className="flex items-center justify-between rounded-xl bg-emerald-50/90 hover:bg-emerald-100/90 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 border border-emerald-200/80 dark:border-emerald-900/60 px-4 py-3 transition-all active:scale-[0.98] shadow-xs cursor-pointer group"
                    >
                      <span className="text-base font-bold text-slate-800 dark:text-slate-100 truncate max-w-[58%] group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
                        {res.guestName}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-sm text-emerald-600 dark:text-emerald-400 font-semibold">
                          {res.department.type === 'PARKING' ? '🚗 Cochera' : `🏠 ${res.department.name}`}
                        </span>
                        <ChevronRight className="h-4 w-4 text-emerald-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No hay llegadas programadas para hoy</p>
            )}
          </CardContent>
        </Card>

        {/* Ingresos Totales (Mes) | Ocupación Actual */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ingresos Totales (Mes)</CardTitle>
              <CreditCard className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className={`text-xl font-bold truncate ${monthlyRevenue >= 0 ? "text-blue-600" : "text-red-600"}`}>
                {formatCurrency(monthlyRevenue, 'ARS', 0)}
              </div>
              <div className={`text-xs font-semibold mt-1 ${netIncome >= 0 ? "text-green-600" : "text-red-600"}`}>
                Neto: {formatCurrency(netIncome, 'ARS', 0)}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">
                {format(today, "MMMM", { locale: es })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ocupación Actual</CardTitle>
              {showBothIcons ? (
                <div className="flex gap-1">
                  <Users className="h-4 w-4 text-blue-600" />
                  <Car className="h-4 w-4 text-blue-600" />
                </div>
              ) : (
                <HeaderIcon className="h-4 w-4 text-blue-600" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeCount}</div>
              {activeCount > 0 ? (
                <div className="mt-1 text-xs text-muted-foreground space-y-1">
                  {activeReservations.map(res => (
                    <div key={res.id} className="flex justify-between items-center">
                      <span className="truncate max-w-[70px]" title={res.guestName}>{res.guestName}</span>
                      <span className="text-xs text-muted-foreground">
                        {res.department.type === 'PARKING' ? 'Cochera' : `${res.guestPeopleCount}p`}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">Sin activas hoy</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Pagos Pendientes | Próximo Ingreso */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pagos Pendientes y Reservas</CardTitle>
              <Activity className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-2xl font-bold">{pendingPayments}</div>
                  <p className="text-xs text-muted-foreground mt-1">Sin pagar o parciales</p>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold">{futureReservationsCount}</div>
                  <p className="text-xs text-muted-foreground mt-1">Reservas Futuras</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Próximo Ingreso</CardTitle>
              <CalendarDays className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold leading-tight">
                {nextReservation ? formatDate(new Date(nextReservation.checkIn)) : "-"}
              </div>
              <p className="text-xs text-muted-foreground truncate mt-1">
                {nextReservation ? `${nextReservation.guestName} (${nextReservation.department.name})` : "Sin reservas próximas"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Cotización Dólar */}
        <DollarWidget data={dollarData} />

        {/* Notas Rápidas */}
        <NotesWidget />

        {/* Clima */}
        <WeatherWidget data={weatherData} />
      </div>

      {/* ═══════════════════════════════════════════════════════
          DESKTOP LAYOUT (hidden on mobile, shown md+)
      ═══════════════════════════════════════════════════════ */}
      <div className="hidden md:grid gap-4 grid-cols-2 lg:grid-cols-4">

        {/* WIDGET 1: INGRESOS TOTALES */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Totales (Mes)</CardTitle>
            <CreditCard className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-xl lg:text-2xl font-bold truncate ${monthlyRevenue >= 0 ? "text-blue-600" : "text-red-600"}`}>
              {formatCurrency(monthlyRevenue)}
            </div>
            <div className={`text-xs font-semibold mt-1 ${netIncome >= 0 ? "text-green-600" : "text-red-600"}`}>
              Neto: {formatCurrency(netIncome)}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">
              {format(today, "MMMM", { locale: es })}
            </p>
          </CardContent>
        </Card>

        {/* WIDGET 2: OCUPACIÓN ACTUAL */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ocupación Actual</CardTitle>
            {showBothIcons ? (
              <div className="flex gap-1">
                <Users className="h-4 w-4 text-blue-600" />
                <Car className="h-4 w-4 text-blue-600" />
              </div>
            ) : (
              <HeaderIcon className="h-4 w-4 text-blue-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
            {activeCount > 0 ? (
              <div className="mt-1 text-xs text-muted-foreground space-y-1">
                {activeReservations.map(res => (
                  <div key={res.id} className="flex justify-between items-center">
                    <span className="truncate max-w-[120px]" title={res.guestName}>{res.guestName}</span>
                    <span className="text-xs text-muted-foreground">
                      {res.department.type === 'PARKING' ? 'Cochera' : `${res.guestPeopleCount} pers, ${res.bedsRequired || 1} cama`}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">Sin reservas activas hoy</p>
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
                <p className="text-xs text-muted-foreground mt-1">Sin pagar o parciales</p>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold">{futureReservationsCount}</div>
                <p className="text-xs text-muted-foreground mt-1">Reservas Futuras</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* WIDGET 4: PRÓXIMO INGRESO */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próximo Ingreso</CardTitle>
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

        {/* ROW: Retiros de Hoy + Ingresos de Hoy + Clima + Dólar */}
        <div className="col-span-2 lg:col-span-4 grid grid-cols-2 lg:grid-cols-4 gap-4">

          {/* WIDGET 5: RETIROS DE HOY */}
          <Card className="border-rose-200/60 dark:border-rose-900/40">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                <span>Retiros de Hoy</span>
                {todaysCheckouts.length > 0 && (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                    {todaysCheckouts.length}
                  </span>
                )}
              </CardTitle>
              <LogOut className="h-4 w-4 text-rose-500" />
            </CardHeader>
            <CardContent>
              {todaysCheckouts.length > 0 ? (
                <div className="space-y-1.5">
                  {todaysCheckouts.map(res => {
                    const checkInDate = new Date(res.checkIn);
                    const month = checkInDate.getMonth();
                    const year = checkInDate.getFullYear();
                    return (
                      <Link
                        key={res.id}
                        href={`/dashboard/reservations?month=${month}&year=${year}&highlight=${res.id}`}
                        className="flex items-center justify-between rounded-lg bg-rose-50 hover:bg-rose-100/90 dark:bg-rose-950/30 dark:hover:bg-rose-900/50 border border-rose-100 dark:border-rose-900/50 px-3 py-1.5 transition-colors cursor-pointer group"
                      >
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate max-w-[60%] group-hover:text-rose-700 dark:group-hover:text-rose-300 transition-colors">{res.guestName}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                            {res.department.type === 'PARKING' ? '🚗 Cochera' : `🏠 ${res.department.name}`}
                          </span>
                          <ChevronRight className="h-3.5 w-3.5 text-rose-400 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No hay retiros programados para hoy</p>
              )}
            </CardContent>
          </Card>

          {/* WIDGET 6: LLEGADAS DE HOY */}
          <Card className="border-emerald-200/60 dark:border-emerald-900/40">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                <span>Llegadas de Hoy</span>
                {todaysCheckins.length > 0 && (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold">
                    {todaysCheckins.length}
                  </span>
                )}
              </CardTitle>
              <LogIn className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              {todaysCheckins.length > 0 ? (
                <div className="space-y-1.5">
                {todaysCheckins.map(res => {
                  const checkInDate = new Date(res.checkIn);
                  const month = checkInDate.getMonth();
                  const year = checkInDate.getFullYear();
                  return (
                    <Link
                      key={res.id}
                      href={`/dashboard/reservations?month=${month}&year=${year}&highlight=${res.id}`}
                      className="flex items-center justify-between rounded-lg bg-emerald-50 hover:bg-emerald-100/90 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/50 border border-emerald-100 dark:border-emerald-900/50 px-3 py-1.5 transition-colors cursor-pointer group"
                    >
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate max-w-[60%] group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">{res.guestName}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                          {res.department.type === 'PARKING' ? '🚗 Cochera' : `🏠 ${res.department.name}`}
                        </span>
                        <ChevronRight className="h-3.5 w-3.5 text-emerald-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </Link>
                  );
                })}
              </div>
              ) : (
                <p className="text-sm text-muted-foreground">No hay llegadas programadas para hoy</p>
              )}
            </CardContent>
          </Card>

          {/* CLIMA */}
          <WeatherWidget data={weatherData} />

          {/* DÓLAR */}
          <DollarWidget data={dollarData} />
        </div>

        {/* NOTAS RÁPIDAS — fila completa */}
        <div className="col-span-2 lg:col-span-4">
          <NotesWidget />
        </div>
      </div>
    </div>
  );
}
