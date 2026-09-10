import type { MetadataRoute } from "next";
import { getSiteConfig } from "@/lib/site-config-loader";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const config = await getSiteConfig();
  let siteUrl = config.siteUrl?.trim() || "https://alojamientosdiarte.com";
  if (!siteUrl.startsWith("http")) {
    siteUrl = `https://${siteUrl}`;
  }
  siteUrl = siteUrl.replace(/\/$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/departamentos",
          "/guia",
          "/informacion",
          "/contacto",
          "/uploads/",
          "/icon.png",
          "/manifest.webmanifest",
        ],
        disallow: [
          "/admin",
          "/admin/",
          "/dashboard",
          "/dashboard/",
          "/api",
          "/api/",
          "/select-session",
          "/select-session/",
          "/_next/",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
