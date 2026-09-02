import {
  Users,
  Building,
  CalendarDays,
  CreditCard,
  UserCog,
  ShieldAlert,
  Settings,
  Car,
  Images,
  ClipboardCheck,
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
import { redirect } from "next/navigation"
import { Search, LineChart, Home } from "lucide-react"
import { UserMenu } from "@/components/user-menu";
import { Logo } from "@/components/logo";
import { MobileNav } from "@/components/mobile-nav";
import { NotificationBell } from "@/components/notification-bell";
import { AdminThemeProvider } from "@/components/admin-theme-provider";
import { AdminThemeToggle } from "@/components/admin-theme-toggle";
import Image from "next/image";

import { getSiteConfig } from "@/lib/site-config-loader";

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth();
  const config = await getSiteConfig();
  const adminLogo = config.adminLogoUrl || "/uploads/logos/logo-diarte-horizontal.png";
  const adminLogoDark = config.adminLogoUrlDark || adminLogo;
  const adminLogoSize = Number(config.adminLogoSize) || 46;

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

  if (!sessionId) {
    redirect("/select-session");
  }

  // Fetch and verify current active session
  const currentSession = await (prisma as any).session.findFirst({
    where: { id: sessionId, isActive: true },
    select: { name: true },
  });

  if (!currentSession) {
    redirect("/select-session");
  }

  const currentSessionName: string = currentSession.name;

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
    <AdminThemeProvider>
      <div className="grid min-h-screen w-full md:grid-cols-[240px_1fr] lg:grid-cols-[280px_1fr]">
        <div className="hidden border-r bg-muted/40 md:block">
          <div className="flex h-full max-h-screen flex-col gap-2">
            <div
              className="flex items-center justify-center border-b px-4 lg:px-6 transition-all duration-200"
              style={{ minHeight: `${Math.max(60, adminLogoSize + 16)}px`, padding: "8px 16px" }}
            >
              <Link href="/" className="flex items-center justify-center w-full">
                {/* Light mode logo */}
                <img
                  src={adminLogo}
                  alt={config.siteName || "Alojamientos Di'Arte"}
                  style={{ height: `${adminLogoSize}px`, maxHeight: `${adminLogoSize}px` }}
                  className="w-auto max-w-[220px] object-contain transition-all duration-200 dark:hidden"
                />
                {/* Dark mode logo */}
                <img
                  src={adminLogoDark}
                  alt={config.siteName || "Alojamientos Di'Arte"}
                  style={{ height: `${adminLogoSize}px`, maxHeight: `${adminLogoSize}px` }}
                  className="w-auto max-w-[220px] object-contain transition-all duration-200 hidden dark:block"
                />
              </Link>
            </div>
            <div className="flex-1 flex flex-col justify-between overflow-y-auto">
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
                  href="/dashboard/approvals"
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground transition-all hover:text-primary hover:bg-muted"
                >
                  <ClipboardCheck className="h-5 w-5 text-amber-500" />
                  Aprobaciones
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
                    <Car className="h-5 w-5 text-indigo-500" />
                    Cocheras
                  </Link>
                )}
                {role === "ADMIN" && (
                  <Link
                    href="/dashboard/finance"
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground transition-all hover:text-primary hover:bg-muted"
                  >
                    <LineChart className="h-5 w-5 text-green-500" />
                    Finanzas
                  </Link>
                )}
                {role === "ADMIN" && (
                  <Link
                    href="/dashboard/users"
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground transition-all hover:text-primary hover:bg-muted"
                  >
                    <Users className="h-5 w-5 text-pink-500" />
                    Usuarios
                  </Link>
                )}
                {role === "ADMIN" && (
                  <Link
                    href="/dashboard/settings"
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground transition-all hover:text-primary hover:bg-muted"
                  >
                    <Settings className="h-5 w-5 text-gray-500" />
                    Configuración
                  </Link>
                )}
                {role === "ADMIN" && (
                  <Link
                    href="/dashboard/blacklist"
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground transition-all hover:text-primary hover:bg-muted"
                  >
                    <ShieldAlert className="h-5 w-5 text-red-500" />
                    Lista Negra
                  </Link>
                )}
                {user?.isSuperAdmin && (
                  <Link
                    href="/dashboard/admin/sessions"
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground transition-all hover:text-primary hover:bg-muted"
                  >
                    <UserCog className="h-5 w-5 text-cyan-500" />
                    Gestión de Sesiones
                  </Link>
                )}
                <Link
                  href="/dashboard/departments/gallery"
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground transition-all hover:text-primary hover:bg-muted"
                >
                  <Images className="h-5 w-5 text-violet-500" />
                  Galería
                </Link>
                <div className="my-2 border-t" />
                <Link
                  href="/?preview=true"
                  target="_blank"
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground transition-all hover:text-primary hover:bg-muted"
                >
                  <Building className="h-5 w-5 text-teal-500" />
                  Ver Sitio Público
                </Link>
              </nav>

              {/* Version Indicator */}
              <div className="p-3 border-t text-center text-xs text-muted-foreground font-semibold">
                Versión 2.0
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col">
          <header className="sticky top-0 z-50 flex h-14 items-center gap-4 border-b bg-muted/40 px-4 backdrop-blur-md lg:h-[60px] lg:px-6">
            <MobileNav
              role={role}
              user={userForMenu}
              showParking={showParking}
              isSuperAdmin={user?.isSuperAdmin}
              adminLogo={adminLogo}
              adminLogoDark={adminLogoDark}
              adminLogoSize={adminLogoSize}
            />
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
              <div className="hidden sm:flex items-center gap-4 border-r pr-4">
                {user?.name && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Usuario:</span>
                    <span className="text-sm font-bold tracking-tight">{user.name}</span>
                  </div>
                )}
                {currentSessionName && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Sesión:</span>
                    <span className="text-sm font-bold tracking-tight">{currentSessionName}</span>
                  </div>
                )}
              </div>
              <AdminThemeToggle />
              <NotificationBell />
              <UserMenu user={userForMenu} />
            </div>
          </header>
          <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </AdminThemeProvider>
  )
}
