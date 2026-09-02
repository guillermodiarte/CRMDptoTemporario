"use client";

import { useEffect, useState } from "react";

export function LoginThemeWrapper({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("crm-admin-theme-preference");
      if (saved === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } catch (e) {
      document.documentElement.classList.remove("dark");
    }
    setMounted(true);
  }, []);

  return <div className="w-full">{children}</div>;
}
