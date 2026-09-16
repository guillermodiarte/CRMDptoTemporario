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

export interface QuickReply {
  id: string;
  title: string;
  content: string;
  category?: string; // "Booking" | "Directo" | "Airbnb" | "Otro"
  description?: string;
}

export const DEFAULT_QUICK_REPLIES: QuickReply[] = [
  {
    id: "booking",
    title: "Respuesta Booking",
    category: "Booking",
    description: "Bienvenida y coordinación de check-in para huéspedes de Booking",
    content: "¡Hola! Gracias por reservar con nosotros a través de Booking.com. Te damos una cálida bienvenida a Alojamientos Di'Arte. Para coordinar los detalles de tu llegada y brindarte las instrucciones de acceso, ¿a qué hora estimás tu check-in? Quedamos a tu completa disposición ante cualquier consulta."
  },
  {
    id: "direct",
    title: "Respuesta Directos",
    category: "Directo",
    description: "Instrucciones de confirmación y anticipo de seña para reservas directas",
    content: "¡Hola! Gracias por comunicarte con Alojamientos Di'Arte. Te confirmamos la disponibilidad para las fechas solicitadas. Para confirmar y asegurar el bloqueo de las fechas en el calendario, solicitamos el anticipo de la seña. Por favor avísanos si deseas proceder y te enviamos los datos bancarios. ¡Muchas gracias!"
  },
  {
    id: "airbnb",
    title: "Calificar Huésped Airbnb",
    category: "Airbnb",
    description: "Modelo de calificación 5 estrellas para huéspedes de Airbnb al realizar check-out",
    content: "¡Excelente huésped! Muy cuidadoso, limpio y sumamente respetuoso de las normas de la casa. Mantuvo una comunicación fluida y cordial en todo momento. ¡100% recomendado para cualquier anfitrión de la comunidad!"
  }
];

export interface QuickRepliesSettings {
  enabledUsers: string[]; // Lista de emails de usuarios con el widget habilitado
  userReplies: Record<string, QuickReply[]>; // Respuestas personalizadas por email de usuario
}

export const DEFAULT_QUICK_REPLIES_SETTINGS: QuickRepliesSettings = {
  enabledUsers: ["guillermo.diarte@gmail.com"],
  userReplies: {
    "guillermo.diarte@gmail.com": DEFAULT_QUICK_REPLIES,
  },
};

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
  loginBgUrl: "",
  loginLogoUrl: "",
  loginLogoUrlDark: "",
  loginLogoSize: "208", // px width for login card logo (w-52 = 208px)
  appIconUrl: "/icon.png", // Ícono de la aplicación instalable (PWA / Android / iOS)

  // Slides / Carrusel de Portada
  heroSlides: JSON.stringify(DEFAULT_HERO_SLIDES),
  heroSlideInterval: "6000", // ms between slides (2000-15000)
  heroOverlayOpacity: "45", // % oscurecimiento tenue del fondo (10-90)

  // Contacto principal
  phoneDisplay: "+54 9 351 314-6924",
  phoneWhatsApp: "5493513146924", // Solo números con código de país (ej. 549...)
  email: "contacto@alojamientosdiarte.com",

  // Configuración de WhatsApp y Mensajes
  whatsappDefaultMsg: "Hola! Me gustaría consultar sobre la disponibilidad de los departamentos.",
  whatsappReservationGreeting: "¡Hola! Me gustaría solicitar una reserva.",
  whatsappReservationFooter: "Aguardo su confirmación y datos para el pago del adelanto de seña. ¡Muchas gracias!",
  whatsappDepositNotice: "Recordá que las fechas quedan bloqueadas únicamente luego de recibir el adelanto de seña.",
  whatsappAdminMsgTemplate: "¡Hola {huesped}! Te contacto desde {sitio} con respecto a tu solicitud de reserva en {departamento}.",
  whatsappRedirectDelay: "4", // Segundos antes de redirigir a WhatsApp tras mostrar el aviso (1-30)

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

  // SEO & Metadatos (Google / WhatsApp / Redes Sociales)
  ogImageUrl: "",
  seoDescription: "Alquiler de departamentos temporarios y amoblados en Formosa, Argentina. Alojamientos premium equipados con cocina, WiFi y aire acondicionado. Cerca de atractivos turísticos, Bañado La Estrella y tour a Paraguay.",
  seoKeywords: "alojamientos en formosa, departamentos en formosa, alquileres temporarios formosa, departamentos amoblados formosa, alojamientos temporarios, formosa, departamentos amoblados, alquileres temporarios, turismo formosa, bañado las estrellas, bañado la estrella, tour a paraguay, alquiler por dia formosa, hospedaje formosa, departamentos equipados formosa",
  googleVerification: "",

  // Footer
  footerCopyright: "Alojamientos Di'Arte",
  footerCredit: "Diseño y desarrollo: Guillermo Diarte - Guillermo.diarte@gmail.com",

  // Servidor de Correo SMTP (Hostinger)
  smtpHost: "smtp.hostinger.com",
  smtpPort: "465",
  smtpUser: "contacto@alojamientosdiarte.com",
  smtpPassword: "",
  smtpFromName: "Alojamientos Di'Arte",

  // Páginas públicas
  guiaEnabled: "true", // "true" | "false"

  // Respuestas Rápidas (Portapapeles)
  quickReplies: JSON.stringify(DEFAULT_QUICK_REPLIES_SETTINGS),
};

export type SiteConfig = typeof SITE_CONFIG_DEFAULTS;
