"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Menu,
  Home,
  CalendarDays,
  CreditCard,
  Building,
  LineChart,
  Users,
  UserCog,
  Settings,
  ShieldAlert,
  Car,
  Images,
  BarChart3,
  Check,
} from "lucide-react";
import { ApprovalsNavLink } from "@/components/approvals-nav-link";
import { MENU_ORDER_KEY } from "@/components/sidebar-nav";

interface NavItem {
  id: string;
  label: string;
  href?: string;
  icon: React.ReactNode;
  isSpecial?: string;
  condition: boolean;
}

function buildMobileItems(
  role: string | undefined,
  isSuperAdmin: boolean | undefined,
  showParking: boolean,
  showBalance: boolean
): NavItem[] {
  return [
    { id: "panel", label: "Panel General", href: "/dashboard", icon: <Home className="h-5 w-5 text-sky-500" />, condition: true },
    { id: "calendar", label: "Calendario", href: "/dashboard/calendar", icon: <CalendarDays className="h-5 w-5 text-purple-500" />, condition: true },
    { id: "approvals", label: "Aprobaciones", isSpecial: "approvals", icon: <Check className="h-5 w-5 text-orange-400" />, condition: true },
    { id: "reservations", label: "Reservas", href: "/dashboard/reservations", icon: <CreditCard className="h-5 w-5 text-emerald-500" />, condition: true },
    { id: "departments", label: "Departamentos", href: "/dashboard/departments", icon: <Building className="h-5 w-5 text-blue-500" />, condition: true },
    { id: "parking", label: "Cocheras", href: "/dashboard/parking", icon: <Car className="h-5 w-5 text-orange-500" />, condition: showParking },
    { id: "finance", label: "Finanzas", href: "/dashboard/finance", icon: <LineChart className="h-5 w-5 text-green-500" />, condition: true },
    { id: "users", label: "Usuarios", href: "/dashboard/users", icon: <Users className="h-5 w-5 text-pink-500" />, condition: role === "ADMIN" },
    { id: "settings", label: "Configuración", href: "/dashboard/settings", icon: <Settings className="h-5 w-5 text-slate-500" />, condition: role === "ADMIN" },
    { id: "blacklist", label: "Lista Negra", href: "/dashboard/blacklist", icon: <ShieldAlert className="h-5 w-5 text-red-500" />, condition: role === "ADMIN" },
    { id: "sessions", label: "Gestión de Sesiones", href: "/dashboard/admin/sessions", icon: <UserCog className="h-5 w-5 text-cyan-500" />, condition: !!isSuperAdmin },
    { id: "balance", label: "Balance", href: "/dashboard/balance", icon: <BarChart3 className="h-5 w-5 text-violet-500" />, condition: !!showBalance },
    { id: "gallery", label: "Galería", href: "/dashboard/departments/gallery", icon: <Images className="h-5 w-5 text-violet-500" />, condition: true },
  ];
}

function applyOrder(visible: NavItem[], order: string[]): NavItem[] {
  const ordered: NavItem[] = [];
  for (const id of order) {
    const found = visible.find((i) => i.id === id);
    if (found) ordered.push(found);
  }
  for (const item of visible) {
    if (!order.includes(item.id)) ordered.push(item);
  }
  return ordered;
}

const LINK_CLASS =
  "flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted";

interface MobileNavProps {
  role: string | undefined;
  user: any;
  showParking: boolean;
  isSuperAdmin?: boolean;
  showBalance?: boolean;
  adminLogo?: string;
  adminLogoDark?: string;
  adminLogoSize?: number | string;
}

export function MobileNav({
  role,
  user,
  showParking,
  isSuperAdmin,
  showBalance = false,
  adminLogo = "/images/logo-diarte-horizontal.png",
  adminLogoDark,
  adminLogoSize = 46,
}: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [items, setItems] = useState<NavItem[]>([]);

  // Load menu order from localStorage (shared with desktop sidebar)
  useEffect(() => {
    const all = buildMobileItems(role, isSuperAdmin, showParking, showBalance);
    const visible = all.filter((i) => i.condition);
    try {
      const saved = localStorage.getItem(MENU_ORDER_KEY);
      if (saved) {
        setItems(applyOrder(visible, JSON.parse(saved)));
      } else {
        setItems(visible);
      }
    } catch {
      setItems(visible);
    }
    setIsMounted(true);
  }, [role, isSuperAdmin, showParking, showBalance]);

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

  const logoH = Math.min(Number(adminLogoSize) || 46, 60);

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
            className="flex items-center justify-center mb-4 px-2 py-1 transition-all"
            onClick={() => setOpen(false)}
          >
            {/* Light mode */}
            <img
              src={adminLogo}
              alt="Alojamientos Di'Arte"
              style={{ height: `${logoH}px`, maxHeight: `${logoH}px` }}
              className="w-auto max-w-[210px] object-contain dark:hidden"
            />
            {/* Dark mode */}
            <img
              src={adminLogoDark || adminLogo}
              alt="Alojamientos Di'Arte"
              style={{ height: `${logoH}px`, maxHeight: `${logoH}px` }}
              className="w-auto max-w-[210px] object-contain hidden dark:block"
            />
          </Link>

          {items.map((item) => {
            if (item.isSpecial === "approvals") {
              return (
                <ApprovalsNavLink
                  key="approvals"
                  mobile
                  onClick={() => setOpen(false)}
                />
              );
            }
            return (
              <Link
                key={item.id}
                href={item.href!}
                className={LINK_CLASS}
                onClick={() => setOpen(false)}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}

          {/* Divider + Ver Sitio Público */}
          <div className="my-2 border-t" />
          <Link
            href="/?preview=true"
            target="_blank"
            className={LINK_CLASS}
            onClick={() => setOpen(false)}
          >
            <Building className="h-5 w-5 text-teal-500" />
            Ver Sitio Público
          </Link>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
