import prisma from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CreditCard, CalendarDays, Activity } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { getFullDollarData } from "@/lib/dollar";
import { getWeatherData } from "@/lib/weather";
import { DollarWidget } from "@/components/dollar-widget";
import { WeatherWidget } from "@/components/weather-widget";
import { NotesWidget } from "@/components/notes-widget";

export default async function DashboardPage() {
  const today = new Date();
  const dollarData = await getFullDollarData();
  const weatherData = await getWeatherData();

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
  const activeNow = await prisma.reservation.count({
    where: {
      checkIn: { lte: today },
      checkOut: { gte: today },
      status: { not: "CANCELLED" }
    }
  });

  // 3. Pending Payments
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const pendingPayments = await prisma.reservation.count({
    where: {
      paymentStatus: { not: "PAID" },
      status: { not: "CANCELLED" }
    }
  });

  const monthlyRevenueRaw = await prisma.reservation.aggregate({
    _sum: { totalAmount: true },
    where: {
      checkIn: { gte: startOfMonth, lte: endOfMonth },
      status: { not: "CANCELLED" }
    }
  });
  const monthlyRevenue = monthlyRevenueRaw._sum.totalAmount || 0;

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Panel General</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Ingresos Totales (Mes)
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${monthlyRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground capitalize">
              {format(today, "MMMM", { locale: es })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Ocupación Actual
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeNow}</div>
            <p className="text-xs text-muted-foreground">
              Reservas activas hoy
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagos Pendientes</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingPayments}</div>
            <p className="text-xs text-muted-foreground">
              Reservas sin pagar o parciales
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Próximo Ingreso
            </CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">
              {nextReservation ? format(new Date(nextReservation.checkIn), "d 'de' MMM", { locale: es }) : "-"}
            </div>
            <p className="text-xs text-muted-foreground truncate">
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
