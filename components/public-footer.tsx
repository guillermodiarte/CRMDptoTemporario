import Link from "next/link";
import { SITE_CONFIG_DEFAULTS, SiteConfig } from "@/lib/site.config";

interface PublicFooterProps {
  config?: SiteConfig;
}

export function PublicFooter({ config = SITE_CONFIG_DEFAULTS }: PublicFooterProps) {
  return (
    <footer className="bg-slate-900 text-white w-full shrink-0 mt-20">
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="bg-sky-500 p-2 rounded-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
              </div>
              <span className="font-bold text-xl">{config.siteName}</span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">
              {config.siteSlogan}
            </p>
            <div className="flex gap-3">
              {config.phoneWhatsApp && (
                <a href={`https://wa.me/${config.phoneWhatsApp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                  className="bg-green-500 hover:bg-green-400 transition-colors p-2.5 rounded-full text-white" title="WhatsApp">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /><path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.118 1.528 5.845L0 24l6.335-1.508A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.882a9.87 9.87 0 01-5.031-1.375l-.361-.214-3.742.981.999-3.648-.235-.374A9.861 9.861 0 012.118 12C2.118 6.545 6.545 2.118 12 2.118S21.882 6.545 21.882 12 17.455 21.882 12 21.882z" /></svg>
                </a>
              )}
              {config.instagramUrl && (
                <a href={config.instagramUrl} target="_blank" rel="noopener noreferrer"
                  className="bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 hover:opacity-90 transition-opacity p-2.5 rounded-full text-white" title="Instagram">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
                </a>
              )}
            </div>
          </div>

          {/* Quick links */}
          <div className="space-y-4">
            <h3 className="font-bold text-lg text-white">Navegación</h3>
            <ul className="space-y-2">
              {[
                { href: "/", label: "Inicio" },
                { href: "/departamentos", label: "Departamentos" },
                { href: "/guia", label: "Guía & Turismo" },
                { href: "/contacto", label: "Contacto" },
              ].map(link => (
                <li key={link.href}>
                  <Link href={link.href} className="text-slate-400 hover:text-sky-400 transition-colors text-sm flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-sky-500" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h3 className="font-bold text-lg text-white">Contacto</h3>
            <ul className="space-y-3 text-sm text-slate-400">
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-sky-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <span>{config.address}<br />{config.city}, {config.country}</span>
              </li>
              <li className="flex items-center gap-3">
                <svg className="w-5 h-5 text-sky-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                <a href={`tel:${config.phoneDisplay.replace(/[^\d+]/g, '')}`} className="hover:text-sky-400 transition-colors">{config.phoneDisplay}</a>
              </li>
              <li className="flex items-center gap-3">
                <svg className="w-5 h-5 text-sky-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                <a href={`mailto:${config.email}`} className="hover:text-sky-400 transition-colors">{config.email}</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <span>© {new Date().getFullYear()} {config.footerCopyright}. Todos los derechos reservados.</span>
          <span>{config.footerCredit}</span>
        </div>
      </div>
    </footer>
  );
}
