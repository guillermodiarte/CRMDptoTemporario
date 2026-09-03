"use client";

import { useState, useEffect, useRef } from "react";
import {
  Users, Bed, Wifi, Tv, Wind, Flame, Car, Droplets, Sparkles,
  ChevronLeft, ChevronRight, X, Phone, Star, CalendarDays
} from "lucide-react";
import Link from "next/link";
import { SharedDepartment } from "./shared-ui";
import { PublicFooter } from "./public-footer";
import { SiteConfig, SITE_CONFIG_DEFAULTS } from "@/lib/site.config";
import { DepartmentLocationMap } from "@/components/department-location-map";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, getDay,
  addMonths, isBefore, startOfDay, isWithinInterval, isSameDay
} from "date-fns";
import { es } from "date-fns/locale";

/* ─── helpers ─────────────────────────────────────────────────────────── */
const AMENITY_MAP: Record<string, { icon: React.ReactNode; label: string }> = {
  wifi: { icon: <Wifi className="w-4 h-4" />, label: "Internet WiFi" },
  tv: { icon: <Tv className="w-4 h-4" />, label: "TV Cable / Smart TV" },
  washer: { icon: <Sparkles className="w-4 h-4" />, label: "Lavarropas" },
  ac: { icon: <Wind className="w-4 h-4" />, label: "Aire Acondicionado" },
  heating: { icon: <Flame className="w-4 h-4" />, label: "Calefacción" },
  water: { icon: <Droplets className="w-4 h-4" />, label: "Agua Caliente" },
  parking: { icon: <Car className="w-4 h-4" />, label: "Cochera Privada" },
  linens: { icon: <Bed className="w-4 h-4" />, label: "Ropa de cama" },
};

function parseImages(dept: SharedDepartment): string[] {
  try {
    let parsed: any = dept.images || "[]";
    while (typeof parsed === "string") {
      try {
        const next = JSON.parse(parsed);
        if (typeof next === "string" || Array.isArray(next)) {
          parsed = next;
        } else {
          break;
        }
      } catch {
        break;
      }
    }
    const arr = Array.isArray(parsed) ? parsed : typeof parsed === "string" ? [parsed] : [];
    return arr
      .filter(Boolean)
      .map(item => {
        let clean = typeof item === "string" ? item : (item?.url ?? "");
        while (
          typeof clean === "string" &&
          ((clean.startsWith('"') && clean.endsWith('"')) ||
            (clean.startsWith("'") && clean.endsWith("'")))
        ) {
          clean = clean.slice(1, -1);
        }
        return clean.trim();
      })
      .filter(u => u.length > 0);
  } catch { }
  return [];
}
function parsePrices(dept: SharedDepartment): Record<string, number> {
  try { const p = (dept as any).prices; if (!p) return {}; return JSON.parse(p) ?? {}; } catch { return {}; }
}
function parseAmenities(dept: SharedDepartment): string[] {
  try { const a = (dept as any).amenities; if (!a) return []; const p = JSON.parse(a); return Array.isArray(p) ? p : []; } catch { return []; }
}
function isReserved(dept: SharedDepartment, date: Date): boolean {
  const reservations = (dept as any).reservations ?? [];
  return reservations.some((r: any) => {
    const checkIn = startOfDay(new Date(r.checkIn));
    const checkOut = startOfDay(new Date(r.checkOut));
    return isWithinInterval(date, { start: checkIn, end: addMonths(checkOut, 0) }) &&
      date >= checkIn && date < checkOut;
  });
}

/* ─── Lightbox ─────────────────────────────────────────────────────────── */
function Lightbox({ images, index, onClose }: { images: string[]; index: number; onClose: () => void }) {
  const [current, setCurrent] = useState(index);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setCurrent(p => (p + 1) % images.length);
      if (e.key === "ArrowLeft") setCurrent(p => (p - 1 + images.length) % images.length);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [images.length, onClose]);

  return (
    <div className="fixed inset-0 z-[200] bg-black/96 flex items-center justify-center" onClick={onClose}>
      <button onClick={onClose} className="absolute top-5 right-5 text-white/80 hover:text-white p-2 rounded-full bg-white/10 z-50 transition-colors">
        <X className="w-7 h-7" />
      </button>
      {images.length > 1 && <>
        <button onClick={e => { e.stopPropagation(); setCurrent(p => (p - 1 + images.length) % images.length); }}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white p-3 rounded-full bg-white/10 hover:bg-white/20 z-50 transition-colors">
          <ChevronLeft className="w-8 h-8" />
        </button>
        <button onClick={e => { e.stopPropagation(); setCurrent(p => (p + 1) % images.length); }}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white p-3 rounded-full bg-white/10 hover:bg-white/20 z-50 transition-colors">
          <ChevronRight className="w-8 h-8" />
        </button>
      </>}
      <img src={images[current]} alt={`foto ${current + 1}`}
        className="max-w-full max-h-[88vh] object-contain rounded-xl select-none"
        loading="lazy" decoding="async"
        onClick={e => e.stopPropagation()} />
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 text-white/50 text-sm">{current + 1} / {images.length}</div>
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2 overflow-x-auto max-w-lg px-4">
        {images.map((img, i) => (
          <button key={i} onClick={e => { e.stopPropagation(); setCurrent(i); }}
            className={`shrink-0 w-10 h-10 rounded-lg overflow-hidden border-2 transition-all ${i === current ? "border-white" : "border-transparent opacity-40 hover:opacity-70"}`}>
            <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Availability Calendar Modal ────────────────────────────────────────── */
function AvailabilityModal({ dept, onClose }: { dept: SharedDepartment; onClose: () => void }) {
  const today = startOfDay(new Date());
  const [monthOffset, setMonthOffset] = useState(0);
  const currentMonthStart = startOfMonth(addMonths(today, monthOffset));

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const monthEnd = endOfMonth(currentMonthStart);
  const days = eachDayOfInterval({ start: currentMonthStart, end: monthEnd });
  const startOffset = (getDay(currentMonthStart) + 6) % 7; // Mon = 0

  return (
    <div className="fixed inset-0 z-[150] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200 transition-colors" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Disponibilidad</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Próximos días del departamento</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Month navigation */}
        <div className="flex items-center justify-between mb-5">
          <button onClick={() => setMonthOffset(p => p - 1)} disabled={monthOffset <= 0}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-bold text-slate-800 dark:text-white capitalize">
            {format(currentMonthStart, "MMMM yyyy", { locale: es })}
          </span>
          <button onClick={() => setMonthOffset(p => p + 1)}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-2">
          {["L", "M", "X", "J", "V", "S", "D"].map(d => (
            <div key={d} className="text-center text-xs font-bold text-slate-400 py-1">{d}</div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: startOffset }).map((_, i) => <div key={`e${i}`} />)}
          {days.map((date, i) => {
            const isPast = isBefore(date, today);
            const occupied = !isPast && isReserved(dept, date);
            const isFree = !isPast && !occupied;

            let cls = "text-slate-300 dark:text-slate-600 cursor-default"; // past
            if (isFree) cls = "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold rounded-xl cursor-default hover:bg-emerald-100 dark:hover:bg-emerald-500/25 transition-colors";
            if (occupied) cls = "bg-rose-50 dark:bg-rose-500/15 text-rose-400 dark:text-rose-400 font-bold rounded-xl line-through cursor-default";

            return (
              <div key={i} className={`flex items-center justify-center h-9 text-sm ${cls}`}>
                {format(date, "d")}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="border-t border-slate-100 dark:border-slate-800 mt-5 pt-4 flex items-center justify-center gap-6 text-sm text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-md bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-500/40" />
            <span>Libre</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-md bg-rose-100 dark:bg-rose-500/20 border border-rose-300 dark:border-rose-500/40" />
            <span>Ocupado</span>
          </div>
        </div>

        {/* Dept name */}
        <p className="text-center text-xs text-slate-400 mt-3">{dept.name}</p>
      </div>
    </div>
  );
}

/* ─── Full-screen photo gallery (in-place) ──────────────────────────────── */
function PhotoGallery({ images, onLightbox }: { images: string[]; onLightbox: (i: number) => void }) {
  const [current, setCurrent] = useState(0);
  if (images.length === 0) {
    return <div className="w-full h-full bg-slate-100 rounded-3xl flex items-center justify-center text-slate-400">Sin fotos</div>;
  }

  return (
    <div className="relative w-full h-full rounded-3xl overflow-hidden group">
      {/* Main photo */}
      <img
        src={images[current]}
        alt={`foto ${current + 1}`}
        className="w-full h-full object-cover transition-all duration-500 cursor-zoom-in"
        onClick={() => onLightbox(current)}
      />

      {/* Dark gradient bottom */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

      {/* Counter badge */}
      <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full">
        {current + 1} / {images.length}
      </div>

      {/* Arrow nav — only when multiple photos */}
      {images.length > 1 && (
        <>
          <button
            onClick={e => { e.stopPropagation(); setCurrent(p => (p - 1 + images.length) % images.length); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-slate-800 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); setCurrent(p => (p + 1) % images.length); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-slate-800 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all">
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Thumbnail strip at bottom */}
      {images.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 p-3 flex gap-2 overflow-x-auto scrollbar-none">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={e => { e.stopPropagation(); setCurrent(i); }}
              className={`shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 transition-all ${i === current ? "border-white scale-105 shadow-xl" : "border-white/30 opacity-60 hover:opacity-90"}`}
            >
              <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Single Department Section ─────────────────────────────────────────── */
const ACCENTS = [
  { badge: "bg-indigo-100 text-indigo-700", dot: "bg-indigo-500", text: "text-indigo-600", num: "bg-indigo-50 text-indigo-600", btn: "bg-indigo-600 hover:bg-indigo-700" },
  { badge: "bg-rose-100   text-rose-700", dot: "bg-rose-500", text: "text-rose-600", num: "bg-rose-50   text-rose-600", btn: "bg-rose-600   hover:bg-rose-700" },
  { badge: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500", text: "text-emerald-600", num: "bg-emerald-50 text-emerald-600", btn: "bg-emerald-600 hover:bg-emerald-700" },
  { badge: "bg-amber-100  text-amber-700", dot: "bg-amber-500", text: "text-amber-600", num: "bg-amber-50  text-amber-600", btn: "bg-amber-600  hover:bg-amber-700" },
];

function DeptSection({ dept, index, onLightbox, onAvailability }: {
  dept: SharedDepartment;
  index: number;
  onLightbox: (images: string[], i: number) => void;
  onAvailability: (dept: SharedDepartment) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const images = parseImages(dept);
  const prices = parsePrices(dept);
  const amenities = parseAmenities(dept);
  const flip = index % 2 === 1;
  const accent = ACCENTS[index % ACCENTS.length];

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.08 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  /* Info panel */
  const info = (
    <div className={`flex flex-col justify-center transition-all duration-700 ease-out ${visible ? "opacity-100 translate-x-0" : flip ? "opacity-0 translate-x-12" : "opacity-0 -translate-x-12"}`}>
      {/* Number bar */}
      <div className="flex items-center gap-3 mb-5">
        <div className={`w-11 h-11 rounded-2xl ${accent.num} flex items-center justify-center font-black text-lg`}>
          {String(index + 1).padStart(2, "0")}
        </div>
        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
        <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Departamento</span>
      </div>

      <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-3">{dept.name}</h2>

      {/* Mobile photos — only visible on mobile/tablet (< lg) */}
      <div className="block lg:hidden my-6">
        <PhotoGallery images={images} onLightbox={(i) => onLightbox(images, i)} />
      </div>

      <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-6 text-base whitespace-pre-wrap">
        {dept.description || "Un hermoso departamento completamente equipado para tu estadía. Perfecto para descansar con todas las comodidades del hogar."}
      </p>

      {/* Stats */}
      <div className="flex flex-wrap gap-3 mb-6">
        <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl ${accent.badge} text-sm font-bold`}>
          <Users className="w-4 h-4" /> Hasta {dept.maxPeople} {dept.maxPeople === 1 ? "persona" : "personas"}
        </span>
        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-bold">
          <Bed className="w-4 h-4" /> {dept.bedCount} camas
        </span>
      </div>

      {/* Precios & Servicios al costado */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 items-stretch">
        {/* Prices */}
        <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-xs transition-colors flex flex-col justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Precios por noche</p>
            {Object.keys(prices).length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {Object.entries(prices).sort(([a], [b]) => Number(a) - Number(b)).map(([ppl, price]) => (
                  <div key={ppl} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                    <span className="text-slate-500 dark:text-slate-400 text-sm">{Number(ppl) === 1 ? "1 persona" : `${ppl} personas`}</span>
                    <span className={`font-bold text-base sm:text-lg ${accent.text}`}>${Number(price).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-baseline gap-1 py-1">
                <span className={`text-2xl sm:text-3xl font-black ${accent.text}`}>${dept.basePrice.toLocaleString()}</span>
                <span className="text-slate-400 text-sm">/ noche</span>
              </div>
            )}
          </div>
        </div>

        {/* Amenities */}
        {amenities.length > 0 ? (
          <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-xs transition-colors flex flex-col">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Servicios incluidos</p>
            <div className="flex flex-wrap gap-2 content-start">
              {amenities.map(id => {
                const a = AMENITY_MAP[id];
                if (!a) return null;
                return (
                  <span key={id} className="inline-flex items-center gap-1.5 text-xs bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-xl font-medium">
                    <span className={accent.text}>{a.icon}</span> {a.label}
                  </span>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      {/* Location Map */}
      {(dept.address || dept.googleMapsLink) && (
        <div className="mb-6">
          <DepartmentLocationMap
            address={dept.address}
            googleMapsLink={dept.googleMapsLink}
            deptName={dept.name}
            mode="compact"
          />
        </div>
      )}

      {/* CTA */}
      <button
        onClick={() => onAvailability(dept)}
        className={`inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-white ${accent.btn} transition-all shadow-md hover:shadow-lg hover:scale-[1.02] self-center lg:self-start text-sm cursor-pointer w-full sm:w-auto text-center`}
      >
        <CalendarDays className="w-5 h-5" />
        Ver Fechas de Disponibilidad
      </button>
    </div>
  );

  /* Photo panel (Desktop only — hidden on mobile to avoid duplication) */
  const photos = (
    <div
      className={`hidden lg:block min-h-[520px] lg:min-h-0 lg:self-stretch transition-all duration-700 ease-out delay-150 ${visible ? "opacity-100 translate-x-0" : flip ? "opacity-0 -translate-x-12" : "opacity-0 translate-x-12"}`}
    >
      <PhotoGallery images={images} onLightbox={(i) => onLightbox(images, i)} />
    </div>
  );

  return (
    <section ref={ref} id={`dept-${index}`} className={`scroll-mt-24 py-16 md:py-20 transition-colors duration-700 ease-in-out ${index % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50/80 dark:bg-slate-950"}`}>
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 lg:items-stretch">
          {flip ? <>{photos}{info}</> : <>{info}{photos}</>}
        </div>
      </div>
    </section>
  );
}

/* ─── Main export ────────────────────────────────────────────────────────── */
export function DepartmentsGallery({
  departments,
  config = SITE_CONFIG_DEFAULTS,
}: {
  departments: SharedDepartment[];
  config?: SiteConfig;
}) {
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);
  const [availDept, setAvailDept] = useState<SharedDepartment | null>(null);

  const scrollToDept = (index: number) => {
    const el = document.getElementById(`dept-${index}`);
    if (el) {
      const rect = el.getBoundingClientRect();
      const targetY = rect.top + window.scrollY - 80;
      window.scrollTo({ top: targetY, behavior: "smooth" });
      if (typeof history !== "undefined" && history.pushState) {
        history.pushState(null, "", `#dept-${index}`);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-700 ease-in-out">

      {/* Hero — Corte recto limpio */}
      <div className="relative bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white overflow-hidden pt-16 border-b border-slate-800/80">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative max-w-4xl mx-auto px-4 py-20 sm:py-24 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 backdrop-blur-sm px-4 py-1.5 rounded-full text-sm font-medium text-white/80 mb-6">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            Alojamientos premium en {config.city}
          </div>
          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight mb-5 bg-clip-text text-transparent bg-gradient-to-r from-white to-indigo-200">
            Nuestros Departamentos
          </h1>
          <p className="text-lg sm:text-xl text-white/60 max-w-xl mx-auto leading-relaxed mb-8">
            Descubrí cada espacio. Fotos reales, precios claros y todas las comodidades que necesitás.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {departments.map((d, i) => (
              <button
                key={d.id}
                onClick={() => scrollToDept(i)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-sm font-semibold text-white/80 hover:text-white transition-all backdrop-blur-sm cursor-pointer active:scale-95"
              >
                {d.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Dept sections */}
      {departments.map((dept, i) => (
        <DeptSection
          key={dept.id}
          dept={dept}
          index={i}
          onLightbox={(imgs, idx) => setLightbox({ images: imgs, index: idx })}
          onAvailability={setAvailDept}
        />
      ))}

      {/* Contact CTA */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 py-16 text-white text-center">
        <h2 className="text-3xl font-extrabold mb-2">¿Listo para reservar?</h2>
        <p className="text-indigo-200 mb-8 max-w-md mx-auto">Consultá disponibilidad y fechas directamente en nuestro buscador principal.</p>
        <Link
          href="/#search-bar"
          className="inline-flex items-center gap-2 bg-white text-indigo-700 font-bold px-8 py-4 rounded-2xl hover:bg-indigo-50 transition-all hover:scale-105 shadow-xl text-sm cursor-pointer"
        >
          <CalendarDays className="w-4 h-4" /> Consultar disponibilidad
        </Link>
      </div>

      {/* Lightbox */}
      {lightbox && <Lightbox images={lightbox.images} index={lightbox.index} onClose={() => setLightbox(null)} />}

      {/* Availability Modal */}
      {availDept && <AvailabilityModal dept={availDept} onClose={() => setAvailDept(null)} />}

      <PublicFooter config={config} />
    </div>
  );
}
