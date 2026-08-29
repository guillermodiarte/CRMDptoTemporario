"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Home, Phone, Compass, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

export function PublicNavbar() {
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

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
      scrolled || mobileMenuOpen
        ? "bg-slate-900 shadow-xl border-b border-slate-800"
        : "bg-slate-900/60 backdrop-blur-md border-b border-white/10"
    }`}>
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2 text-white hover:text-sky-300 transition-colors">
              <Building2 className="w-6 h-6 text-sky-400" />
              <span className="font-bold text-lg sm:text-xl tracking-tight">Alojamientos Di'Arte</span>
            </Link>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex space-x-1">
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
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden">
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
        <div className="md:hidden bg-slate-900/95 backdrop-blur-lg border-b border-slate-800 px-4 pt-2 pb-4 space-y-1 animate-in slide-in-from-top-2 duration-200">
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
        </div>
      )}
    </nav>
  );
}

