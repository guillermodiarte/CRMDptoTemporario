"use client";

import { useEffect, useState } from "react";

export function LoginThemeWrapper({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("crm-admin-theme-preference");
      // Apply theme class before React hydration completes
      if (saved === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        // Explicitly remove dark class (reset to light)
        document.documentElement.classList.remove("dark");
      }
    } catch (e) {
      document.documentElement.classList.remove("dark");
    }
    setMounted(true);
  }, []);

  // Use inline script approach to prevent flash before React hydrates
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                var theme = localStorage.getItem('crm-admin-theme-preference');
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch(e) {}
            })();
          `,
        }}
      />
      <div className="w-full">{children}</div>
    </>
  );
}
