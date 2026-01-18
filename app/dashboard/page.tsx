import prisma from "@/lib/prisma";
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

  // 3. Pending Payments
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const pendingPayments = await prisma.reservation.count({
    where: {
      paymentStatus: { not: "PAID" },
      status: { not: "CANCELLED" }
    }
  });

  // Calculate Monthly Revenue (Finance Page Logic)
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

  // Capitalize helper
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  const formatDate = (date: Date) => {
    const d = format(date, "EEEE d 'de' MMMM", { locale: es });
    return capitalize(d).replace(/ de ([a-z])/g, (match) => " de " + match.charAt(4).toUpperCase() + match.slice(5));
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Panel General</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* WIDGET 1: INGRESOS TOTALES */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Ingresos Totales (Mes)
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${monthlyRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1 capitalize">
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
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>

            {activeCount > 0 ? (
              <div className="mt-1 text-xs text-muted-foreground space-y-1">
                {activeReservations.map(res => (
                  <div key={res.id} className="flex justify-between items-center">
                    <span className="truncate max-w-[120px]" title={res.guestName}>{res.guestName}</span>
                    <span>({res.guestPeopleCount}p)</span>
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
            <CardTitle className="text-sm font-medium">Pagos Pendientes</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingPayments}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Reservas sin pagar o parciales
            </p>
          </CardContent>
        </Card>

        {/* WIDGET 4: PRÓXIMO INGRESO */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Próximo Ingreso
            </CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
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

        <div className="md:col-span-2 lg:col-span-2 h-full">
          <NotesWidget />
        </div>
        <div className="col-span-1">
          <WeatherWidget data={weatherData} />
        </div>
        <div className="col-span-1">
          <DollarWidget data={dollarData} />
        </div>
      </div>
    </div>
  );
}
