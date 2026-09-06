"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type AdminTheme = "light" | "dark";

interface AdminThemeContextType {
  theme: AdminTheme;
  setTheme: (theme: AdminTheme) => void;
  toggleTheme: () => void;
  isDark: boolean;
}

const AdminThemeContext = createContext<AdminThemeContextType | undefined>(undefined);

const ADMIN_STORAGE_KEY = "crm-admin-theme-preference";
const PUBLIC_STORAGE_KEY = "crm-theme-preference";

export function AdminThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AdminTheme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(ADMIN_STORAGE_KEY) as AdminTheme | null;
      if (saved === "light" || saved === "dark") {
        setThemeState(saved);
      }
    } catch (e) {
      console.error("Error reading admin theme preference:", e);
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    return () => {
      // When unmounting dashboard (e.g. navigating to public site), restore public theme
      try {
        const publicSaved = localStorage.getItem(PUBLIC_STORAGE_KEY);
        if (publicSaved === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      } catch (e) {}
    };
  }, [theme, mounted]);

  const setTheme = (newTheme: AdminTheme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(ADMIN_STORAGE_KEY, newTheme);
    } catch (e) {
      console.error("Error saving admin theme preference:", e);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const isDark = theme === "dark";

  return (
    <AdminThemeContext.Provider value={{ theme, setTheme, toggleTheme, isDark }}>
      <div className={`min-h-screen transition-colors duration-150 ${isDark ? "dark bg-slate-950 text-slate-100" : "bg-slate-50/50 text-slate-900"}`}>
        {children}
      </div>
    </AdminThemeContext.Provider>
  );
}

export function useAdminTheme() {
  const context = useContext(AdminThemeContext);
  if (!context) {
    throw new Error("useAdminTheme must be used within an AdminThemeProvider");
  }
  return context;
}
