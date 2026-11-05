"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  Pencil,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  GripVertical,
  X,
} from "lucide-react";
import { ApprovalsNavLink } from "@/components/approvals-nav-link";
import { MENU_ORDER_KEY, NavItem } from "@/components/sidebar-nav";
import { toast } from "sonner";

function buildMobileItems(
  role: string | undefined,
  isSuperAdmin: boolean | undefined,
  showParking: boolean,
  showBalance: boolean
): NavItem[] {
  return [
    { id: "panel", label: "Panel General", href: "/dashboard", icon: <Home className="h-5 w-5 text-sky-500 shrink-0" />, condition: true },
    { id: "calendar", label: "Calendario", href: "/dashboard/calendar", icon: <CalendarDays className="h-5 w-5 text-purple-500 shrink-0" />, condition: true },
    { id: "approvals", label: "Aprobaciones", isSpecial: "approvals", icon: <Check className="h-5 w-5 text-orange-400 shrink-0" />, condition: true },
    { id: "reservations", label: "Reservas", href: "/dashboard/reservations", icon: <CreditCard className="h-5 w-5 text-emerald-500 shrink-0" />, condition: true },
    { id: "departments", label: "Departamentos", href: "/dashboard/departments", icon: <Building className="h-5 w-5 text-blue-500 shrink-0" />, condition: true },
    { id: "parking", label: "Cocheras", href: "/dashboard/parking", icon: <Car className="h-5 w-5 text-indigo-500 shrink-0" />, condition: showParking },
    { id: "finance", label: "Finanzas", href: "/dashboard/finance", icon: <LineChart className="h-5 w-5 text-green-500 shrink-0" />, condition: true },
    { id: "users", label: "Usuarios", href: "/dashboard/users", icon: <Users className="h-5 w-5 text-pink-500 shrink-0" />, condition: role === "ADMIN" },
    { id: "settings", label: "Configuración", href: "/dashboard/settings", icon: <Settings className="h-5 w-5 text-gray-500 shrink-0" />, condition: role === "ADMIN" },
    { id: "blacklist", label: "Lista Negra", href: "/dashboard/blacklist", icon: <ShieldAlert className="h-5 w-5 text-red-500 shrink-0" />, condition: role === "ADMIN" },
    { id: "sessions", label: "Gestión de Sesiones", href: "/dashboard/admin/sessions", icon: <UserCog className="h-5 w-5 text-cyan-500 shrink-0" />, condition: !!isSuperAdmin },
    { id: "balance", label: "Balance", href: "/dashboard/balance", icon: <BarChart3 className="h-5 w-5 text-violet-500 shrink-0" />, condition: !!showBalance },
    { id: "gallery", label: "Galería", href: "/dashboard/departments/gallery", icon: <Images className="h-5 w-5 text-violet-500 shrink-0" />, condition: true },
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
  "flex items-center gap-3.5 rounded-xl px-3 py-2.5 text-muted-foreground hover:text-foreground hover:bg-muted text-base font-medium transition-colors";

interface MobileNavProps {
  role: string | undefined;
  user: any;
  showParking: boolean;
  isSuperAdmin?: boolean;
  showBalance?: boolean;
  adminLogo?: string;
  adminLogoDark?: string;
  adminLogoSize?: number | string;
  initialMenuOrder?: string[] | null;
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
  initialMenuOrder,
}: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [editing, setEditing] = useState(false);
  const [items, setItems] = useState<NavItem[]>(() => {
    const all = buildMobileItems(role, isSuperAdmin, showParking, showBalance);
    const visible = all.filter((i) => i.condition);
    if (initialMenuOrder && Array.isArray(initialMenuOrder)) {
      return applyOrder(visible, initialMenuOrder);
    }
    return visible;
  });

  // Drag sort hook for touch/pointer
  const dragIdx = useRef<number | null>(null);
  const overIdx = useRef<number | null>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLSpanElement>, index: number) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragIdx.current = index;
    overIdx.current = index;
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLSpanElement>) => {
    if (dragIdx.current === null) return;
    const y = e.clientY;
    let newOver: number | null = null;
    itemRefs.current.forEach((el, i) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (y >= rect.top && y <= rect.bottom) {
        newOver = i;
      }
    });

    if (newOver !== null && newOver !== overIdx.current) {
      overIdx.current = newOver;
      const from = dragIdx.current;
      const to = newOver;
      setItems((prev) => {
        const next = [...prev];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        return next;
      });
      dragIdx.current = to;
    }
  }, []);

  const onPointerUp = useCallback(() => {
    dragIdx.current = null;
    overIdx.current = null;
  }, []);

  const setItemRef = useCallback((el: HTMLDivElement | null, index: number) => {
    itemRefs.current[index] = el;
  }, []);

  // Sync menu order on mount (initialMenuOrder or localStorage)
  useEffect(() => {
    const all = buildMobileItems(role, isSuperAdmin, showParking, showBalance);
    const visible = all.filter((i) => i.condition);

    let activeOrder = initialMenuOrder;
    try {
      const saved = localStorage.getItem(MENU_ORDER_KEY);
      if (saved) {
        const parsedSaved = JSON.parse(saved);
        if (Array.isArray(parsedSaved) && parsedSaved.length > 0) {
          activeOrder = parsedSaved;
          // If server didn't have it yet, upload existing localStorage order
          if (!initialMenuOrder) {
            fetch("/api/menu-order", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ order: parsedSaved }),
            }).catch(() => {});
          }
        }
      }
    } catch {}

    if (activeOrder && Array.isArray(activeOrder)) {
      setItems(applyOrder(visible, activeOrder));
    } else {
      setItems(visible);
    }
    setIsMounted(true);
  }, [role, isSuperAdmin, showParking, showBalance, initialMenuOrder]);

  // Real-time synchronization when order changes from desktop or another tab
  useEffect(() => {
    const handleOrderChange = (e: Event) => {
      const customEvent = e as CustomEvent<string[] | null>;
      const all = buildMobileItems(role, isSuperAdmin, showParking, showBalance);
      const visible = all.filter((i) => i.condition);

      if (customEvent.detail && Array.isArray(customEvent.detail)) {
        setItems(applyOrder(visible, customEvent.detail));
      } else {
        try {
          const saved = localStorage.getItem(MENU_ORDER_KEY);
          setItems(saved ? applyOrder(visible, JSON.parse(saved)) : visible);
        } catch {
          setItems(visible);
        }
      }
    };

    window.addEventListener("admin-menu-order-changed", handleOrderChange);
    window.addEventListener("storage", handleOrderChange);
    return () => {
      window.removeEventListener("admin-menu-order-changed", handleOrderChange);
      window.removeEventListener("storage", handleOrderChange);
    };
  }, [role, isSuperAdmin, showParking, showBalance]);

  // Move item up / down (mobile tap friendly!)
  const moveItem = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  };

  const handleSave = useCallback(async () => {
    const orderIds = items.map((i) => i.id);
    localStorage.setItem(MENU_ORDER_KEY, JSON.stringify(orderIds));
    setEditing(false);

    window.dispatchEvent(
      new CustomEvent("admin-menu-order-changed", { detail: orderIds })
    );

    try {
      const res = await fetch("/api/menu-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: orderIds }),
      });
      if (res.ok) {
        toast.success("Orden del menú guardado y sincronizado");
      } else {
        toast.info("Guardado localmente");
      }
    } catch (err) {
      console.error(err);
      toast.info("Guardado localmente");
    }
  }, [items]);

  const handleReset = useCallback(async () => {
    localStorage.removeItem(MENU_ORDER_KEY);
    const all = buildMobileItems(role, isSuperAdmin, showParking, showBalance);
    const visible = all.filter((i) => i.condition);
    setItems(visible);
    setEditing(false);

    window.dispatchEvent(
      new CustomEvent("admin-menu-order-changed", { detail: null })
    );

    try {
      await fetch("/api/menu-order", { method: "DELETE" });
      toast.success("Menú restablecido al orden predeterminado");
    } catch (err) {
      console.error(err);
    }
  }, [role, isSuperAdmin, showParking, showBalance]);

  const handleCancel = useCallback(() => {
    const all = buildMobileItems(role, isSuperAdmin, showParking, showBalance);
    const visible = all.filter((i) => i.condition);
    try {
      const saved = localStorage.getItem(MENU_ORDER_KEY);
      if (saved) {
        setItems(applyOrder(visible, JSON.parse(saved)));
      } else if (initialMenuOrder) {
        setItems(applyOrder(visible, initialMenuOrder));
      } else {
        setItems(visible);
      }
    } catch {
      setItems(visible);
    }
    setEditing(false);
  }, [role, isSuperAdmin, showParking, showBalance, initialMenuOrder]);

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
  const canEditMenu = isSuperAdmin || role === "ADMIN";

  return (
    <Sheet open={open} onOpenChange={(val) => {
      setOpen(val);
      if (!val) setEditing(false);
    }}>
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

      <SheetContent side="left" className="flex flex-col w-[290px] sm:w-[310px] p-4 max-h-screen overflow-hidden">
        <SheetTitle className="sr-only">Menú de Navegación</SheetTitle>

        {/* Logo Header */}
        <Link
          href="#"
          className="flex items-center justify-center mb-3 px-2 py-1 transition-all shrink-0"
          onClick={() => {
            if (!editing) setOpen(false);
          }}
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

        {/* Editing Mode Banner */}
        {editing && (
          <div className="flex items-center justify-between pb-2 mb-2 border-b shrink-0">
            <div>
              <p className="text-xs font-bold text-foreground">Reordenar menú</p>
              <p className="text-[10px] text-muted-foreground">Tocá ▲ ▼ o arrastrá ≡</p>
            </div>
            <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">
              Edición móvil
            </span>
          </div>
        )}

        {/* Scrollable Navigation List */}
        <div className="flex-1 overflow-y-auto pr-1 -mr-1">
          <nav className="grid gap-1 text-sm font-medium">
            {items.map((item, index) => {
              if (editing) {
                return (
                  <div
                    key={item.id}
                    ref={(el) => setItemRef(el, index)}
                    className="flex items-center justify-between gap-1.5 rounded-lg px-2 py-1.5 my-0.5 bg-muted/60 border border-border/80 select-none"
                    style={{ touchAction: "none" }}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span
                        onPointerDown={(e) => onPointerDown(e, index)}
                        onPointerMove={onPointerMove}
                        onPointerUp={onPointerUp}
                        className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground touch-none shrink-0"
                        style={{ touchAction: "none" }}
                        title="Arrastrar para mover"
                      >
                        <GripVertical className="h-4 w-4" />
                      </span>
                      {item.icon}
                      <span className="text-sm font-medium text-foreground truncate">
                        {item.label}
                      </span>
                    </div>

                    {/* Up / Down Buttons for Easy Mobile Tapping */}
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => moveItem(index, "up")}
                        disabled={index === 0}
                        className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-background/80 disabled:opacity-20 disabled:pointer-events-none transition-colors"
                        title="Mover arriba"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveItem(index, "down")}
                        disabled={index === items.length - 1}
                        className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-background/80 disabled:opacity-20 disabled:pointer-events-none transition-colors"
                        title="Mover abajo"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              }

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

            {/* Public site link (when not editing) */}
            {!editing && (
              <>
                <div className="my-2 border-t" />
                <Link
                  href="/?preview=true"
                  target="_blank"
                  className={LINK_CLASS}
                  onClick={() => setOpen(false)}
                >
                  <Building className="h-5 w-5 text-teal-500 shrink-0" />
                  Ver Sitio Público
                </Link>
              </>
            )}
          </nav>
        </div>

        {/* Footer actions / Edit button */}
        {canEditMenu && (
          <div className="pt-2 border-t mt-2 shrink-0">
            {editing ? (
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={handleSave}
                  className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
                >
                  <Check className="h-3.5 w-3.5" />
                  Guardar orden
                </button>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Restablecer
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border"
                  >
                    <X className="h-3 w-3" />
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="flex items-center justify-center gap-2 w-full py-2 text-xs font-medium text-muted-foreground hover:text-primary transition-colors border border-dashed rounded-lg hover:border-primary/50 group bg-muted/20"
                title="Editar orden del menú"
              >
                <Pencil className="h-3.5 w-3.5 group-hover:scale-110 transition-transform text-muted-foreground group-hover:text-primary" />
                <span>Editar menú</span>
              </button>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
