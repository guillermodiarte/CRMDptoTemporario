"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Home, Phone } from "lucide-react";
import { useEffect, useState } from "react";

export function PublicNavbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
      scrolled
        ? "bg-slate-900 shadow-xl border-b border-slate-800"
        : "bg-slate-900/60 backdrop-blur-md border-b border-white/10"
    }`}>
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2 text-white hover:text-sky-300 transition-colors">
              <Building2 className="w-6 h-6" />
              <span className="font-bold text-xl tracking-tight">Alojamientos Di'Arte</span>
            </Link>
          </div>
          <div className="flex space-x-1">
            <Link
              href="/"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                pathname === "/" ? "bg-white/20 text-white" : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Home className="w-4 h-4" />
              Inicio
            </Link>
            <Link
              href="/departamentos"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                pathname === "/departamentos" ? "bg-white/20 text-white" : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Building2 className="w-4 h-4" />
              Departamentos
            </Link>
            <Link
              href="/contacto"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                pathname === "/contacto" ? "bg-white/20 text-white" : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Phone className="w-4 h-4" />
              Contacto
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

