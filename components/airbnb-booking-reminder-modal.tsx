'use client';

import React, { useState } from 'react';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Calendar, Building2, Check, ExternalLink } from 'lucide-react';

export interface ReminderItem {
  departmentName?: string;
  checkIn: string | Date;
  checkOut: string | Date;
}

interface AirbnbBookingReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  items?: ReminderItem[];
  source?: 'DIRECT' | 'BOOKING' | 'AIRBNB' | string;
}

export function AirbnbBookingReminderModal({
  isOpen,
  onClose,
  title,
  items = [],
  source = 'DIRECT',
}: AirbnbBookingReminderModalProps) {
  const [airbnbChecked, setAirbnbChecked] = useState(false);
  const [bookingChecked, setBookingChecked] = useState(false);

  // Reset state when closed
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setAirbnbChecked(false);
      setBookingChecked(false);
      onClose();
    }
  };

  const normalizedSource = (source || 'DIRECT').toString().trim().toUpperCase();
  const isBooking = normalizedSource.includes('BOOKING');
  const isAirbnb = normalizedSource.includes('AIRBNB');
  const isDirect = !isBooking && !isAirbnb;

  // Si vino de Booking -> sólo avisar bloquear en Airbnb
  // Si vino de Airbnb -> sólo avisar bloquear en Booking
  // Si es Directa -> avisar bloquear en ambos
  const showAirbnb = isDirect || isBooking;
  const showBooking = isDirect || isAirbnb;

  const badgeText = isBooking
    ? 'Reserva de Booking.com'
    : isAirbnb
      ? 'Reserva de Airbnb'
      : 'Reserva Directa';

  const badgeClass = isBooking
    ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border-blue-300/60 dark:border-blue-800'
    : isAirbnb
      ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border-rose-300/60 dark:border-rose-800'
      : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300/60 dark:border-amber-800';

  const headerGradient = isBooking
    ? 'from-blue-500/15 via-sky-500/10 to-transparent border-blue-200/50 dark:border-blue-900/40'
    : isAirbnb
      ? 'from-rose-500/15 via-orange-500/10 to-transparent border-rose-200/50 dark:border-rose-900/40'
      : 'from-amber-500/15 via-orange-500/10 to-transparent border-amber-200/50 dark:border-amber-900/40';

  const headerIconBg = isBooking
    ? 'bg-blue-500/20 dark:bg-blue-500/25 text-blue-600 dark:text-blue-400'
    : isAirbnb
      ? 'bg-rose-500/20 dark:bg-rose-500/25 text-rose-600 dark:text-rose-400'
      : 'bg-amber-500/20 dark:bg-amber-500/25 text-amber-600 dark:text-amber-400';

  const dialogBorder = isBooking
    ? 'border-blue-200/80 dark:border-blue-900/60'
    : isAirbnb
      ? 'border-rose-200/80 dark:border-rose-900/60'
      : 'border-amber-200/80 dark:border-amber-900/60';

  const defaultTitle = isBooking
    ? '¡Recordá bloquear en Airbnb!'
    : isAirbnb
      ? '¡Recordá bloquear en Booking.com!'
      : '¡Recordá cerrar las fechas!';

  const modalTitle = title || defaultTitle;

  const modalDescription = isBooking
    ? 'Al ingresar una reserva por Booking.com, debés bloquear manualmente las fechas en Airbnb para evitar sobreventas (overbooking).'
    : isAirbnb
      ? 'Al ingresar una reserva por Airbnb, debés bloquear manualmente las fechas en Booking.com para evitar sobreventas (overbooking).'
      : 'Al ser una reserva directa, debés bloquear manualmente las fechas en los canales externos para evitar sobreventas (overbooking).';

  const formatDateRange = (checkIn: string | Date, checkOut: string | Date) => {
    try {
      const start = new Date(checkIn);
      const end = new Date(checkOut);
      const nights = Math.max(1, differenceInDays(end, start));
      const formattedStart = format(start, "d 'de' MMM, yyyy", { locale: es });
      const formattedEnd = format(end, "d 'de' MMM, yyyy", { locale: es });
      return {
        text: `${formattedStart} al ${formattedEnd}`,
        nights: `${nights} ${nights === 1 ? 'noche' : 'noches'}`,
      };
    } catch {
      return {
        text: `${String(checkIn)} al ${String(checkOut)}`,
        nights: '',
      };
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className={`max-w-md w-[95vw] p-0 overflow-hidden border ${dialogBorder} shadow-2xl rounded-2xl`}>
        {/* Header with channel-specific styling */}
        <div className={`bg-gradient-to-r ${headerGradient} p-5 pb-3 border-b`}>
          <div className="flex items-start gap-3.5">
            <div className={`w-11 h-11 rounded-xl ${headerIconBg} flex items-center justify-center flex-shrink-0`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${badgeClass} border mb-1`}>
                {badgeText}
              </div>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {modalTitle}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                {modalDescription}
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Reservation Details summary */}
          {items.length > 0 && (
            <div className="rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 p-3 space-y-2">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Fechas a bloquear:
              </p>
              <div className="space-y-2">
                {items.map((item, idx) => {
                  const dateInfo = formatDateRange(item.checkIn, item.checkOut);
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs sm:text-sm bg-white dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800/80"
                    >
                      <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
                        <Building2 className="w-4 h-4 text-sky-500 flex-shrink-0" />
                        <span>{item.departmentName || 'Departamento'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-right text-slate-600 dark:text-slate-300">
                        <Calendar className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                        <div>
                          <span className="font-medium">{dateInfo.text}</span>
                          {dateInfo.nights && (
                            <span className="ml-1.5 text-xs text-slate-400 dark:text-slate-500 font-normal">
                              ({dateInfo.nights})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Cards for Airbnb and Booking */}
          <div className="space-y-2.5">
            {/* Airbnb Card */}
            {showAirbnb && (
              <div
                onClick={() => setAirbnbChecked(prev => !prev)}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                  airbnbChecked
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                    : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#FF385C]/10 flex items-center justify-center flex-shrink-0 p-1">
                    <img src="/icons/airbnb.png" alt="Airbnb" className="w-5 h-5 object-contain" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-100">Airbnb</span>
                      {airbnbChecked && (
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.2 rounded-full">
                          Listo
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Bloquear las fechas en el calendario de Airbnb
                    </p>
                  </div>
                </div>
                <div
                  className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all ${
                    airbnbChecked
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900'
                  }`}
                >
                  {airbnbChecked && <Check className="w-4 h-4" />}
                </div>
              </div>
            )}

            {/* Booking Card */}
            {showBooking && (
              <div
                onClick={() => setBookingChecked(prev => !prev)}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                  bookingChecked
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                    : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#003580]/10 flex items-center justify-center flex-shrink-0 p-1">
                    <img src="/icons/booking.png" alt="Booking" className="w-5 h-5 object-contain" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-100">Booking.com</span>
                      {bookingChecked && (
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.2 rounded-full">
                          Listo
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Cerrar cupo / fechas en la extranet de Booking
                    </p>
                  </div>
                </div>
                <div
                  className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all ${
                    bookingChecked
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900'
                  }`}
                >
                  {bookingChecked && <Check className="w-4 h-4" />}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="p-4 bg-slate-50/80 dark:bg-slate-900/50 border-t border-slate-200/80 dark:border-slate-800 flex justify-end">
          <Button
            type="button"
            onClick={() => handleOpenChange(false)}
            className="w-full sm:w-auto font-semibold shadow-sm cursor-pointer"
          >
            Entendido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
