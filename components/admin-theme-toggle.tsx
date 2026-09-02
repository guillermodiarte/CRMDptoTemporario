"use client";

import { useAdminTheme } from "./admin-theme-provider";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

export function AdminThemeToggle({ className = "" }: { className?: string }) {
  const { isDark, toggleTheme } = useAdminTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={`w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center opacity-60 ${className}`}>
        <span className="w-4 h-4 rounded-full bg-slate-300 dark:bg-slate-600" />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all duration-200 cursor-pointer shadow-xs hover:scale-105 active:scale-95 flex items-center justify-center ${className}`}
      title={isDark ? "Cambiar panel a modo claro" : "Cambiar panel a modo oscuro"}
      aria-label={isDark ? "Cambiar panel a modo claro" : "Cambiar panel a modo oscuro"}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400 transition-transform duration-300 rotate-0 hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 text-sky-600 transition-transform duration-300 -rotate-12 hover:rotate-0" />
      )}
    </button>
  );
}
