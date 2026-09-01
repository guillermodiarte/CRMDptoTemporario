import { PublicNavbar } from "@/components/public-navbar";
import { PublicFooter } from "@/components/public-footer";
import { PublicContactForm } from "@/components/public-contact-form";
import { MapPin, Phone, Mail, Clock, MessageCircle, ArrowRight } from "lucide-react";
import { getSiteConfig } from "@/lib/site-config-loader";

export async function generateMetadata() {
  const config = await getSiteConfig();
  return {
    title: `Contacto | ${config.siteName}`,
    description: `Ponete en contacto con ${config.siteName}. Estamos en ${config.city}, ${config.country}. Respondemos por WhatsApp, email y teléfono.`,
  };
}

export default async function ContactoPage() {
  const config = await getSiteConfig();

  const whatsappNumber = config.phoneWhatsApp.replace(/\D/g, "");
  const whatsappMsg = encodeURIComponent(config.whatsappDefaultMsg);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors duration-300">
      <PublicNavbar siteName={config.siteName} logoUrl={config.logoUrl} />

      {/* ── HERO (Centered) ── */}
      <div className="relative bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white overflow-hidden pt-16">
        {/* Decorative background glow */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-4 py-20 sm:py-24 text-center">
          <div className="inline-flex items-center gap-2 bg-sky-500/20 border border-sky-500/30 px-4 py-1.5 rounded-full text-sky-300 text-sm font-medium mb-6">
            <MessageCircle className="w-4 h-4" />
            Estamos para ayudarte
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-4 text-center">
            Contactanos
          </h1>
          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto text-center leading-relaxed">
            ¿Tenés preguntas sobre disponibilidad, precios o servicios? Escribinos y te respondemos a la brevedad.
          </p>
        </div>

        {/* Wave bottom connecting to body */}
        <div className="absolute bottom-0 left-0 right-0 translate-y-[1px]">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full text-slate-50 dark:text-slate-950 transition-colors duration-300">
            <path d="M0 60L60 50C120 40 240 20 360 16.7C480 13.3 600 26.7 720 30C840 33.3 960 26.7 1080 23.3C1200 20 1320 20 1380 20L1440 20V60H1380C1320 60 1200 60 1080 60C960 60 840 60 720 60C600 60 480 60 360 60C240 60 120 60 60 60H0Z" fill="currentColor" />
          </svg>
        </div>
      </div>

      {/* ── MAIN BODY — 3-column layout ── */}
      <div className="flex-1">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 pb-24">

          {/* ── 3-COLUMN GRID ── */}
          <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr_380px] gap-8">

            {/* ─── LEFT COLUMN: Contact info + WhatsApp ─── */}
            <div className="space-y-6">
              {/* Info card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm transition-colors duration-300">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Información de contacto</h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Encontranos por el medio que prefieras.</p>
                </div>

                {[
                  {
                    icon: <Phone className="w-5 h-5" />,
                    title: "Teléfono / WhatsApp",
                    value: config.phoneDisplay,
                    href: `tel:${config.phoneDisplay.replace(/[^\d+]/g, '')}`,
                    color: "bg-green-100 dark:bg-green-500/15 text-green-600 dark:text-green-400 ring-1 ring-green-500/20"
                  },
                  {
                    icon: <Mail className="w-5 h-5" />,
                    title: "Email",
                    value: config.email,
                    href: `mailto:${config.email}`,
                    color: "bg-sky-100 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400 ring-1 ring-sky-500/20"
                  },
                  {
                    icon: <MapPin className="w-5 h-5" />,
                    title: "Dirección",
                    value: `${config.address}\n${config.city}, ${config.country}`,
                    href: config.googleMapsUrl || "https://maps.app.goo.gl/",
                    color: "bg-orange-100 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400 ring-1 ring-orange-500/20"
                  },
                  {
                    icon: <Clock className="w-5 h-5" />,
                    title: "Horario de atención",
                    value: config.businessHours,
                    href: null,
                    color: "bg-purple-100 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400 ring-1 ring-purple-500/20"
                  },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className={`p-2.5 rounded-xl ${item.color} shrink-0`}>
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">{item.title}</p>
                      {item.href ? (
                        <a
                          href={item.href}
                          target={item.href.startsWith("http") ? "_blank" : undefined}
                          rel="noopener noreferrer"
                          className="text-slate-800 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400 transition-colors font-medium whitespace-pre-line text-sm"
                        >
                          {item.value}
                        </a>
                      ) : (
                        <p className="text-slate-800 dark:text-slate-200 font-medium whitespace-pre-line text-sm">{item.value}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* WhatsApp CTA */}
              <a
                href={`https://wa.me/${whatsappNumber}?text=${whatsappMsg}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between gap-3 w-full bg-green-500 hover:bg-green-600 transition-all duration-200 text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-green-500/20 text-base"
              >
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.118 1.528 5.845L0 24l6.335-1.508A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.882a9.87 9.87 0 01-5.031-1.375l-.361-.214-3.742.981.999-3.648-.235-.374A9.861 9.861 0 012.118 12C2.118 6.545 6.545 2.118 12 2.118S21.882 6.545 21.882 12 17.455 21.882 12 21.882z" />
                  </svg>
                  Consultar por WhatsApp
                </div>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
              </a>

              {/* Quick-access hours card */}
              <div className="bg-indigo-50 dark:bg-indigo-600/10 border border-indigo-200/80 dark:border-indigo-500/20 rounded-2xl px-6 py-5 transition-colors duration-300">
                <p className="text-indigo-600 dark:text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-1">⚡ Tiempo de respuesta</p>
                <p className="text-slate-800 dark:text-white text-sm font-medium">Respondemos en menos de 24 hs. Consultas urgentes: WhatsApp.</p>
              </div>

              {/* Social / extra links */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm transition-colors duration-300">
                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Seguinos en redes</h3>
                <div className="flex gap-3 flex-wrap">
                  {config.instagramUrl && (
                    <a
                      href={config.instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/20 hover:border-pink-500/50 text-pink-600 dark:text-pink-300 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                      </svg>
                      Instagram
                    </a>
                  )}
                  <a
                    href={`https://wa.me/${whatsappNumber}?text=${whatsappMsg}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 hover:border-green-500/50 text-green-600 dark:text-green-400 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.118 1.528 5.845L0 24l6.335-1.508A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.882a9.87 9.87 0 01-5.031-1.375l-.361-.214-3.742.981.999-3.648-.235-.374A9.861 9.861 0 012.118 12C2.118 6.545 6.545 2.118 12 2.118S21.882 6.545 21.882 12 17.455 21.882 12 21.882z" />
                    </svg>
                    WhatsApp
                  </a>
                </div>
              </div>
            </div>

            {/* ─── CENTER COLUMN: Map + Form ─── */}
            <div className="space-y-6">
              {/* Map */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden h-72 shadow-sm transition-colors duration-300">
                <iframe
                  src={config.googleMapsEmbedUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={`Ubicación ${config.siteName}`}
                />
              </div>

              {/* Interactive Contact form */}
              <PublicContactForm config={config} />
            </div>

            {/* ─── RIGHT COLUMN: FAQ ─── */}
            <div className="space-y-6">
              {/* FAQ Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm transition-colors duration-300">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Preguntas frecuentes</h2>
                <div className="space-y-5">
                  {[
                    {
                      q: "¿Cómo realizo una reserva?",
                      a: "Podés reservar desde la sección 'Inicio', seleccioná la fecha de ingreso y egreso, cantidad de personas y elegí el departamento que más te guste."
                    },
                    {
                      q: "¿Cuál es el horario de check-in?",
                      a: "El check-in es a partir de las 15:00 hs y el check-out hasta las 11:00 hs."
                    },
                    {
                      q: "¿Se aceptan mascotas?",
                      a: "Para garantizar la comodidad, higiene y tranquilidad de todos nuestros huéspedes, no se permiten mascotas en nuestros alojamientos. Agradecemos mucho su comprensión y colaboración."
                    },
                    {
                      q: "¿Cuál es la forma de pago?",
                      a: "Aceptamos transferencia bancaria y efectivo. También aceptamos todas las tarjetas de crédito y débito (con contactless)."
                    },
                    {
                      q: "¿Puedo cambiar la fecha de una reserva?",
                      a: "Sí, es posible solicitar un cambio de fecha de la reserva, siempre que la solicitud se realice con al menos 5 días de anticipación a la fecha original de ingreso. El cambio estará sujeto a la disponibilidad del alojamiento para las nuevas fechas."
                    },
                  ].map((item, i) => (
                    <div key={i} className="border-b border-slate-100 dark:border-slate-800 last:border-0 pb-5 last:pb-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white mb-1.5">{item.q}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{item.a}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      <PublicFooter config={config} />
    </div>
  );
}
