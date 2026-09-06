"use client";

import { useEffect } from "react";

export function ThemeColorSync() {
  useEffect(() => {
    const applyThemeColor = () => {
      const isDark = document.documentElement.classList.contains("dark");
      const color = isDark ? "#020617" : "#ffffff";

      // 1. Find all theme-color meta tags
      const metas = document.querySelectorAll('meta[name="theme-color"]');
      let targetMeta: HTMLMetaElement | null = null;

      // Keep only the first non-media meta, remove all others (especially media-based ones that block dynamic updates)
      metas.forEach((m, idx) => {
        if (idx === 0 && !m.hasAttribute("media")) {
          targetMeta = m as HTMLMetaElement;
        } else {
          m.remove();
        }
      });

      if (!targetMeta) {
        targetMeta = document.createElement("meta");
        targetMeta.name = "theme-color";
        document.head.appendChild(targetMeta);
      }

      // Always set the exact hex color matching current active theme
      targetMeta.setAttribute("content", color);
    };

    // Run immediately on client mount
    applyThemeColor();

    // Observe changes on documentElement class (e.g. 'dark' added/removed)
    const observer = new MutationObserver(() => {
      applyThemeColor();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
