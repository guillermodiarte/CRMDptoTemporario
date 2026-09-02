"use client";

import { useState } from "react";
import { Users, Bed, ChevronLeft, ChevronRight, CheckCircle2, X, Wifi, Tv, Wind, Flame, Car, Droplets, Grid2X2, Sparkles, CalendarDays } from "lucide-react";
import Link from "next/link";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, isBefore, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { DepartmentLocationMap } from "@/components/department-location-map";

export type SharedDepartment = {
  id: string;
  name: string;
  description: string | null;
  basePrice: number;
  bedCount: number;
  maxPeople: number;
  images: string;
  color: string;
  prices?: string | null;
  amenities?: string | null;
  address?: string | null;
  googleMapsLink?: string | null;
  reservations?: { checkIn: Date; checkOut: Date }[];
};

export const AVAILABLE_AMENITIES = [
  { id: "wifi", icon: <Wifi className="w-5 h-5" />, label: "Internet WiFi" },
  { id: "tv", icon: <Tv className="w-5 h-5" />, label: "TV Cable / Smart TV" },
  { id: "washer", icon: <Sparkles className="w-5 h-5" />, label: "Lavarropas" },
  { id: "ac", icon: <Wind className="w-5 h-5" />, label: "Aire Acondicionado" },
  { id: "heating", icon: <Flame className="w-5 h-5" />, label: "Calefacción" },
  { id: "water", icon: <Droplets className="w-5 h-5" />, label: "Agua Caliente (Termotanque)" },
  { id: "parking", icon: <Car className="w-5 h-5" />, label: "Cochera Privada Cerrada" },
  { id: "linens", icon: <Bed className="w-5 h-5" />, label: "Ropa de cama y Toallas" },
];

// Sub-component for the image carousel
export function ImageCarousel({ images, name }: { images: string[], name: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (images.length === 0) {
    return <img src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80" alt={name} className="w-full h-full object-cover" loading="lazy" decoding="async" />;
  }

  const next = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prev = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="relative w-full h-full group">
      <img src={images[currentIndex]} alt={`${name} - foto ${currentIndex + 1}`} className="w-full h-full object-cover transition-opacity duration-300" loading="lazy" decoding="async" />
      
      {images.length > 1 && (
        <>
          <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-slate-900 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-sm z-10">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-slate-900 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-sm z-10">
            <ChevronRight className="w-5 h-5" />
          </button>
          
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {images.map((_, idx) => (
              <div key={idx} className={`w-2 h-2 rounded-full transition-all shadow-sm ${idx === currentIndex ? 'bg-white scale-110' : 'bg-white/50'}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Lightbox Component
export function Lightbox({ images, initialIndex, onClose }: { images: string[], initialIndex: number, onClose: () => void }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const next = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <button onClick={onClose} className="absolute top-6 right-6 text-white/70 hover:text-white p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-50">
        <X className="w-8 h-8" />
      </button>

      {images.length > 1 && (
        <button onClick={prev} className="absolute left-6 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-4 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-50">
          <ChevronLeft className="w-8 h-8" />
        </button>
      )}

      <div className="relative w-full max-w-7xl max-h-[90vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
        <img src={images[currentIndex]} alt="Fullscreen" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-200" />
      </div>

      {images.length > 1 && (
        <button onClick={next} className="absolute right-6 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-4 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-50">
          <ChevronRight className="w-8 h-8" />
        </button>
      )}
      
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/70 text-sm font-medium bg-black/50 px-4 py-2 rounded-full">
        {currentIndex + 1} / {images.length}
      </div>
    </div>
  );
}

// Modal Component
export function DepartmentModal({ dept, parsedImages, onClose }: { dept: SharedDepartment, parsedImages: string[], onClose: () => void }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [monthOffset, setMonthOffset] = useState(0);

  // Parse prices
  let pricesObj: Record<string, number> = {};
  try {
    if ((dept as any).prices) {
      pricesObj = JSON.parse((dept as any).prices);
    }
  } catch {}

  let activeAmenities: string[] = [];
  try {
    if (dept.amenities) {
      activeAmenities = JSON.parse(dept.amenities);
    }
  } catch {}

  const amenities = AVAILABLE_AMENITIES.filter(am => activeAmenities.includes(am.id));

  const today = startOfDay(new Date());
  const currentMonthStart = startOfMonth(addMonths(today, monthOffset));
  const currentMonthEnd = endOfMonth(currentMonthStart);
  const days = eachDayOfInterval({ start: currentMonthStart, end: currentMonthEnd });
  const startOffset = (getDay(currentMonthStart) + 6) % 7;

  const isDateFree = (date: Date) => {
    if (!dept.reservations) return true;
    const checkDate = startOfDay(date);
    for (const res of dept.reservations) {
      const resIn = startOfDay(new Date(res.checkIn));
      const resOut = startOfDay(new Date(res.checkOut));
      if (checkDate >= resIn && checkDate < resOut) {
        return false;
      }
    }
    return true;
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200" onClick={onClose}>
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 w-full max-w-5xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 transition-colors" onClick={e => e.stopPropagation()}>
          
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{dept.name}</h2>
              <div className="flex gap-4 mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5"><Users className="w-4 h-4" /> Hasta {dept.maxPeople} {dept.maxPeople === 1 ? 'persona' : 'personas'}</span>
                <span className="flex items-center gap-1.5"><Bed className="w-4 h-4" /> {dept.bedCount} camas</span>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-full bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-10">
            {/* Gallery Grid */}
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
                <Grid2X2 className="w-5 h-5 text-sky-500" /> Galería de Fotos
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {parsedImages.length > 0 ? parsedImages.slice(0, 5).map((img, idx) => (
                  <div 
                    key={idx} 
                    className={`relative rounded-xl overflow-hidden cursor-pointer group ${idx === 0 ? 'col-span-2 row-span-2 h-64 md:h-[400px]' : 'h-32 md:h-[194px]'} ${idx === 4 && parsedImages.length > 5 ? 'opacity-90' : ''}`}
                    onClick={() => setLightboxIndex(idx)}
                  >
                    <img src={img} alt={`${dept.name} ${idx + 1}`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" decoding="async" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    {idx === 4 && parsedImages.length > 5 && (
                       <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <span className="text-white font-bold text-lg">+{parsedImages.length - 5}</span>
                       </div>
                    )}
                  </div>
                )) : (
                  <div className="col-span-full h-64 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400">
                    No hay fotos disponibles
                  </div>
                )}
              </div>
              {parsedImages.length > 0 && (
                <button onClick={() => setLightboxIndex(0)} className="mt-4 text-sm font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 transition-colors underline underline-offset-4 cursor-pointer">
                  Ver todas las fotos ({parsedImages.length})
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              <div className="md:col-span-2 space-y-10">
                {/* Description */}
                <div>
                   <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-3">Sobre este departamento</h3>
                   <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{dept.description || "Un hermoso departamento completamente equipado para tu estadía. Perfecto para descansar y disfrutar con todas las comodidades."}</p>
                </div>

                {/* Amenities */}
                {amenities.length > 0 && (
                  <div>
                     <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Servicios Incluidos</h3>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-6">
                       {amenities.map((am, i) => (
                         <div key={i} className="flex items-center gap-3 text-slate-700 dark:text-slate-200">
                           <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400">{am.icon}</div>
                           <span className="font-medium text-sm">{am.label}</span>
                         </div>
                       ))}
                     </div>
                  </div>
                )}

                {/* Location Map */}
                {(dept.address || dept.googleMapsLink) && (
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Ubicación</h3>
                    <DepartmentLocationMap
                      address={dept.address}
                      googleMapsLink={dept.googleMapsLink}
                      deptName={dept.name}
                      mode="expanded"
                    />
                  </div>
                )}
              </div>

              {/* Pricing & Booking */}
              <div className="space-y-6">
                <div className="bg-slate-50 dark:bg-slate-800/80 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm transition-colors">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    Precios por Noche
                  </h3>
                  <div className="space-y-3">
                    {Object.keys(pricesObj).length > 0 ? (
                      Object.entries(pricesObj).sort(([a],[b]) => Number(a) - Number(b)).map(([people, price]) => (
                        <div key={people} className="flex items-center justify-between py-3 border-b border-slate-200/60 dark:border-slate-700 last:border-0 last:pb-0">
                           <span className="text-slate-600 dark:text-slate-400 font-medium">Para {people} {Number(people) === 1 ? 'persona' : 'personas'}</span>
                           <span className="font-bold text-slate-900 dark:text-white">${price}</span>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center justify-between py-2">
                        <span className="text-slate-600 dark:text-slate-400 font-medium">Precio Base</span>
                        <span className="font-bold text-slate-900 dark:text-white">${dept.basePrice}</span>
                      </div>
                    )}
                  </div>
                </div>

                <button onClick={(e) => { e.stopPropagation(); setShowCalendar(true); }} className="w-full py-4 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 text-sm shadow-xl shadow-slate-900/20 dark:shadow-sky-900/30 cursor-pointer">
                    <CalendarDays className="w-5 h-5" />
                    Ver Fechas de Disponibilidad
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Modal */}
      {showCalendar && (
        <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setShowCalendar(false)}>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 rounded-3xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200 transition-colors" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-sky-500" /> Disponibilidad
              </h3>
              <button onClick={() => setShowCalendar(false)} className="p-2 rounded-full bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-between mb-6 bg-slate-50 dark:bg-slate-800 p-2 rounded-2xl">
              <button onClick={(e) => { e.stopPropagation(); setMonthOffset(prev => prev - 1); }} className="p-2 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-xl shadow-sm border border-slate-100 dark:border-slate-600 transition-colors cursor-pointer">
                <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-200" />
              </button>
              <h4 className="font-bold text-slate-800 dark:text-white capitalize text-lg">{format(currentMonthStart, "MMMM yyyy", { locale: es })}</h4>
              <button onClick={(e) => { e.stopPropagation(); setMonthOffset(prev => prev + 1); }} className="p-2 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-xl shadow-sm border border-slate-100 dark:border-slate-600 transition-colors cursor-pointer">
                <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-200" />
              </button>
            </div>
            
            <div className="grid grid-cols-7 gap-2 text-center mb-3">
              {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
                <div key={d} className="text-sm font-bold text-slate-400">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2 text-center">
              {Array.from({ length: startOffset }).map((_, i) => (
                <div key={`empty-${i}`} className="h-10" />
              ))}
              {days.map((date, i) => {
                const isPast = isBefore(date, today);
                const isFree = isDateFree(date);
                let bgClass = "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-700 hover:border-slate-300";
                if (isPast) bgClass = "bg-slate-50 dark:bg-slate-800/40 text-slate-300 dark:text-slate-600 opacity-50";
                else if (!isFree) bgClass = "bg-red-50 dark:bg-red-500/15 text-red-400 line-through border-transparent";
                else bgClass = "bg-green-50 dark:bg-green-500/15 text-green-700 dark:text-green-400 font-medium border-green-200 dark:border-green-500/30 shadow-sm";

                return (
                  <div key={i} className={`h-10 flex items-center justify-center rounded-xl text-sm transition-colors ${bgClass}`}>
                    {format(date, 'd')}
                  </div>
                );
              })}
            </div>
            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex gap-6 font-medium justify-center">
              <div className="flex items-center gap-2"><div className="w-4 h-4 bg-green-50 dark:bg-green-500/20 border border-green-200 dark:border-green-500/40 rounded-full shadow-sm" /><span className="text-slate-600 dark:text-slate-400 text-sm">Libre</span></div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 bg-red-50 dark:bg-red-500/20 border border-red-200 dark:border-red-500/40 rounded-full" /><span className="text-slate-600 dark:text-slate-400 text-sm">Ocupado</span></div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox 
          images={parsedImages} 
          initialIndex={lightboxIndex} 
          onClose={() => setLightboxIndex(null)} 
        />
      )}
    </>
  );
}
