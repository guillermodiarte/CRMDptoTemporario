"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Sparkles,
  Compass,
  HelpCircle,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Building2,
  Phone,
  ChevronDown,
  ShieldCheck,
  Clock,
  Car,
  Wifi,
  Tv,
  Utensils,
  Wind,
  MapPin,
} from "lucide-react";
import { PublicNavbar } from "./public-navbar";
import { PublicFooter } from "./public-footer";
import { SiteConfig } from "@/lib/site.config";
import { SeoStructuredData } from "./seo-structured-data";

interface PublicInfoClientProps {
  config: SiteConfig;
}

const FAQ_ITEMS = [
  {
    q: "¿Cómo realizo una reserva de departamento temporario?",
    a: "Podés ver todos nuestros departamentos disponibles en la sección 'Inicio', seleccionar las fechas deseadas y enviar tu solicitud. Nos contactaremos al instante por WhatsApp para validar disponibilidad, resolver cualquier duda y confirmar la reserva de forma directa con una seña.",
  },
  {
    q: "¿Qué equipamiento y servicios incluyen los departamentos?",
    a: "Todas nuestras unidades se entregan totalmente equipadas y listas para habitar: sommiers de alta densidad, sábanas y toallas de hotelería limpias, cocina completa con anafe o cocina a gas, heladera con freezer, microondas, pava eléctrica, vajilla completa, Smart TV con canales y streaming, aire acondicionado frío/calor y conexión a internet Wi-Fi de alta velocidad.",
  },
  {
    q: "¿Cuáles son los horarios habituales de Check-in y Check-out?",
    a: "El horario estándar de Check-in es a partir de las 15:00 hs y el Check-out hasta las 11:00 hs. En caso de requerir un ingreso anticipado (Early Check-in) o salida tardía (Late Check-out), podés consultarnos previamente y coordinamos según la disponibilidad del departamento.",
  },
  {
    q: "¿Disponen de cocheras o estacionamiento seguro?",
    a: "Sí, disponemos de opciones de cocheras cubiertas y cerradas sujetas a disponibilidad según el departamento que elijas. Te recomendamos indicarnos al momento de reservar si viajás con vehículo para asegurar tu lugar.",
  },
  {
    q: "¿Cómo es el cruce internacional a Paraguay (Alberdi) desde Formosa?",
    a: "El cruce a la ciudad de Alberdi (Paraguay) se realiza en lanchas de pasajeros que parten constantemente desde el Puerto de Formosa. El viaje dura solo 15 minutos navegando el Río Paraguay. El trámite migratorio es muy ágil y los ciudadanos argentinos solo necesitan presentar su DNI vigente. Es un paseo muy popular para compras de indumentaria, bazar y electrónica.",
  },
  {
    q: "¿Cómo visitar el Bañado La Estrella y qué actividades hay?",
    a: "El Bañado La Estrella es la 7ª Maravilla Natural de Argentina y el segundo humedal más grande del país. Se encuentra sobre la Ruta Provincial 28, a 45 km de Las Lomitas. Es ideal para safaris fotográficos, avistaje de aves exóticas, yacarés y carpinchos, y navegación en piragua o kayak entre los míticos champales. En nuestra sección de Guía podés contactar guías locales autorizados.",
  },
  {
    q: "¿Qué medios de pago aceptan para las estadías?",
    a: "Aceptamos transferencias bancarias directas (alias / CBU), dinero en cuenta de Mercado Pago, tarjetas de debito y credito que cuenten con ContactLess (con un pequeño recargo por parte del prestador de servicio) y efectivo en pesos argentinos al momento del ingreso.",
  },
  {
    q: "¿Se admiten mascotas en los departamentos?",
    a: "Para garantizar la máxima higiene y tranquilidad de todos los huéspedes, NO SE PERMITE el ingreso con mascotas.",
  },
  {
    q: "¿Cómo llegar al hotel desde la terminal de omnibus?",
    a: "Desde la terminal de omnibus de Formosa se puede llegar caminando a cualquiera de nuestros departamentos en menos de 10 minutos.",
  },
];

export function PublicInfoClient({ config }: PublicInfoClientProps) {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const toggleFaq = (idx: number) => {
    setOpenFaqIndex(openFaqIndex === idx ? null : idx);
  };

  const cleanPhone = (config.phoneWhatsApp || "5493513146924").replace(/\D/g, "");
  const defaultMsg = config.whatsappDefaultMsg || "Hola! Me gustaría consultar sobre la disponibilidad de los departamentos.";
  const whatsappLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(defaultMsg)}`;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-sky-500 selection:text-white">
      <SeoStructuredData config={config} />
      <PublicNavbar
        siteName={config.siteName}
        logoUrl={config.logoUrl}
        logoUrlDark={config.logoUrlDark}
        logoSize={config.logoSize}
        guiaEnabled={config.guiaEnabled}
      />

      <main className="flex-1 pb-16">
        {/* ─── Hero Section ─── */}
        <div className="relative bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white overflow-hidden pt-16 border-b border-slate-800/80">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="relative max-w-4xl mx-auto px-4 py-20 sm:py-24 text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 backdrop-blur-sm px-4 py-1.5 rounded-full text-sm font-medium text-white/80 mb-6">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              Guía de Estadía &amp; Servicios en Formosa
            </div>
            <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight mb-5 bg-clip-text text-transparent bg-gradient-to-r from-white to-indigo-200">
              Alojamientos Temporarios en Formosa
            </h1>
            <p className="text-lg sm:text-xl text-white/60 max-w-2xl mx-auto leading-relaxed mb-10">
              Departamentos amoblados, turismo y todo lo que necesitás saber para tu estadía en{" "}
              <strong className="text-white/80">{config.siteName || "Alojamientos Di'Arte"}</strong>.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/departamentos"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm bg-indigo-500 hover:bg-indigo-400 text-white shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02]"
              >
                <Building2 className="w-4 h-4" />
                Ver Departamentos
              </Link>
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 transition-all hover:scale-[1.02]"
              >
                <Phone className="w-4 h-4" />
                Consultar por WhatsApp
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 space-y-20">
          {/* ─── Sección 1: Beneficios y Servicios ─── */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <span className="text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-widest block mb-1">
                Confort &amp; Equipamiento
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                ¿Por qué elegir nuestros Departamentos Amoblados?
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                Diseñados tanto para estadías cortas de turismo y negocios como para estancias prolongadas.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-500/15 flex items-center justify-center mb-4 text-2xl">
                  🛋️
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Totalmente Amoblados</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Cocina completa equipada con vajilla, heladera, pava eléctrica, microondas, sommier confortable y ropa blanca de hotelería incluida.
                </p>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/15 flex items-center justify-center mb-4 text-2xl">
                  ❄️
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Climatización &amp; Wi-Fi</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Aire acondicionado frío/calor silencioso en todos los ambientes y conexión Wi-Fi de alta velocidad para trabajar, estudiar o relajarte.
                </p>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-500/15 flex items-center justify-center mb-4 text-2xl">
                  📍
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Ubicación Estratégica</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  En {config.address || "Antártida Argentina 1035"}, Formosa Capital. Con acceso directo al centro comercial, centros de salud y el Paseo Costanero.
                </p>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/15 flex items-center justify-center mb-4 text-2xl">
                  ⚡
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Atención Directa</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Coordinación personalizada y rápida por WhatsApp. Sin comisiones de plataformas intermediarias.
                </p>
              </div>
            </div>

            {/* Checklist de Servicios */}
            <div className="mt-8 bg-slate-100/70 dark:bg-slate-900/60 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800">
              <h4 className="font-bold text-base text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-sky-500" />
                Comodidades incluidas en cada departamento
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-2"><Wind className="w-4 h-4 text-sky-500 shrink-0" /><span>Aire Frío / Calor</span></div>
                <div className="flex items-center gap-2"><Wifi className="w-4 h-4 text-emerald-500 shrink-0" /><span>Wi-Fi Alta Velocidad</span></div>
                <div className="flex items-center gap-2"><Tv className="w-4 h-4 text-purple-500 shrink-0" /><span>Smart TV con Streaming</span></div>
                <div className="flex items-center gap-2"><Utensils className="w-4 h-4 text-amber-500 shrink-0" /><span>Cocina y Vajilla</span></div>
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-teal-500 shrink-0" /><span>Ropa Blanca y Toallas</span></div>
                <div className="flex items-center gap-2"><Car className="w-4 h-4 text-indigo-500 shrink-0" /><span>Cocheras sujetas a disp.</span></div>
              </div>
            </div>
          </section>

          {/* ─── Sección 2: Turismo en Formosa ─── */}
          <section className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 py-16 sm:py-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {/* Encabezado centrado */}
              <div className="text-center mb-12">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 mb-4">
                  <Compass className="w-3.5 h-3.5" />
                  Ecoturismo &amp; Paseos Regionales
                </span>
                <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-4">
                  Turismo en Formosa
                </h2>
                <p className="text-slate-300 text-sm sm:text-lg leading-relaxed max-w-3xl mx-auto">
                  Nuestros departamentos temporarios son el punto de partida perfecto para conocer los atractivos más emblemáticos del noreste argentino y la frontera.
                </p>
              </div>

              {/* Cards con imagen */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">

                {/* Card 1 — Bañado La Estrella */}
                <div className="group rounded-3xl overflow-hidden border border-white/10 bg-white/5 hover:bg-white/10 transition-all hover:scale-[1.01] shadow-xl">
                  <div className="relative h-52 w-full overflow-hidden">
                    <Image
                      src="/uploads/banado_la_estrella.webp"
                      alt="Bañado La Estrella, Formosa Argentina — humedal con champales y aves exóticas"
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent" />
                    <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-teal-500/90 text-white shadow">
                      🦜 7ª Maravilla Argentina
                    </span>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-white mb-2">Bañado La Estrella</h3>
                    <p className="text-sm text-slate-300 leading-relaxed mb-5">
                      El segundo humedal más grande del país. Safaris fotográficos, avistaje de yacarés, carpinchos y paseos en piragua entre árboles cubiertos por enredaderas (champales).
                    </p>
                    <Link
                      href="/guia"
                      className="inline-flex items-center gap-1.5 text-teal-300 hover:text-teal-200 text-xs font-bold transition-colors"
                    >
                      Ver Guía Turística <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                {/* Card 2 — Tour a Paraguay */}
                <div className="group rounded-3xl overflow-hidden border border-white/10 bg-white/5 hover:bg-white/10 transition-all hover:scale-[1.01] shadow-xl">
                  <div className="relative h-52 w-full overflow-hidden">
                    <Image
                      src="/uploads/tour_paraguay_alberdi.webp"
                      alt="Lancha cruzando el Río Paraguay de Formosa a Alberdi"
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent" />
                    <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/90 text-white shadow">
                      🇵🇾 Cruce Internacional
                    </span>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-white mb-2">Tour a Paraguay (Alberdi)</h3>
                    <p className="text-sm text-slate-300 leading-relaxed mb-5">
                      Cruce en lancha de solo 15 minutos por el Río Paraguay. Un gran centro de compras accesible presentando únicamente DNI argentino.
                    </p>
                    <Link
                      href="/guia"
                      className="inline-flex items-center gap-1.5 text-rose-300 hover:text-rose-200 text-xs font-bold transition-colors"
                    >
                      Ver Detalles en la Guía <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                {/* Card 3 — Costanera Vuelta Fermoza */}
                <div className="group rounded-3xl overflow-hidden border border-white/10 bg-white/5 hover:bg-white/10 transition-all hover:scale-[1.01] shadow-xl">
                  <div className="relative h-52 w-full overflow-hidden">
                    <Image
                      src="/uploads/costanera_vuelta_fermoza.webp"
                      alt="Costanera Vuelta Fermoza al atardecer con fuentes danzantes iluminadas"
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent" />
                    <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/90 text-white shadow">
                      🌅 Paseo Ribereño
                    </span>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-white mb-2">Costanera Vuelta Fermoza</h3>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      El corazón recreativo de Formosa: miradores al río, fuentes de aguas danzantes, ferias artesanales y restaurantes para degustar pacú y surubí fresco.
                    </p>
                  </div>
                </div>

              </div>
            </div>
          </section>

          {/* ─── Sección 3: Preguntas Frecuentes (FAQ) ─── */}
          <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 mb-3">
                <HelpCircle className="w-3.5 h-3.5" />
                Preguntas Frecuentes
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                Todo lo que necesitás saber sobre tu Estadía
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                Hacé clic en cada pregunta para conocer la respuesta detallada.
              </p>
            </div>

            <div className="space-y-3">
              {FAQ_ITEMS.map((item, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div
                    key={idx}
                    className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 overflow-hidden transition-all shadow-2xs"
                  >
                    <button
                      type="button"
                      onClick={() => toggleFaq(idx)}
                      className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 font-semibold text-sm sm:text-base text-slate-900 dark:text-slate-100 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
                    >
                      <span className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-sky-100 dark:bg-sky-950/70 text-sky-600 dark:text-sky-400 text-xs font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span>{item.q}</span>
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${isOpen ? "rotate-180 text-sky-600 dark:text-sky-400" : ""
                          }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 pt-1 text-sm text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800/60 mt-1">
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* ─── Call to Action Final ─── */}
          <section className="px-4 sm:px-6 lg:px-8 pb-4">
            <div className="max-w-7xl mx-auto bg-gradient-to-r from-sky-600 via-indigo-600 to-sky-700 rounded-3xl p-10 sm:p-16 text-white text-center shadow-xl">
              <h3 className="text-2xl sm:text-4xl font-extrabold mb-3">
                ¿Listo para planificar tu viaje a Formosa?
              </h3>
              <p className="text-sky-100 max-w-xl mx-auto text-sm sm:text-lg mb-8 leading-relaxed">
                Elegí tu departamento amoblado, consultá las fechas disponibles y coordiná directamente con nosotros.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/departamentos"
                  className="px-8 py-3.5 rounded-full font-bold text-sm bg-white text-indigo-950 hover:bg-sky-50 shadow-md transition-all hover:scale-[1.02]"
                >
                  Ver Catálogo de Departamentos
                </Link>
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-8 py-3.5 rounded-full font-bold text-sm bg-emerald-500 hover:bg-emerald-600 text-white shadow-md transition-all hover:scale-[1.02]"
                >
                  Escribinos por WhatsApp
                </a>
              </div>
            </div>
          </section>
        </div>
      </main>

      <PublicFooter config={config} />
    </div>
  );
}
