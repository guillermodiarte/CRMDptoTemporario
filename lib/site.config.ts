/**
 * Configuración global del sitio público.
 *
 * Estos son los valores por defecto que se usan como fallback si no se han
 * configurado o modificado en la base de datos (SystemSettings).
 *
 * El SuperAdmin (guillermo.diarte@gmail.com) puede editarlos dinámicamente
 * desde el panel de Configuración en el Dashboard.
 */

export const SITE_CONFIG_DEFAULTS = {
  // Identidad & Marca
  siteName: "Alojamientos Di'Arte",
  siteSlogan: "Departamentos temporarios premium en Formosa, Argentina. Equipados para tu comodidad y listos para hacer de tu estadía una experiencia inigualable.",
  siteUrl: "https://alojamientosdiarte.com",

  // Contacto principal
  phoneDisplay: "+54 9 351 314-6924",
  phoneWhatsApp: "5493513146924", // Solo números con código de país (ej. 549...)
  email: "contacto@alojamientosdiarte.com",
  whatsappDefaultMsg: "Hola! Me gustaría consultar sobre la disponibilidad de los departamentos.",

  // Ubicación física
  address: "Antártida Argentina 1035",
  city: "Formosa",
  province: "Formosa",
  country: "Argentina",
  googleMapsUrl: "https://maps.app.goo.gl/",
  googleMapsEmbedUrl: "https://www.google.com/maps?q=Ant%C3%A1rtida+Argentina+1035,+Formosa,+Argentina&output=embed",

  // Horarios de atención
  businessHours: "Lunes a Domingo\n8:00 – 22:00 hs",

  // Redes Sociales
  instagramUrl: "https://www.instagram.com/",
  facebookUrl: "",

  // SEO & Metadatos
  seoDescription: "Departamentos temporarios premium en Formosa, Argentina. Totalmente equipados para tu comodidad. Reservas directas y atención personalizada.",
  
  // Footer
  footerCopyright: "Alojamientos Di'Arte",
  footerCredit: "Diseño y desarrollo: Di'Arte",
};

export type SiteConfig = typeof SITE_CONFIG_DEFAULTS;
