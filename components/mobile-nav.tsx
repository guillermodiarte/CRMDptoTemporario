"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Menu,
  Home,
  CalendarDays,
  CreditCard,
  Building,
  LineChart,
  UserCog,
  Settings,
  ShieldAlert,
  Search,
  Car
} from "lucide-react";
import { Logo } from "@/components/logo";
import { UserMenu } from "@/components/user-menu";

interface MobileNavProps {
  role: string | undefined;
  user: any; // Using any to match existing prop usage if strictly typed elsewhere, but User type is better
}

export function MobileNav({ role, user }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Prevent hydration mismatch for Radix UI primitives
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <Button
        variant="outline"
        size="icon"
        className="shrink-0 md:hidden"
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle navigation menu</span>
      </Button>
    );
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
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
      {/* FIXED WIDTH: Enforce w-[260px] to be small and consistent */}
      <SheetContent side="left" className="flex flex-col w-[260px] sm:w-[260px] p-4">
        <SheetTitle className="sr-only">Menú de Navegación</SheetTitle>
        <nav className="grid gap-2 text-lg font-medium">
          <Link
            href="#"
            className="flex items-center gap-2 mb-4 px-2"
            onClick={() => setOpen(false)}
          >
            <Image
              src="/logo-diarte-horizontal.png"
              alt="Alojamientos Di'Arte"
              width={180}
              height={50}
              className="h-[40px] w-auto object-contain"
            />
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted"
            onClick={() => setOpen(false)}
          >
            <Home className="h-5 w-5 text-sky-500" />
            Panel General
          </Link>
          <Link
            href="/dashboard/calendar"
            className="flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted"
            onClick={() => setOpen(false)}
          >
            <CalendarDays className="h-5 w-5 text-purple-500" />
            Calendario
          </Link>
          <Link
            href="/dashboard/reservations"
            className="flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted"
            onClick={() => setOpen(false)}
          >
            <CreditCard className="h-5 w-5 text-emerald-500" />
            Reservas
          </Link>
          <Link
            href="/dashboard/departments"
            className="flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted"
            onClick={() => setOpen(false)}
          >
            <Building className="h-5 w-5 text-blue-500" />
            Departamentos
          </Link>
          <Link
            href="/dashboard/parking"
            className="flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted"
            onClick={() => setOpen(false)}
          >
            <Car className="h-5 w-5 text-orange-500" />
            Cocheras
          </Link>
          <Link
            href="/dashboard/finance"
            className="flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted"
            onClick={() => setOpen(false)}
          >
            <LineChart className="h-5 w-5 text-green-500" />
            Finanzas
          </Link>
          {role === 'ADMIN' && (
            <Link
              href="/dashboard/users"
              className="flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted"
              onClick={() => setOpen(false)}
            >
              <UserCog className="h-5 w-5 text-pink-500" />
              Usuarios
            </Link>
          )}
          {role === 'ADMIN' && (
            <Link
              href="/dashboard/settings"
              className="flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted"
              onClick={() => setOpen(false)}
            >
              <Settings className="h-5 w-5 text-slate-500" />
              Configuración
            </Link>
          )}
          <Link
            href="/dashboard/blacklist"
            className="flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted"
            onClick={() => setOpen(false)}
          >
            <ShieldAlert className="h-5 w-5 text-red-500" />
            Lista Negra
          </Link>
        </nav>
        {/* We can reproduce the search bar here if desired, or leave it in the header. 
            The original design had it in the content but the header search was outside the sheet.
            However, the layout.tsx had the searchbar OUTSIDE the sheet in the main header div.
            Looking at layout.tsx lines 205-217, the search is unrelated to the sheet content.
        */}
      </SheetContent>
    </Sheet>
  );
}
