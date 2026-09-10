import { redirect } from "next/navigation";
import { PublicGuideClient } from "@/components/public-guide-client";
import { getSiteConfig } from "@/lib/site-config-loader";

export async function generateMetadata() {
  const config = await getSiteConfig();
  const title = `Guía de Turismo en Formosa: Bañado La Estrella y Tour a Paraguay | ${config.siteName}`;
  const description = `Guía turística completa de Formosa: Bañado La Estrella (7ma Maravilla Natural), tour de compras a Alberdi (Paraguay), Paseo Costanero, gastronomía regional y deliveries.`;
  return {
    title,
    description,
    keywords: [
      "turismo formosa",
      "bañado las estrellas",
      "bañado la estrella formosa",
      "tour a paraguay",
      "tour de compras alberdi",
      "paseos en formosa",
      "que hacer en formosa",
    ],
    openGraph: {
      title,
      description,
      url: `${config.siteUrl || "https://alojamientosdiarte.com"}/guia`,
    },
    alternates: {
      canonical: `${config.siteUrl || "https://alojamientosdiarte.com"}/guia`,
    },
  };
}

export default async function GuiaPage() {
  const config = await getSiteConfig();
  if (config.guiaEnabled === "false") {
    redirect("/");
  }
  return <PublicGuideClient config={config} />;
}
