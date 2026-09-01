"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

interface ThemeToggleProps {
  className?: string;
  variant?: "icon" | "full";
}

export function ThemeToggle({ className = "", variant = "icon" }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={`w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center opacity-60 ${className}`}
        aria-hidden="true"
      >
        <span className="w-4 h-4 rounded-full bg-white/20" />
      </div>
    );
  }

  const isDark = resolvedTheme === "dark";

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-base font-medium transition-all duration-200 border ${
          isDark
            ? "bg-slate-800/80 hover:bg-slate-800 text-yellow-300 border-slate-700"
            : "bg-white/10 hover:bg-white/15 text-slate-200 border-white/10"
        } ${className}`}
        aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      >
        <span className="flex items-center gap-3">
          {isDark ? (
            <Sun className="w-5 h-5 text-yellow-400" />
          ) : (
            <Moon className="w-5 h-5 text-sky-300" />
          )}
          <span className="text-sm font-semibold">
            {isDark ? "Modo Claro" : "Modo Oscuro"}
          </span>
        </span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-slate-300 font-mono">
          {isDark ? "Oscuro" : "Claro"}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative p-2 rounded-xl text-slate-200 hover:text-white bg-white/10 hover:bg-white/20 border border-white/15 transition-all duration-200 cursor-pointer shadow-sm hover:scale-105 active:scale-95 flex items-center justify-center ${className}`}
      title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-yellow-400 transition-transform duration-300 rotate-0 hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 text-sky-200 transition-transform duration-300 -rotate-12 hover:rotate-0" />
      )}
    </button>
  );
}
