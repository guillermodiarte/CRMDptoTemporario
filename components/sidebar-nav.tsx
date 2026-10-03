"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
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
  Pencil,
  Check,
  RotateCcw,
  GripVertical,
} from "lucide-react";
import { ApprovalsNavLink } from "@/components/approvals-nav-link";

export const MENU_ORDER_KEY = "admin_menu_order_v1";

interface NavItem {
  id: string;
  label: string;
  href?: string;
  icon: React.ReactNode;
  isSpecial?: string;
  condition: boolean;
}

interface SidebarNavProps {
  role: string | undefined;
  isSuperAdmin?: boolean;
  showParking: boolean;
  showBalance: boolean;
}

function buildItems(
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
    { id: "balance", label: "Balance", href: "/dashboard/balance", icon: <BarChart3 className="h-5 w-5 text-violet-500 shrink-0" />, condition: showBalance },
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
  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground transition-all hover:text-primary hover:bg-muted text-base font-medium w-full";

// ─── Drag-and-drop hook (pointer events, no HTML5 drag API) ───────────────────
function useDragSort(
  items: NavItem[],
  setItems: React.Dispatch<React.SetStateAction<NavItem[]>>
) {
  const dragIdx = useRef<number | null>(null);
  const overIdx = useRef<number | null>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLSpanElement>, index: number) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      dragIdx.current = index;
      overIdx.current = index;
    },
    []
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLSpanElement>) => {
      if (dragIdx.current === null) return;
      const y = e.clientY;

      // Find which item the pointer is over
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
    },
    [setItems]
  );

  const onPointerUp = useCallback(() => {
    dragIdx.current = null;
    overIdx.current = null;
  }, []);

  const setItemRef = useCallback((el: HTMLDivElement | null, index: number) => {
    itemRefs.current[index] = el;
  }, []);

  return { onPointerDown, onPointerMove, onPointerUp, setItemRef, dragIdx };
}
// ─────────────────────────────────────────────────────────────────────────────

export function SidebarNav({ role, isSuperAdmin, showParking, showBalance }: SidebarNavProps) {
  const [editing, setEditing] = useState(false);
  const [items, setItems] = useState<NavItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const { onPointerDown, onPointerMove, onPointerUp, setItemRef, dragIdx } =
    useDragSort(items, setItems);

  useEffect(() => {
    const all = buildItems(role, isSuperAdmin, showParking, showBalance);
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
    setMounted(true);
  }, []);

  const handleSave = useCallback(() => {
    localStorage.setItem(MENU_ORDER_KEY, JSON.stringify(items.map((i) => i.id)));
    setEditing(false);
  }, [items]);

  const handleReset = useCallback(() => {
    localStorage.removeItem(MENU_ORDER_KEY);
    const all = buildItems(role, isSuperAdmin, showParking, showBalance);
    setItems(all.filter((i) => i.condition));
    setEditing(false);
  }, [role, isSuperAdmin, showParking, showBalance]);

  const handleCancel = useCallback(() => {
    const all = buildItems(role, isSuperAdmin, showParking, showBalance);
    const visible = all.filter((i) => i.condition);
    try {
      const saved = localStorage.getItem(MENU_ORDER_KEY);
      setItems(saved ? applyOrder(visible, JSON.parse(saved)) : visible);
    } catch {
      setItems(visible);
    }
    setEditing(false);
  }, [role, isSuperAdmin, showParking, showBalance]);

  const renderItems = mounted
    ? items
    : buildItems(role, isSuperAdmin, showParking, showBalance).filter((i) => i.condition);

  return (
    <>
      <nav className="grid w-full items-start px-2 lg:px-3">
        {renderItems.map((item, index) => {
          if (item.isSpecial === "approvals") {
            return editing ? (
              <div
                key="approvals"
                ref={(el) => setItemRef(el, index)}
                className="flex items-center gap-1 rounded-lg px-2 py-2 my-0.5 bg-muted/50 border border-dashed border-border cursor-default select-none w-full"
                style={{ touchAction: "none" }}
              >
                <span
                  onPointerDown={(e) => onPointerDown(e, index)}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  className="cursor-grab active:cursor-grabbing p-1.5 text-muted-foreground hover:text-foreground touch-none"
                  style={{ touchAction: "none" }}
                >
                  <GripVertical className="h-4 w-4" />
                </span>
                {item.icon}
                <span className="text-base font-medium text-muted-foreground flex-1">{item.label}</span>
              </div>
            ) : (
              <ApprovalsNavLink key="approvals" />
            );
          }

          return editing ? (
            <div
              key={item.id}
              ref={(el) => setItemRef(el, index)}
              className="flex items-center gap-1 rounded-lg px-2 py-2 my-0.5 bg-muted/50 border border-dashed border-border cursor-default select-none w-full"
              style={{ touchAction: "none" }}
            >
              <span
                onPointerDown={(e) => onPointerDown(e, index)}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                className="cursor-grab active:cursor-grabbing p-1.5 text-muted-foreground hover:text-foreground touch-none"
                style={{ touchAction: "none" }}
              >
                <GripVertical className="h-4 w-4" />
              </span>
              {item.icon}
              <span className="text-base font-medium text-muted-foreground flex-1 truncate">{item.label}</span>
            </div>
          ) : (
            <Link key={item.id} href={item.href!} className={LINK_CLASS}>
              {item.icon}
              {item.label}
            </Link>
          );
        })}

        {!editing && (
          <>
            <div className="my-2 border-t" />
            <Link href="/?preview=true" target="_blank" className={LINK_CLASS}>
              <Building className="h-5 w-5 text-teal-500 shrink-0" />
              Ver Sitio Público
            </Link>
          </>
        )}
      </nav>

      {/* Bottom actions — super admin only */}
      {isSuperAdmin && (
        <div className="px-2 lg:px-4 mt-2">
          {editing ? (
            <div className="flex flex-col gap-1.5">
              <p className="text-[10px] text-muted-foreground text-center mb-0.5 opacity-60">
                Arrastrá ≡ para reordenar
              </p>
              <button
                onClick={handleSave}
                className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Check className="h-3.5 w-3.5" />
                Guardar orden
              </button>
              <button
                onClick={handleReset}
                className="flex items-center justify-center gap-2 w-full py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Restablecer
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center justify-center w-full py-1 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center justify-center gap-1.5 w-full py-1.5 text-xs text-muted-foreground hover:text-primary transition-colors group"
              title="Editar orden del menú"
            >
              <Pencil className="h-3 w-3 group-hover:scale-110 transition-transform" />
              <span className="opacity-60 group-hover:opacity-100">Editar menú</span>
            </button>
          )}
        </div>
      )}
    </>
  );
}
