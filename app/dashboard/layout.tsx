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

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth();

  // Optimización: Fetch user data server-side to avoid huge cookies
  const user = session?.user?.id ? await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { image: true, role: true, name: true, email: true }
  }) : null;

  const role = user?.role;
  const userImage = user?.image;

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[240px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-muted/40 md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <Logo className="h-7 w-7" />
              <span className="text-lg">Alojamientos Di'Arte</span>
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
            </nav>
          </div>
        </div>
      </div>
      <div className="flex flex-col">
        <header className="sticky top-0 z-50 flex h-14 items-center gap-4 border-b bg-muted/40 px-4 backdrop-blur-md lg:h-[60px] lg:px-6">
          <MobileNav role={role} user={user} />
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
          <UserMenu user={user} />
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          {children}
        </main>
      </div>
    </div >
  )
}
