import type { MetadataRoute } from "next";
import { getSiteConfig } from "@/lib/site-config-loader";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const config = await getSiteConfig();
  let siteUrl = config.siteUrl?.trim() || "https://alojamientosdiarte.com";
  if (!siteUrl.startsWith("http")) {
    siteUrl = `https://${siteUrl}`;
  }
  siteUrl = siteUrl.replace(/\/$/, "");

  const lastModified = new Date();

  return [
    {
      url: `${siteUrl}/`,
      lastModified,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${siteUrl}/departamentos`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/informacion`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/guia`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/contacto`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];
}
