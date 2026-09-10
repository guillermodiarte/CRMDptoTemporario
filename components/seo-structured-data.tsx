import { SiteConfig } from "@/lib/site.config";

interface SeoStructuredDataProps {
  config: SiteConfig;
}

export function SeoStructuredData({ config }: SeoStructuredDataProps) {
  let siteUrl = config.siteUrl?.trim() || "https://alojamientosdiarte.com";
  if (!siteUrl.startsWith("http")) {
    siteUrl = `https://${siteUrl}`;
  }
  siteUrl = siteUrl.replace(/\/$/, "");

  let ogImageUrl = config.ogImageUrl?.trim();
  if (ogImageUrl) {
    if (!ogImageUrl.startsWith("http")) {
      ogImageUrl = `${siteUrl}${ogImageUrl.startsWith("/") ? "" : "/"}${ogImageUrl}`;
    }
  } else {
    ogImageUrl = `${siteUrl}/icon.png?v=3`;
  }

  const socialLinks = [config.instagramUrl, config.facebookUrl].filter(Boolean);

  const lodgingSchema = {
    "@context": "https://schema.org",
    "@type": ["LodgingBusiness", "ApartmentComplex"],
    "@id": `${siteUrl}/#lodging`,
    name: config.siteName || "Alojamientos Di'Arte",
    alternateName: [
      "Alojamientos Di'Arte Formosa",
      "Departamentos Temporarios Formosa",
      "Alquileres Di'Arte",
    ],
    description:
      config.seoDescription ||
      "Alquiler de departamentos temporarios amoblados en Formosa, Argentina. Equipados con cocina, aire acondicionado y WiFi.",
    url: siteUrl,
    telephone: config.phoneDisplay,
    image: [ogImageUrl],
    address: {
      "@type": "PostalAddress",
      streetAddress: config.address || "Antártida Argentina 1035",
      addressLocality: config.city || "Formosa",
      addressRegion: config.province || "Formosa",
      postalCode: "3600",
      addressCountry: "AR",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: -26.1852,
      longitude: -58.1754,
    },
    hasMap: config.googleMapsUrl || "https://maps.app.goo.gl/",
    priceRange: "$$",
    currenciesAccepted: "ARS",
    paymentAccepted: "Cash, Credit Card, Bank Transfer, Mercado Pago",
    checkinTime: "15:00",
    checkoutTime: "11:00",
    petsAllowed: false,
    amenityFeature: [
      {
        "@type": "LocationFeatureSpecification",
        name: "WiFi gratis de alta velocidad",
        value: true,
      },
      {
        "@type": "LocationFeatureSpecification",
        name: "Aire acondicionado frío/calor",
        value: true,
      },
      {
        "@type": "LocationFeatureSpecification",
        name: "Cocina totalmente equipada",
        value: true,
      },
      {
        "@type": "LocationFeatureSpecification",
        name: "Smart TV y cable",
        value: true,
      },
      {
        "@type": "LocationFeatureSpecification",
        name: "Ropa blanca y toallas incluidas",
        value: true,
      },
      {
        "@type": "LocationFeatureSpecification",
        name: "Cochera disponible (sujeto a disponibilidad)",
        value: true,
      },
    ],
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ],
        opens: "08:00",
        closes: "22:00",
      },
    ],
    sameAs: socialLinks.length > 0 ? socialLinks : undefined,
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "¿Cómo reservar un departamento temporario en Formosa?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Podés consultar disponibilidad y reservar directamente desde nuestro sitio web eligiendo tus fechas de ingreso y egreso, o contactarnos directamente por WhatsApp para una atención inmediata y personalizada sin comisiones de intermediarios.",
        },
      },
      {
        "@type": "Question",
        name: "¿Los departamentos están totalmente amoblados y equipados?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Sí, todos los departamentos de Alojamientos Di'Arte en Formosa están totalmente amoblados y cuentan con cocina completa, heladera, microondas, vajilla, aire acondicionado frío/calor, ropa de cama, toallas y conexión Wi-Fi de alta velocidad.",
        },
      },
      {
        "@type": "Question",
        name: "¿Dónde están ubicados los alojamientos en Formosa?",
        acceptedAnswer: {
          "@type": "Answer",
          text: `Nuestros alojamientos temporarios se encuentran ubicados en ${config.address}, Formosa Capital, con acceso rápido al centro de la ciudad, al Paseo Costanero Vuelta Fermoza, centros comerciales y vías de transporte.`,
        },
      },
      {
        "@type": "Question",
        name: "¿Puedo hospedarme para hacer turismo en Bañado La Estrella o tour de compras a Paraguay?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Sí, nuestros departamentos son la base ideal tanto para turistas que visitan la 7ma Maravilla Natural de Argentina (Bañado La Estrella) como para quienes realizan el cruce y tour de compras a Alberdi (Paraguay) desde el puerto de Formosa.",
        },
      },
      {
        "@type": "Question",
        name: "¿Cuáles son los horarios de check-in y check-out?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "El check-in es a partir de las 15:00 hs y el check-out es hasta las 11:00 hs. Consultá por horarios especiales según disponibilidad.",
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(lodgingSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </>
  );
}
