import { PublicGuideClient } from "@/components/public-guide-client";
import { getSiteConfig } from "@/lib/site-config-loader";

export async function generateMetadata() {
  const config = await getSiteConfig();
  return {
    title: `Guía de ${config.city}, Turismo y Deliveries | ${config.siteName}`,
    description: `Información general, lugares turísticos imperdibles, restaurantes, deliveries de comida y servicios útiles para disfrutar de tu estadía en ${config.city}, ${config.country}.`,
  };
}

export default async function GuiaPage() {
  const config = await getSiteConfig();
  return <PublicGuideClient config={config} />;
}
