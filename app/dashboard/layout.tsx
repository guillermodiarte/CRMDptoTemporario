import {
  Users,
  Building,
  CalendarDays,
  CreditCard,
  UserCog,
  ShieldAlert,
  Settings,
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
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { auth } from "@/auth"
import prisma from "@/lib/prisma";
import Link from "next/link"
import { Menu, Search, LineChart, Home } from "lucide-react"
import { UserMenu } from "@/components/user-menu";
import { Logo } from "@/components/logo";

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
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-muted/40 md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <Logo className="h-6 w-6" />
              <span className="">Alojamientos Di'Arte</span>
            </Link>
          </div>
          <div className="flex-1">
            <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
              <Link
                href="/dashboard"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
              >
                <Home className="h-4 w-4" />
                Panel General
              </Link>
              <Link
                href="/dashboard/calendar"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
              >
                <CalendarDays className="h-4 w-4" />
                Calendario
              </Link>
              <Link
                href="/dashboard/reservations"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
              >
                <CreditCard className="h-4 w-4" />
                Reservas
              </Link>
              <Link
                href="/dashboard/departments"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
              >
                <Building className="h-4 w-4" />
                Departamentos
              </Link>
              <Link
                href="/dashboard/finance"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
              >
                <LineChart className="h-4 w-4" />
                Finanzas
              </Link>
              {role === 'ADMIN' && (
                <Link
                  href="/dashboard/users"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
                >
                  <UserCog className="h-4 w-4" />
                  Usuarios
                </Link>
              )}
              {role === 'ADMIN' && (
                <Link
                  href="/dashboard/settings"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
                >
                  <Settings className="h-4 w-4" />
                  Configuración
                </Link>
              )}
              <Link
                href="/dashboard/blacklist"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
              >
                <ShieldAlert className="h-4 w-4" />
                Lista Negra
              </Link>
            </nav>
          </div>
        </div>
      </div>
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 md:hidden"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col">
              <nav className="grid gap-2 text-lg font-medium">
                <Link
                  href="#"
                  className="flex items-center gap-2 text-lg font-semibold"
                >
                  <Logo className="h-6 w-6" />
                  <span className="sr-only">Alojamientos Di'Arte</span>
                </Link>
                <Link
                  href="/dashboard"
                  className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground"
                >
                  <Home className="h-5 w-5" />
                  Panel General
                </Link>
                <Link
                  href="/dashboard/calendar"
                  className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground"
                >
                  <CalendarDays className="h-5 w-5" />
                  Calendario
                </Link>
                <Link
                  href="/dashboard/reservations"
                  className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground"
                >
                  <CreditCard className="h-5 w-5" />
                  Reservas
                </Link>
                <Link
                  href="/dashboard/departments"
                  className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground"
                >
                  <Building className="h-5 w-5" />
                  Departamentos
                </Link>
                <Link
                  href="/dashboard/finance"
                  className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground"
                >
                  <LineChart className="h-5 w-5" />
                  Finanzas
                </Link>
                {role === 'ADMIN' && (
                  <Link
                    href="/dashboard/users"
                    className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground"
                  >
                    <UserCog className="h-5 w-5" />
                    Usuarios
                  </Link>
                )}
                {role === 'ADMIN' && (
                  <Link
                    href="/dashboard/settings"
                    className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground"
                  >
                    <Settings className="h-5 w-5" />
                    Configuración
                  </Link>
                )}
                <Link
                  href="/dashboard/blacklist"
                  className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground"
                >
                  <ShieldAlert className="h-5 w-5" />
                  Lista Negra
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
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
