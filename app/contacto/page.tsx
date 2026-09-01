import { PublicNavbar } from "@/components/public-navbar";
import { PublicFooter } from "@/components/public-footer";
import { PublicContactForm } from "@/components/public-contact-form";
import { MapPin, Phone, Mail, Clock, MessageCircle } from "lucide-react";
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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <PublicNavbar siteName={config.siteName} logoUrl={config.logoUrl} />

      {/* Hero */}
      <div className="relative bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white overflow-hidden pt-16">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative w-full max-w-4xl mx-auto px-4 py-24 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-sky-500/20 border border-sky-500/30 px-4 py-1.5 rounded-full text-sky-300 text-sm font-medium mb-6">
            <MessageCircle className="w-4 h-4" />
            Estamos para ayudarte
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
            Contactanos
          </h1>
          <p className="text-lg text-slate-300 max-w-xl mx-auto">
            ¿Tenés preguntas sobre disponibilidad, precios o servicios? Escribinos y te respondemos a la brevedad.
          </p>
        </div>
        {/* Wave */}
        <div className="absolute bottom-0 left-0 right-0 translate-y-[1px]">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full text-slate-50">
            <path d="M0 60L60 50C120 40 240 20 360 16.7C480 13.3 600 26.7 720 30C840 33.3 960 26.7 1080 23.3C1200 20 1320 20 1380 20L1440 20V60H1380C1320 60 1200 60 1080 60C960 60 840 60 720 60C600 60 480 60 360 60C240 60 120 60 60 60H0Z" fill="currentColor" />
          </svg>
        </div>
      </div>

      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex-1 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

          {/* Contact Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 space-y-6">
              <h2 className="text-xl font-bold text-slate-900">Información de contacto</h2>

              {[
                {
                  icon: <Phone className="w-5 h-5" />,
                  title: "Teléfono / WhatsApp",
                  value: config.phoneDisplay,
                  href: `tel:${config.phoneDisplay.replace(/[^\d+]/g, '')}`,
                  color: "bg-green-100 text-green-600"
                },
                {
                  icon: <Mail className="w-5 h-5" />,
                  title: "Email",
                  value: config.email,
                  href: `mailto:${config.email}`,
                  color: "bg-sky-100 text-sky-600"
                },
                {
                  icon: <MapPin className="w-5 h-5" />,
                  title: "Dirección",
                  value: `${config.address}\n${config.city}, ${config.country}`,
                  href: config.googleMapsUrl || "https://maps.app.goo.gl/",
                  color: "bg-orange-100 text-orange-600"
                },
                {
                  icon: <Clock className="w-5 h-5" />,
                  title: "Horario de atención",
                  value: config.businessHours,
                  href: null,
                  color: "bg-purple-100 text-purple-600"
                },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className={`p-2.5 rounded-xl ${item.color} shrink-0`}>
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5">{item.title}</p>
                    {item.href ? (
                      <a href={item.href} target={item.href.startsWith("http") ? "_blank" : undefined}
                        rel="noopener noreferrer"
                        className="text-slate-700 hover:text-sky-600 transition-colors font-medium whitespace-pre-line text-sm">
                        {item.value}
                      </a>
                    ) : (
                      <p className="text-slate-700 font-medium whitespace-pre-line text-sm">{item.value}</p>
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
              className="flex items-center justify-center gap-3 w-full bg-green-500 hover:bg-green-400 transition-colors text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-green-500/20 text-base"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.118 1.528 5.845L0 24l6.335-1.508A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.882a9.87 9.87 0 01-5.031-1.375l-.361-.214-3.742.981.999-3.648-.235-.374A9.861 9.861 0 012.118 12C2.118 6.545 6.545 2.118 12 2.118S21.882 6.545 21.882 12 17.455 21.882 12 21.882z" />
              </svg>
              Consultar por WhatsApp
            </a>
          </div>

          {/* Map + Form */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 h-64">
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

            {/* Interactive Contact form with Email & Captcha */}
            <PublicContactForm config={config} />
          </div>

        </div>
      </div>

      <PublicFooter config={config} />
    </div>
  );
}
