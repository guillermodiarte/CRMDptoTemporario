import {
  Users,
  Building,
  CalendarDays,
  CreditCard,
  UserCog,
  ShieldAlert,
  Settings,
  Car,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"

import { auth } from "@/auth"
import prisma from "@/lib/prisma";
import Link from "next/link"
import { Search, LineChart, Home } from "lucide-react"
import { UserMenu } from "@/components/user-menu";
import { Logo } from "@/components/logo";
import { MobileNav } from "@/components/mobile-nav";
import Image from "next/image";

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth();

  // Optimización: Fetch user data server-side to avoid huge cookies
  const user = session?.user?.id ? await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { image: true, name: true, email: true, isSuperAdmin: true }
  }) : null;

  const role = session?.user?.role || undefined;
  const userImage = user?.image;

  const userForMenu = user ? {
    ...user,
    sessionId: session?.user?.sessionId
  } : null;

  const sessionId = session?.user?.sessionId;

  // Fetch current session name
  let currentSessionName: string | null = null;
  if (sessionId) {
    const currentSession = await (prisma as any).session.findUnique({
      where: { id: sessionId },
      select: { name: true },
    });
    currentSessionName = currentSession?.name || null;
  }

  // Fetch System Settings for Menu Visibility
  let showParking = true; // Default

  if (sessionId) {
    const showParkingSetting = await prisma.systemSettings.findUnique({
      where: {
        sessionId_key: {
          sessionId,
          key: "SHOW_PARKING_MENU"
        }
      }
    });
    if (showParkingSetting) {
      showParking = showParkingSetting.value !== "false";
    }
  }


  return (
    <div className="grid min-h-screen w-full md:grid-cols-[240px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-muted/40 md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center justify-center border-b px-4 lg:h-[60px] lg:px-6">
            <Link href="/" className="flex items-center">
              <Image
                src="/logo-diarte-horizontal.png"
                alt="Alojamientos Di'Arte"
                width={250}
                height={75}
                className="h-[50px] w-auto object-contain"
              />
            </Link>
          </div>
          <div className="flex-1">
            <nav className="grid items-start px-2 text-base font-medium lg:px-4">
              <Link
                href="/dashboard"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground transition-all hover:text-primary hover:bg-muted"
              >
                <Home className="h-5 w-5 text-sky-500" />
                Panel General
              </Link>
              <Link
                href="/dashboard/calendar"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground transition-all hover:text-primary hover:bg-muted"
              >
                <CalendarDays className="h-5 w-5 text-purple-500" />
                Calendario
              </Link>
              <Link
                href="/dashboard/reservations"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground transition-all hover:text-primary hover:bg-muted"
              >
                <CreditCard className="h-5 w-5 text-emerald-500" />
                Reservas
              </Link>
              <Link
                href="/dashboard/departments"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground transition-all hover:text-primary hover:bg-muted"
              >
                <Building className="h-5 w-5 text-blue-500" />
                Departamentos
              </Link>
              {showParking && (
                <Link
                  href="/dashboard/parking"
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground transition-all hover:text-primary hover:bg-muted"
                >
                  <Car className="h-5 w-5 text-orange-500" />
                  Cocheras
                </Link>
              )}
              <Link
                href="/dashboard/finance"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground transition-all hover:text-primary hover:bg-muted"
              >
                <LineChart className="h-5 w-5 text-green-500" />
                Finanzas
              </Link>
              {role === 'ADMIN' && (
                <Link
                  href="/dashboard/users"
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground transition-all hover:text-primary hover:bg-muted"
                >
                  <UserCog className="h-5 w-5 text-pink-500" />
                  Usuarios
                </Link>
              )}
              {role === 'ADMIN' && (
                <Link
                  href="/dashboard/settings"
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground transition-all hover:text-primary hover:bg-muted"
                >
                  <Settings className="h-5 w-5 text-slate-500" />
                  Configuración
                </Link>
              )}
              <Link
                href="/dashboard/blacklist"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground transition-all hover:text-primary hover:bg-muted"
              >
                <ShieldAlert className="h-5 w-5 text-red-500" />
                Lista Negra
              </Link>
              {user?.isSuperAdmin && (
                <Link
                  href="/dashboard/admin/sessions"
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground transition-all hover:text-primary hover:bg-muted"
                >
                  <ShieldAlert className="h-5 w-5 text-indigo-500" />
                  Gestión de Sesiones
                </Link>
              )}
            </nav>
          </div>
        </div>
      </div>
      <div className="flex flex-col">
        <header className="sticky top-0 z-50 flex h-14 items-center gap-4 border-b bg-muted/40 px-4 backdrop-blur-md lg:h-[60px] lg:px-6">
          <MobileNav role={role} user={userForMenu} showParking={showParking} isSuperAdmin={user?.isSuperAdmin} />
          <div className="w-full flex-1">
            <form action="/dashboard/search">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  name="q"
                  placeholder="Buscar reserva global..."
                  className="w-full appearance-none bg-background pl-8 shadow-none md:w-2/3 lg:w-1/3"
                />
              </div>
            </form>
          </div>
          <div className="flex items-center gap-3">
            {currentSessionName && (
              <div className="hidden sm:flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Sesión:</span>
                <span className="text-sm font-bold tracking-tight">{currentSessionName}</span>
              </div>
            )}
            <UserMenu user={userForMenu} />
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          {children}
        </main>
      </div>
    </div >
  )
}
