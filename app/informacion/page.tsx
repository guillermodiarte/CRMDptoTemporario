import { PublicInfoClient } from "@/components/public-info-client";
import { getSiteConfig } from "@/lib/site-config-loader";

export async function generateMetadata() {
  const config = await getSiteConfig();
  const title = `Información, Alquileres Temporarios y Turismo en Formosa | ${config.siteName}`;
  const description = `Conocé todo sobre nuestros departamentos amoblados en Formosa: equipamiento, ubicación, preguntas frecuentes sobre reservas, excursiones al Bañado La Estrella y tour a Paraguay.`;
  return {
    title,
    description,
    keywords: [
      "alojamientos en formosa",
      "departamentos en formosa",
      "alquileres temporarios formosa",
      "departamentos amoblados formosa",
      "alojamientos temporarios",
      "formosa",
      "departamentos amoblados",
      "alquileres temporarios",
      "turismo formosa",
      "bañado las estrellas",
      "bañado la estrella formosa",
      "tour a paraguay",
      "alberdi paraguay",
      "alquiler temporario formosa por dia",
    ],
    openGraph: {
      title,
      description,
      url: `${config.siteUrl || "https://alojamientosdiarte.com"}/informacion`,
      images: config.heroSlides?.[0]?.url ? [{ url: config.heroSlides[0].url }] : undefined,
    },
    alternates: {
      canonical: `${config.siteUrl || "https://alojamientosdiarte.com"}/informacion`,
    },
  };
}

export default async function InformacionPage() {
  const config = await getSiteConfig();
  return <PublicInfoClient config={config} />;
}

