"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Home, Phone, Compass, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { SITE_CONFIG_DEFAULTS } from "@/lib/site.config";
import { ThemeToggle } from "./theme-toggle";

interface PublicNavbarProps {
  siteName?: string;
  logoUrl?: string;
  logoUrlDark?: string;
  logoSize?: string;
}

export function PublicNavbar({ 
  siteName = SITE_CONFIG_DEFAULTS.siteName,
  logoUrl = SITE_CONFIG_DEFAULTS.logoUrl,
  logoUrlDark = SITE_CONFIG_DEFAULTS.logoUrlDark,
  logoSize = SITE_CONFIG_DEFAULTS.logoSize,
}: PublicNavbarProps) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { href: "/", label: "Inicio", icon: <Home className="w-4 h-4" /> },
    { href: "/departamentos", label: "Departamentos", icon: <Building2 className="w-4 h-4" /> },
    { href: "/guia", label: "Guía & Turismo", icon: <Compass className="w-4 h-4" /> },
    { href: "/contacto", label: "Contacto", icon: <Phone className="w-4 h-4" /> },
  ];

  const currentLogoSize = Number(logoSize) || 40;

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
      scrolled || mobileMenuOpen
        ? "bg-slate-900/95 dark:bg-slate-950/95 shadow-xl border-b border-slate-800"
        : "bg-slate-900/70 dark:bg-slate-950/70 backdrop-blur-md border-b border-white/10 dark:border-white/5"
    }`}>
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="flex items-center justify-between transition-all duration-200"
          style={{ minHeight: `${Math.max(64, currentLogoSize + 16)}px`, padding: "6px 0" }}
        >
          <div className="flex items-center">
          <Link href="/" className="flex items-center gap-2 text-white hover:text-sky-300 transition-colors">
              {logoUrl ? (
                <>
                  {/* Light mode logo */}
                  <img
                    src={logoUrl}
                    alt={siteName}
                    style={{ height: `${currentLogoSize}px`, maxHeight: `${currentLogoSize}px` }}
                    className="w-auto object-contain transition-all duration-200 dark:hidden"
                  />
                  {/* Dark mode logo (fallback to light if not configured) */}
                  <img
                    src={logoUrlDark || logoUrl}
                    alt={siteName}
                    style={{ height: `${currentLogoSize}px`, maxHeight: `${currentLogoSize}px` }}
                    className="w-auto object-contain transition-all duration-200 hidden dark:block"
                  />
                </>
              ) : (
                <>
                  <Building2 className="w-6 h-6 text-sky-400" />
                  <span className="font-bold text-lg sm:text-xl tracking-tight">{siteName}</span>
                </>
              )}
            </Link>
          </div>

          {/* Desktop Nav + Theme Toggle */}
          <div className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || (link.href === "/guia" && pathname === "/informacion");
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                    isActive ? "bg-white/20 text-white" : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {link.icon}
                  {link.label}
                </Link>
              );
            })}

            <div className="pl-3 border-l border-white/15 ml-2 flex items-center">
              <ThemeToggle />
            </div>
          </div>

          {/* Mobile buttons: Theme Toggle + Menu Button */}
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Abrir menú"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900/98 dark:bg-slate-950/98 backdrop-blur-xl border-b border-slate-800 px-4 pt-2 pb-4 space-y-2 animate-in slide-in-from-top-2 duration-200">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (link.href === "/guia" && pathname === "/informacion");
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`w-full px-4 py-3 rounded-xl text-base font-medium transition-colors flex items-center gap-3 ${
                  isActive ? "bg-sky-500/20 text-sky-300 border border-sky-500/30" : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                {link.icon}
                {link.label}
              </Link>
            );
          })}
          
          <div className="pt-2 border-t border-slate-800">
            <ThemeToggle variant="full" />
          </div>
        </div>
      )}
    </nav>
  );
}
