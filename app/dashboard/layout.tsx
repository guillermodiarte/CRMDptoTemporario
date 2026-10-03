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
  BarChart3,
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
import { ApprovalsProvider } from "@/components/approvals-provider";
import { ApprovalsNavLink } from "@/components/approvals-nav-link";
import { SidebarNav } from "@/components/sidebar-nav";
import Image from "next/image";

import type { Metadata } from "next";
import { getSiteConfig } from "@/lib/site-config-loader";

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig();
  const icon = config.appIconUrl || "/icon.png?v=3";
  return {
    manifest: '/api/manifest-admin',
    icons: {
      icon,
      apple: icon,
    },
    appleWebApp: {
      capable: true,
      title: "Di'Arte Admin",
      statusBarStyle: "default",
    },
  };
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth();
  const config = await getSiteConfig();
  const adminLogo = config.adminLogoUrl || "/images/logo-diarte-horizontal.png";
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
  let showBalance = false; // Default: only visible when enabled

  if (sessionId) {
    const [showParkingSetting, showBalanceSetting, balanceEnabledUsersSetting] = await Promise.all([
      prisma.systemSettings.findUnique({
        where: { sessionId_key: { sessionId, key: "SHOW_PARKING_MENU" } }
      }),
      prisma.systemSettings.findUnique({
        where: { sessionId_key: { sessionId, key: "SHOW_BALANCE_MENU" } }
      }),
      prisma.systemSettings.findUnique({
        where: { sessionId_key: { sessionId, key: "BALANCE_ENABLED_USERS" } }
      }),
    ]);

    if (showParkingSetting) {
      showParking = showParkingSetting.value !== "false";
    }

    // Balance is visible to superadmin always, or to enabled users per BALANCE_ENABLED_USERS / SHOW_BALANCE_MENU
    if (user?.isSuperAdmin) {
      showBalance = true;
    } else {
      const balanceConfigValue = balanceEnabledUsersSetting?.value || showBalanceSetting?.value;
      if (balanceConfigValue) {
        try {
          const enabledUsers: string[] = JSON.parse(balanceConfigValue);
          showBalance = user?.email
            ? enabledUsers.map((e) => e.toLowerCase().trim()).includes(user.email.toLowerCase().trim())
            : false;
        } catch {
          showBalance = false;
        }
      }
    }
  }


  return (
    <AdminThemeProvider>
      <ApprovalsProvider>
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
                <SidebarNav
                  role={role}
                  isSuperAdmin={user?.isSuperAdmin}
                  showParking={showParking}
                  showBalance={showBalance}
                />

                {/* Version Indicator */}
                <div className="p-3 border-t text-center text-xs text-muted-foreground font-semibold">
                  Versión 2.5
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col min-w-0 w-full">
            <header className="sticky top-0 z-50 flex h-14 items-center gap-2 sm:gap-4 border-b bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/85 px-2.5 sm:px-4 lg:h-[60px] lg:px-6 min-w-0 w-full shadow-xs">
              <MobileNav
                role={role}
                user={userForMenu}
                showParking={showParking}
                isSuperAdmin={user?.isSuperAdmin}
                showBalance={showBalance}
                adminLogo={adminLogo}
                adminLogoDark={adminLogoDark}
                adminLogoSize={adminLogoSize}
              />
              <div className="w-full flex-1 min-w-0">
                <form action="/dashboard/search">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      name="q"
                      placeholder="Buscar reserva global..."
                      className="w-full appearance-none bg-background pl-8 shadow-none text-xs sm:text-sm md:w-2/3 lg:w-1/3"
                    />
                  </div>
                </form>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
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
            <main className="flex flex-1 flex-col gap-4 p-3 sm:p-4 lg:gap-6 lg:p-6 min-w-0 w-full max-w-full">
              {children}
            </main>
          </div>
        </div>
      </ApprovalsProvider>
    </AdminThemeProvider>
  )
}
