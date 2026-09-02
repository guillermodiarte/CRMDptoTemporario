/**
 * Configuración global del sitio público.
 *
 * Estos son los valores por defecto que se usan como fallback si no se han
 * configurado o modificado en la base de datos (SystemSettings).
 *
 * El SuperAdmin (guillermo.diarte@gmail.com) puede editarlos dinámicamente
 * desde el panel de Configuración en el Dashboard.
 */

export interface HeroSlide {
  id: string;
  image: string;
  title: string;
  subtitle: string;
  buttonText?: string;
  buttonLink?: string;
}

export const DEFAULT_HERO_SLIDES: HeroSlide[] = [
  {
    id: "slide-1",
    image: "",
    title: "Alojamientos Di'Arte",
    subtitle: "Departamentos temporarios premium en Formosa, Argentina. Equipados para tu comodidad y listos para hacer de tu estadía una experiencia inigualable.",
    buttonText: "Ver Departamentos",
    buttonLink: "#departments",
  }
];

export const SITE_CONFIG_DEFAULTS = {
  // Identidad & Marca
  siteName: "Alojamientos Di'Arte",
  siteSlogan: "Departamentos temporarios premium en Formosa, Argentina. Equipados para tu comodidad y listos para hacer de tu estadía una experiencia inigualable.",
  siteUrl: "https://alojamientosdiarte.com",
  // Upload a custom logo from Configuración → Identidad de Marca.
  // Leave empty to use the default Building2 icon in the navbar.
  logoUrl: "",
  logoUrlDark: "",
  logoSize: "40", // px height for navbar logo
  adminLogoUrl: "/uploads/logos/logo-diarte-horizontal.png",
  adminLogoUrlDark: "",
  adminLogoSize: "46", // px height for admin sidebar logo
  loginBgUrl: "/uploads/general/login-bg.png",
  loginLogoUrl: "/uploads/logos/logo-diarte-vertical.png",
  loginLogoUrlDark: "",
  loginLogoSize: "208", // px width for login card logo (w-52 = 208px)

  // Slides / Carrusel de Portada
  heroSlides: JSON.stringify(DEFAULT_HERO_SLIDES),
  heroSlideInterval: "6000", // ms between slides (2000-15000)

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
  footerCredit: "Diseño y desarrollo: Guillermo Diarte - Guillermo.diarte@gmail.com",

  // Servidor de Correo SMTP (Hostinger)
  smtpHost: "smtp.hostinger.com",
  smtpPort: "465",
  smtpUser: "contacto@alojamientosdiarte.com",
  smtpPassword: "",
  smtpFromName: "Alojamientos Di'Arte",
};

export type SiteConfig = typeof SITE_CONFIG_DEFAULTS;
