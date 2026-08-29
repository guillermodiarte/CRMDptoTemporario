"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import {
  Compass,
  Utensils,
  MapPin,
  Phone,
  Search,
  ExternalLink,
  Coffee,
  Clock,
  Sparkles,
  ShoppingBag,
  Shield,
  Truck,
  Star,
  ChevronRight,
} from "lucide-react";
import { PublicNavbar } from "@/components/public-navbar";
import { PublicFooter } from "@/components/public-footer";
import { SiteConfig, SITE_CONFIG_DEFAULTS } from "@/lib/site.config";

// ─── Types ───────────────────────────────────────────────────────────────────
interface GuideItem {
  id: string;
  category: "turismo" | "gastronomia" | "cafe" | "servicios";
  title: string;
  subtitle: string;
  description: string;
  address?: string;
  phone?: string;
  whatsapp?: string;
  mapsUrl?: string;
  pedidosYa?: boolean;
  schedule?: string;
  badge?: string;
  badgeColor?: string;
  highlights?: string[];
  image?: string;
  rating?: number;
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const GUIDE_ITEMS: GuideItem[] = [
  // ── TURISMO Y PASEOS ──────────────────────────────────────────────────────
  {
    id: "costanera",
    category: "turismo",
    title: "Paseo Costanero 'Vuelta Fermoza'",
    subtitle: "El icono de Formosa junto al Río Paraguay",
    description:
      "Extenso parque ribereño ideal para caminar, andar en bici y disfrutar del atardecer. Fuentes danzantes, ferias artesanales, carritos gastronómicos y miradores con vista al río. El lugar de encuentro por excelencia de los formoseños.",
    address: "Av. Costanera y Río Paraguay",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Paseo+Costanero+Vuelta+Fermoza+Formosa",
    badge: "⭐ Imperdible",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    highlights: ["Mirador al Río Paraguay", "Ferias artesanales fines de semana", "Ciclovía y pista de salud", "Gastronomía nocturna"],
    schedule: "Abierto 24 hs · Más concurrido al atardecer",
    image: "/guia/formosa_costanera_1787964811650.jpg",
    rating: 5,
  },
  {
    id: "laguna-oca",
    category: "turismo",
    title: "Reserva de Biósfera Laguna Oca",
    subtitle: "Naturaleza UNESCO a minutos del centro",
    description:
      "Una de las pocas reservas de biósfera urbanas del mundo (UNESCO). Laguna con balneario en temporada, senderismo, camping y avistaje de cientos de especies de aves autóctonas en un entorno selvático único.",
    address: "Acceso por Ribera Sur · 5 min del centro",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Reserva+Biosfera+Laguna+Oca+Formosa",
    badge: "🌿 Naturaleza UNESCO",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    highlights: ["Avistaje de aves", "Senderismo y senderos naturales", "Kayak y deportes acuáticos", "Área de picnic"],
    schedule: "Todos los días 07:00 – 20:00 hs",
    image: "/guia/formosa_laguna_oca_1787964854398.jpg",
    rating: 5,
  },
  {
    id: "banado-estrella",
    category: "turismo",
    title: "Bañado La Estrella",
    subtitle: "7ª Maravilla Natural de Argentina",
    description:
      "Uno de los humedales más extensos de Sudamérica. Famoso por los 'champales' (árboles en el agua), yacarés, nutrias gigantes y bandadas de espátulas rosadas. Safari fotográfico en piragua por canales naturales de ensueño.",
    address: "RN 81 · Fortín La Soledad / Las Lomitas (a ~300 km)",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Banado+La+Estrella+Formosa",
    badge: "🦜 Maravilla Natural",
    badgeColor: "bg-teal-50 text-teal-700 border-teal-200",
    highlights: ["Safari en piragua/canoa", "Yacarés y nutrias gigantes", "Espátulas rosadas", "Guías locales disponibles"],
    image: "/guia/formosa_banado_estrella_1787964924869.jpg",
    rating: 5,
  },
  {
    id: "plaza-san-martin",
    category: "turismo",
    title: "Plaza San Martín y Gran Mástil",
    subtitle: "El corazón de la ciudad",
    description:
      "Una de las plazas más grandes del país (4 hectáreas). Mástil monumental de 40 m, reloj floral histórico, pérgolas y fuentes. Centro de eventos culturales, ferias y vida cotidiana formoseña.",
    address: "Av. 25 de Mayo y Fontana",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Plaza+San+Martin+Formosa",
    badge: "🏛️ Centro Histórico",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    highlights: ["Mástil monumental", "Reloj floral histórico", "Eventos y ferias culturales"],
    schedule: "Acceso libre",
    image: "https://images.unsplash.com/photo-1585208798174-6cedd4b57bc8?w=800&q=80",
    rating: 4,
  },
  {
    id: "museo-duffard",
    category: "turismo",
    title: "Museo Histórico 'Juan Pablo Duffard'",
    subtitle: "Historia y patrimonio provincial",
    description:
      "Ubicado en la antigua Casa de Gobierno de 1888 (monumento histórico). Exhibe objetos, testimonios de pueblos originarios Qom, Wichí y Pilagá, y documentos de los fundadores de Formosa.",
    address: "Av. 25 de Mayo y Belgrano",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Museo+Historico+Juan+Pablo+Duffard+Formosa",
    badge: "🏺 Cultura & Historia",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    highlights: ["Edificio colonial de 1888", "Arte de pueblos Qom, Wichí, Pilagá", "Entrada libre y gratuita"],
    schedule: "Mar–Vie 08–12 hs y 16–20 hs · Sáb y Dom tarde",
    image: "https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=800&q=80",
    rating: 4,
  },
  {
    id: "casa-artesania",
    category: "turismo",
    title: "Casa de la Artesanía",
    subtitle: "Arte indígena Qom, Wichí y Pilagá",
    description:
      "Espacio cultural donde artesanos exhiben y venden sus creaciones: cestería en carandillo, tejidos en chaguar, maderas talladas de palo santo y alfarería. Compra directa a los artistas.",
    address: "San Martín y 25 de Mayo (Centro)",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Casa+de+la+Artesania+Formosa",
    badge: "🎨 Artesanías",
    badgeColor: "bg-orange-50 text-orange-700 border-orange-200",
    highlights: ["Tejidos de chaguar", "Tallas en Palo Santo", "Precios directos al artesano"],
    schedule: "Lun–Sáb 08–12:30 y 16:30–20:30 hs",
    image: "https://images.unsplash.com/photo-1530021232320-687d8e3dba54?w=800&q=80",
    rating: 4,
  },
  {
    id: "catedral",
    category: "turismo",
    title: "Catedral Ntra. Señora del Carmen",
    subtitle: "Joya arquitectónica del centro cívico",
    description:
      "Hermoso templo de estilo neogótico frente a la Plaza San Martín. Sede de la Diócesis de Formosa, con imponentes vitrales y fachada de mármol. Ícono arquitectónico e histórico.",
    address: "Av. 25 de Mayo y Moreno",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Catedral+Nuestra+Senora+del+Carmen+Formosa",
    badge: "⛪ Patrimonio",
    badgeColor: "bg-slate-100 text-slate-700 border-slate-300",
    highlights: ["Vitrales históricos", "Arquitectura neogótica", "Frente a Plaza San Martín"],
    image: "https://images.unsplash.com/photo-1548625149-fc4a29cf7092?w=800&q=80",
    rating: 4,
  },
  {
    id: "paseo-ferroviario",
    category: "turismo",
    title: "Paseo Ferroviario & Polo Gastronómico",
    subtitle: "Historia y sabores junto al río",
    description:
      "Antiguo predio ferroviario reconvertido en polo cultural y gastronómico sobre la costanera. Ideal para probar la cocina regional: sopa paraguaya, chipa guazú, surubí frito y el típico 'alito' formoseño.",
    address: "Ribera del Río Paraguay",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Paseo+Ferroviario+Formosa",
    badge: "🚂 Gastronomía Regional",
    badgeColor: "bg-yellow-50 text-yellow-700 border-yellow-200",
    highlights: ["Surubí y Pacú fritos", "Sopa paraguaya", "Chipa Guazú", "El típico 'Alito' formoseño"],
    schedule: "Noches y fines de semana",
    image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80",
    rating: 5,
  },

  // ── GASTRONOMÍA & DELIVERIES ────────────────────────────────────────────────
  {
    id: "ribera-resto",
    category: "gastronomia",
    title: "La Ribera Restó & Bar",
    subtitle: "Pescados de río con vista panorámica",
    description:
      "En plena Costanera, especializado en surubí y pacú a la parrilla, pastas caseras y carnes. Vista al Río Paraguay, cerveza artesanal y tragos de autor. El restaurante más clásico de Formosa.",
    address: "Paseo Costanero 'Vuelta Fermoza'",
    phone: "+54 370 442-9900",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=La+Ribera+Resto+Costanera+Formosa",
    badge: "⭐ Recomendado",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    highlights: ["Pacú y Surubí a la parrilla", "Vista al Río Paraguay", "Cerveza artesanal y tragos"],
    schedule: "Mar–Dom 19:30 – 02:00 hs",
    image: "/guia/formosa_ribera_resto_1787964873289.jpg",
    rating: 5,
  },
  {
    id: "alma-verde",
    category: "gastronomia",
    title: "Paseo Alma Verde",
    subtitle: "Gastronomía regional y bodegón costanero",
    description:
      "En la Costanera Vuelta Fermoza, propone cocina regional con pescados de río, carnes a la parrilla y especialidades formoseñas en ambiente campestre. Ideal para almorzar o cenar con vista al agua.",
    address: "Av. Costanera 'Vuelta Fermoza'",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Alma+Verde+Costanera+Formosa",
    badge: "🌿 Regional",
    badgeColor: "bg-green-50 text-green-700 border-green-200",
    highlights: ["Pescados de río", "Carnes a la parrilla", "Ambiente familiar y campestre"],
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80",
    rating: 4,
  },
  {
    id: "yanki-food",
    category: "gastronomia",
    title: "Yanki Food",
    subtitle: "Hamburguesas artesanales y pizzas premium",
    description:
      "Uno de los favoritos de la ciudad para pedir delivery o comer en el lugar. Hamburguesas artesanales, pizzas variadas y combos especiales. Calificación 4.5★ en Restaurant Guru.",
    address: "España 154, Formosa",
    phone: "+54 370 409-8209",
    whatsapp: "5493704098209",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Yanki+Food+Formosa+España+154",
    pedidosYa: true,
    badge: "🍔 Delivery Top",
    badgeColor: "bg-red-50 text-red-700 border-red-200",
    highlights: ["Hamburguesas artesanales", "Pizzas variadas", "Delivery rápido"],
    schedule: "Mar–Dom 19:00 – 02:00 hs",
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80",
    rating: 4,
  },
  {
    id: "francesco-pizza",
    category: "gastronomia",
    title: "Francesco Pizza Napoletana",
    subtitle: "La mejor pizza napolitana de Formosa",
    description:
      "Altamente calificado en toda la ciudad por sus pizzas artesanales al horno de leña, masa de fermentación lenta, ingredientes premium y ambiente acogedor. Uno de los más pedidos en plataformas.",
    address: "Centro, Formosa Capital",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Francesco+Pizza+Napoletana+Formosa",
    pedidosYa: true,
    badge: "🍕 Pizza Top",
    badgeColor: "bg-orange-50 text-orange-700 border-orange-200",
    highlights: ["Horno a leña", "Masa de fermentación lenta", "Ingredientes importados"],
    image: "/guia/formosa_pizza_artesanal_1787965047450.jpg",
    rating: 5,
  },
  {
    id: "la-querencia",
    category: "gastronomia",
    title: "Parrilla La Querencia",
    subtitle: "Las mejores carnes al fuego",
    description:
      "Clásica parrilla formoseña con cortes vacunos de primera calidad, achuras, empanadas criollas al horno y fritas. Ambiente familiar con galpón rústico y parrilla a la vista.",
    address: "Av. Gutnisky y Av. 25 de Mayo",
    phone: "+54 370 443-1234",
    whatsapp: "5493704431234",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Parrilla+La+Querencia+Formosa",
    pedidosYa: true,
    badge: "🥩 Parrilla",
    badgeColor: "bg-red-50 text-red-700 border-red-200",
    highlights: ["Asado a la estaca", "Empanadas criollas caseras", "Achuras y cortes premium"],
    image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80",
    rating: 4,
  },
  {
    id: "el-tano-marino",
    category: "gastronomia",
    title: "El Tano Marino",
    subtitle: "Cocina italiana y pescados del litoral",
    description:
      "Muy bien valorado en el centro, propone una combinación de cocina italiana clásica (pastas, risottos) y pescados del litoral. Pasta hecha a mano, atención personalizada y ambiente cálido.",
    address: "Centro de Formosa",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=El+Tano+Marino+Formosa",
    badge: "🍝 Pasta & Pescados",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    highlights: ["Pastas artesanales", "Risottos de surubí", "Cocina italiana-litoral"],
    image: "https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?w=800&q=80",
    rating: 4,
  },
  {
    id: "la-strada",
    category: "gastronomia",
    title: "La Strada Pizzería & Ristorante",
    subtitle: "Pizzas a la piedra y lomos completos",
    description:
      "Gran variedad de pizzas a la piedra, calzones rellenos, lomos completos y pastas frescas. Uno de los deliveries más pedidos. Local amplio con opción de salón y take-away.",
    address: "Av. 25 de Mayo 450",
    phone: "+54 370 443-8899",
    whatsapp: "5493704438899",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=La+Strada+Pizzeria+Formosa",
    pedidosYa: true,
    badge: "🍕 Delivery Top",
    badgeColor: "bg-orange-50 text-orange-700 border-orange-200",
    highlights: ["Pizzas a la piedra", "Lomos completos", "Envío rápido a domicilio"],
    image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80",
    rating: 4,
  },
  {
    id: "cabildo-resto",
    category: "gastronomia",
    title: "Cabildo Resto Club",
    subtitle: "Bar & restaurante con ambiente único",
    description:
      "Un clásico en la zona céntrica para tapas, rabas, milanesas y minutas. Ambiente de bar con música en vivo algunas noches y buena selección de cervezas artesanales.",
    address: "Centro, Formosa",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Cabildo+Resto+Club+Formosa",
    badge: "🍺 Bar & Resto",
    badgeColor: "bg-slate-100 text-slate-700 border-slate-300",
    highlights: ["Rabas y picadas", "Música en vivo los fines de semana", "Cervezas artesanales"],
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
    rating: 4,
  },
  {
    id: "pedidosya-app",
    category: "gastronomia",
    title: "PedidosYa – Delivery en Formosa",
    subtitle: "Cientos de opciones a tu puerta",
    description:
      "La app principal de delivery en Formosa. Pizzas, hamburguesas, sushi, pollo, supermercado, farmacia y más. Seguimiento en tiempo real, pago con tarjeta o efectivo.",
    pedidosYa: true,
    badge: "📱 App de Delivery",
    badgeColor: "bg-red-50 text-red-700 border-red-200",
    highlights: ["Envío a toda la ciudad", "Seguimiento en tiempo real", "Múltiples medios de pago"],
    image: "https://images.unsplash.com/photo-1526367790999-0150786686a2?w=800&q=80",
    rating: 5,
  },

  // ── CAFÉS, HELADERÍAS & MERIENDAS ────────────────────────────────────────────
  {
    id: "bonafide",
    category: "cafe",
    title: "Bonafide Café",
    subtitle: "Cafetería premium con pastelería",
    description:
      "Sucursal de la famosa marca nacional. Desayunos completos, medialunas recién horneadas, cafés de especialidad, chocolates artesanales y tortas. Salón amplio con take-away.",
    address: "España 702, Formosa",
    phone: "+54 370 5141000",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Bonafide+España+702+Formosa",
    pedidosYa: true,
    badge: "☕ Café Premium",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    highlights: ["Cafés de especialidad", "Medialunas recién horneadas", "Chocolates y tortas artesanales"],
    image: "/guia/formosa_cafe_bonafide_1787965123868.jpg",
    rating: 4,
  },
  {
    id: "il-viale",
    category: "cafe",
    title: "Il Viale Café & Bistró",
    subtitle: "El café de referencia en el centro",
    description:
      "Café elegante y tradicional en el centro de la ciudad. Ideal para desayunar o merendar con medialunas, tostados gourmet, tartas y repostería artesanal. Amplio salón climatizado.",
    address: "Av. 25 de Mayo y Belgrano",
    phone: "+54 370 442-1122",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Il+Viale+Cafe+Formosa",
    badge: "☕ Café Clásico",
    badgeColor: "bg-sky-50 text-sky-700 border-sky-200",
    highlights: ["Café espresso y capuchinos", "Pastelería artesanal", "Salón climatizado"],
    image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80",
    rating: 4,
  },
  {
    id: "cascote-cafe",
    category: "cafe",
    title: "Cascote Café & Bar",
    subtitle: "El punto de encuentro histórico",
    description:
      "Lugar emblemático de Formosa en esquina privilegiada del centro. Desayunos de trabajo, meriendas, sándwiches gourmet y minutas rápidas. Mucha trayectoria y clientela fiel.",
    address: "España y Rivadavia (esquina)",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Cascote+Cafe+Formosa",
    badge: "🏠 Clásico de Formosa",
    badgeColor: "bg-slate-100 text-slate-700 border-slate-300",
    highlights: ["Desayunos completos", "Sándwiches gourmet", "Trayectoria y tradición"],
    image: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&q=80",
    rating: 4,
  },
  {
    id: "cafe-martinez",
    category: "cafe",
    title: "Café Martínez",
    subtitle: "Cafetería de especialidad nacional",
    description:
      "Franquicia líder en Argentina de cafés de especialidad con propuesta de desayunos saludables, medialunas, tostados, ensaladas y muffins. Ambiente moderno y cómodo.",
    address: "Centro, Formosa",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Cafe+Martinez+Formosa",
    badge: "☕ Especialidad",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    highlights: ["Café de especialidad", "Desayunos saludables", "Ambiente moderno"],
    image: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&q=80",
    rating: 4,
  },
  {
    id: "dino-helados",
    category: "cafe",
    title: "Helados Dino",
    subtitle: "La heladería artesanal icónica",
    description:
      "La marca de helados más famosa y amada de Formosa. Cucuruchos generosos, copas heladas, tortas y paletas. Varios sabores de chocolate, dulce de leche y frutas tropicales.",
    address: "Av. 25 de Mayo 520 (y sucursales)",
    phone: "+54 370 442-7000",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Dino+Helados+Formosa",
    pedidosYa: true,
    badge: "🍦 Heladería Icónica",
    badgeColor: "bg-pink-50 text-pink-700 border-pink-200",
    highlights: ["Helados artesanales cremosos", "Tortas heladas", "Delivery a domicilio"],
    image: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=800&q=80",
    rating: 5,
  },

  // ── SERVICIOS, TRANSPORTE & EMERGENCIAS ───────────────────────────────────
  {
    id: "emergencias-107",
    category: "servicios",
    title: "SIPEC – Emergencias Médicas 107",
    subtitle: "Ambulancias de urgencia · Llamada gratuita",
    description:
      "Sistema Integrado de Emergencias y Catástrofes de Formosa. Ante cualquier urgencia médica marcá el 107 desde cualquier teléfono fijo o celular sin costo.",
    phone: "107",
    badge: "🚑 Urgencias 24 hs",
    badgeColor: "bg-red-50 text-red-700 border-red-200",
    highlights: ["Llamada gratuita", "Ambulancias de guardia 24 hs", "Cobertura en toda la ciudad"],
    image: "https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=800&q=80",
  },
  {
    id: "policia-911",
    category: "servicios",
    title: "Policía de Formosa – Comando 911",
    subtitle: "Seguridad y emergencias policiales",
    description:
      "Central de emergencias de la Policía Provincial para asistencia inmediata ante cualquier situación de seguridad. Respuesta rápida en toda la ciudad.",
    phone: "911",
    badge: "🚔 Seguridad 24 hs",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    highlights: ["Llamada gratuita 24 hs", "También al 101"],
    image: "https://images.unsplash.com/photo-1551361415-69c99e90f2a6?w=800&q=80",
  },
  {
    id: "hospital-alta-complejidad",
    category: "servicios",
    title: "Hospital de Alta Complejidad",
    subtitle: "Centro médico de máxima referencia regional",
    description:
      "Hospital de referencia provincial con tecnología de punta, guardia médica permanente, cirugía, traumatología, neonatología y especialidades de alta complejidad.",
    address: "Av. Néstor Kirchner y Pantaleón Gómez",
    phone: "+54 370 443-6109",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Hospital+Alta+Complejidad+Formosa",
    badge: "🏥 Hospital de Referencia",
    badgeColor: "bg-sky-50 text-sky-700 border-sky-200",
    highlights: ["Guardia 24 hs", "Alta tecnología", "Especialidades complejas"],
    image: "https://images.unsplash.com/photo-1504439468489-c8920d796a29?w=800&q=80",
  },
  {
    id: "remises",
    category: "servicios",
    title: "Remises y Radiotaxi Formosa",
    subtitle: "Traslados seguros en toda la ciudad",
    description:
      "Servicio de remises con cobertura en toda la ciudad y alrededores. Traslados al Aeropuerto El Pucú, Terminal de Ómnibus y excursiones a destinos provinciales.",
    phone: "+54 370 442-8888",
    whatsapp: "5493704428888",
    badge: "🚖 Transporte 24 hs",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    highlights: ["Aeropuerto El Pucú", "Terminal de Ómnibus", "Servicio nocturno disponible"],
    image: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800&q=80",
  },
  {
    id: "farmacias",
    category: "servicios",
    title: "Farmacias de Turno",
    subtitle: "Medicamentos y atención nocturna",
    description:
      "Varias farmacias con servicio de guardia nocturna y en feriados. Las principales cadenas en el centro (Farmacity y otras) permanecen abiertas hasta tarde o las 24 hs.",
    address: "Centro y Av. 25 de Mayo",
    badge: "💊 Salud",
    badgeColor: "bg-green-50 text-green-700 border-green-200",
    highlights: ["Farmacity (Av. 25 de Mayo)", "Atención nocturna disponible", "Feriados y fines de semana"],
    image: "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&q=80",
  },
];

// ─── Category Config ──────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: "todos",       label: "Todo",                    icon: "✨", color: "from-slate-700 to-slate-900" },
  { id: "turismo",    label: "Turismo & Paseos",         icon: "🧭", color: "from-emerald-500 to-teal-700" },
  { id: "gastronomia",label: "Restós & Deliveries",      icon: "🍽️", color: "from-orange-500 to-red-600"   },
  { id: "cafe",       label: "Cafés & Helados",           icon: "☕", color: "from-amber-500 to-yellow-600" },
  { id: "servicios",  label: "Servicios & Emergencias",  icon: "🛡️", color: "from-sky-500 to-blue-700"     },
] as const;

// ─── Star rating component ────────────────────────────────────────────────────
function StarRating({ rating }: { rating?: number }) {
  if (!rating) return null;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-3 h-3 ${i < rating ? "text-amber-400 fill-amber-400" : "text-slate-200 fill-slate-200"}`}
        />
      ))}
    </div>
  );
}

// ─── Guide Card ───────────────────────────────────────────────────────────────
function GuideCard({ item }: { item: GuideItem }) {
  return (
    <div className="group bg-white rounded-3xl overflow-hidden border border-slate-200/70 shadow-sm hover:shadow-2xl hover:shadow-slate-200 hover:-translate-y-1 transition-all duration-300 flex flex-col">
      {/* Image */}
      <div className="relative h-44 overflow-hidden bg-slate-100 shrink-0">
        <img
          src={item.image || "https://images.unsplash.com/photo-1516738901171-8eb4fc13bd20?w=800&q=80"}
          alt={item.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        {/* Badge */}
        {item.badge && (
          <div className="absolute top-3 left-3">
            <span className={`inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-full border backdrop-blur-sm ${item.badgeColor || "bg-white/80 text-slate-700 border-slate-200"}`}>
              {item.badge}
            </span>
          </div>
        )}
        {/* Rating bottom-right */}
        {item.rating && (
          <div className="absolute bottom-3 right-3 bg-black/50 backdrop-blur-sm rounded-lg px-2 py-1">
            <StarRating rating={item.rating} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-5">
        <div className="mb-3">
          <h3 className="font-bold text-base text-slate-900 group-hover:text-sky-600 transition-colors leading-tight mb-0.5">
            {item.title}
          </h3>
          <p className="text-xs font-semibold text-slate-500">{item.subtitle}</p>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed mb-4 line-clamp-3">{item.description}</p>

        {/* Highlights */}
        {item.highlights && item.highlights.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {item.highlights.map((h, i) => (
              <span key={i} className="text-[11px] bg-slate-100 text-slate-600 font-medium px-2.5 py-1 rounded-lg">
                {h}
              </span>
            ))}
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Footer info + actions */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <div className="space-y-1.5">
            {item.address && (
              <div className="flex items-start gap-1.5 text-xs text-slate-500">
                <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />
                <span>{item.address}</span>
              </div>
            )}
            {item.schedule && (
              <div className="flex items-start gap-1.5 text-xs text-slate-500">
                <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />
                <span>{item.schedule}</span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            {item.mapsUrl && (
              <a
                href={item.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold px-3 py-2 rounded-xl transition-colors text-xs"
              >
                <MapPin className="w-3.5 h-3.5 text-sky-600" />
                Cómo llegar
              </a>
            )}
            {item.phone && (
              <a
                href={`tel:${item.phone.replace(/[^0-9+]/g, "")}`}
                className="inline-flex items-center gap-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 font-semibold px-3 py-2 rounded-xl transition-colors text-xs"
              >
                <Phone className="w-3.5 h-3.5" />
                {item.phone}
              </a>
            )}
            {item.whatsapp && (
              <a
                href={`https://wa.me/${item.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-green-50 hover:bg-green-100 text-green-700 font-semibold px-3 py-2 rounded-xl transition-colors text-xs"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                WhatsApp
              </a>
            )}
            {item.pedidosYa && (
              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 font-semibold px-3 py-2 rounded-xl text-xs border border-amber-200/60">
                <Truck className="w-3.5 h-3.5" />
                PedidosYa
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Client Component ────────────────────────────────────────────────────
export function PublicGuideClient({
  config = SITE_CONFIG_DEFAULTS,
}: {
  config?: SiteConfig;
}) {
  const [selectedCategory, setSelectedCategory] = useState<string>("todos");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredItems = useMemo(() => {
    return GUIDE_ITEMS.filter((item) => {
      const matchesCategory = selectedCategory === "todos" || item.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        (item.address && item.address.toLowerCase().includes(q)) ||
        (item.highlights && item.highlights.some((h) => h.toLowerCase().includes(q)));
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  // Counts per category
  const counts = useMemo(() => {
    const c: Record<string, number> = { todos: GUIDE_ITEMS.length };
    for (const item of GUIDE_ITEMS) {
      c[item.category] = (c[item.category] || 0) + 1;
    }
    return c;
  }, []);

  return (
    <div className="min-h-screen bg-[#f8f9fc] flex flex-col">
      <PublicNavbar siteName={config.siteName} />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="relative bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white overflow-hidden pt-16">
        {/* Decorative blobs */}
        <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-sky-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 right-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative w-full max-w-5xl mx-auto px-4 py-20 sm:px-6 lg:px-8 text-center">
          {/* Pill badge */}
          <div className="inline-flex items-center gap-2 bg-sky-500/20 border border-sky-500/30 px-4 py-1.5 rounded-full text-sky-300 text-sm font-semibold mb-6">
            <Compass className="w-4 h-4" />
            Guía de Formosa Capital
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-5">
            Turismo, Gastronomía &{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-emerald-400">
              Servicios Útiles
            </span>
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto mb-10">
            Todo lo que necesitás para disfrutar al máximo tu estadía en Formosa:
            lugares para visitar, restaurantes, deliveries y números de emergencia.
          </p>

          {/* Search bar */}
          <div className="max-w-xl mx-auto relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscá paseos, pizzas, helados, museos, emergencias..."
              className="w-full pl-12 pr-14 py-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:bg-white/15 transition-all text-sm sm:text-base shadow-xl"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white bg-white/10 hover:bg-white/20 px-2 py-1 rounded-lg transition-colors"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick stats */}
          <div className="flex items-center justify-center gap-6 mt-10 text-sm text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-400 rounded-full" />
              {counts.turismo} Lugares turísticos
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-orange-400 rounded-full" />
              {counts.gastronomia} Restaurantes
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-amber-400 rounded-full" />
              {counts.cafe} Cafés & Helados
            </div>
          </div>
        </div>

        {/* Wave */}
        <div className="absolute bottom-0 left-0 right-0 translate-y-[1px]">
          <svg viewBox="0 0 1440 50" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full text-[#f8f9fc]">
            <path d="M0 50L60 41.7C120 33.3 240 16.7 360 13.9C480 11.1 600 22.2 720 25C840 27.8 960 22.2 1080 19.4C1200 16.7 1320 16.7 1380 16.7L1440 16.7V50H0Z" fill="currentColor" />
          </svg>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1">

        {/* Category Tabs */}
        <div className="flex items-center gap-2.5 overflow-x-auto pb-2 mb-8 no-scrollbar">
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold whitespace-nowrap transition-all duration-200 border ${
                  isActive
                    ? `bg-gradient-to-r ${cat.color} text-white border-transparent shadow-lg shadow-black/10 scale-105`
                    : "bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-slate-200"
                }`}
              >
                <span className="text-base leading-none">{cat.icon}</span>
                {cat.label}
                <span className={`text-[11px] font-bold rounded-full px-1.5 py-0.5 min-w-[20px] text-center ${isActive ? "bg-white/25 text-white" : "bg-slate-100 text-slate-500"}`}>
                  {counts[cat.id] || 0}
                </span>
              </button>
            );
          })}
        </div>

        {/* Results info */}
        <div className="flex items-center justify-between mb-6 gap-4">
          <p className="text-sm text-slate-500">
            Mostrando <span className="font-bold text-slate-800">{filteredItems.length}</span>{" "}
            {filteredItems.length === 1 ? "lugar" : "lugares"}
          </p>
          {searchQuery && (
            <span className="text-xs text-sky-700 bg-sky-50 border border-sky-200 px-3 py-1 rounded-full font-semibold flex items-center gap-1">
              <Search className="w-3 h-3" />
              "{searchQuery}"
            </span>
          )}
        </div>

        {/* Grid */}
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center bg-white rounded-3xl border border-slate-200 py-20 my-10 text-center max-w-md mx-auto shadow-sm">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Sin resultados</h3>
            <p className="text-sm text-slate-500 mb-6 px-6">
              Probá con términos como "costanera", "pizza", "helados" o "urgencias".
            </p>
            <button
              onClick={() => { setSearchQuery(""); setSelectedCategory("todos"); }}
              className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors"
            >
              Ver todos
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredItems.map((item) => (
              <GuideCard key={item.id} item={item} />
            ))}
          </div>
        )}

        {/* ── CTA Delivery Banner ──────────────────────────────────────────── */}
        <div className="mt-16 rounded-3xl overflow-hidden relative shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-900" />
          {/* decorative bg */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl" />

          <div className="relative p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-8 text-white">
            <div className="space-y-3 text-center md:text-left max-w-xl">
              <span className="inline-block bg-sky-500/20 text-sky-300 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full border border-sky-400/30 mb-1">
                💡 Tip para Huéspedes
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold">
                ¿Querés pedir delivery al departamento?
              </h3>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                Descargá <strong className="text-white">PedidosYa</strong> o contactá directamente a
                los restaurantes con la dirección de tu alojamiento.
                También podés consultar grupos de Facebook locales como{" "}
                <em>"Delivery's Comida Formosa"</em>.
              </p>
            </div>
            <div className="flex flex-col gap-3 shrink-0">
              <a
                href="https://www.pedidosya.com.ar/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-white font-bold py-3.5 px-7 rounded-2xl shadow-lg shadow-sky-500/25 transition-all duration-200 text-sm"
              >
                Abrir PedidosYa
                <ExternalLink className="w-4 h-4" />
              </a>
              <a
                href="https://www.facebook.com/groups/deliveryformosa"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-7 rounded-2xl transition-all duration-200 text-sm border border-white/10"
              >
                Grupo Facebook
                <ChevronRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        {/* ── Emergency Quick Access ──────────────────────────────────────── */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { emoji: "🚑", label: "Emergencias Médicas", number: "107", color: "from-red-500 to-rose-600" },
            { emoji: "🚔", label: "Policía / Seguridad", number: "911", color: "from-blue-500 to-indigo-600" },
            { emoji: "🔥", label: "Bomberos", number: "100", color: "from-orange-500 to-amber-600" },
          ].map((em) => (
            <a
              key={em.number}
              href={`tel:${em.number}`}
              className={`group flex items-center justify-between bg-gradient-to-r ${em.color} text-white rounded-2xl px-6 py-5 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200`}
            >
              <div className="flex items-center gap-4">
                <span className="text-3xl">{em.emoji}</span>
                <div>
                  <p className="text-xs font-semibold opacity-80 uppercase tracking-wide">{em.label}</p>
                  <p className="text-3xl font-black tracking-tight">{em.number}</p>
                </div>
              </div>
              <div className="bg-white/20 rounded-xl p-2 group-hover:bg-white/30 transition-colors">
                <Phone className="w-5 h-5" />
              </div>
            </a>
          ))}
        </div>
      </div>

      <PublicFooter config={config} />
    </div>
  );
}
