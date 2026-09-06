"use client";

import { useEffect } from "react";

export function ThemeColorSync() {
  useEffect(() => {
    const applyThemeColor = () => {
      const isDark = document.documentElement.classList.contains("dark");
      // Dark slate navy (#020617) matching the dark header/background, or pure white (#ffffff)
      const color = isDark ? "#020617" : "#ffffff";

      // 1. Update or create the default meta theme-color tag
      let defaultMeta = document.querySelector('meta[name="theme-color"]:not([media])') as HTMLMetaElement | null;
      if (!defaultMeta) {
        defaultMeta = document.createElement("meta");
        defaultMeta.name = "theme-color";
        document.head.appendChild(defaultMeta);
      }
      defaultMeta.content = color;

      // 2. Also keep any media-query specific theme-color metas synchronized so Android status bar reacts immediately
      const mediaMetas = document.querySelectorAll('meta[name="theme-color"][media]');
      mediaMetas.forEach((m) => {
        m.setAttribute("content", color);
      });
    };

    // Run immediately on client hydration
    applyThemeColor();

    // Listen for any class change on <html class="dark">
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
