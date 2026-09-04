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
}

export function AirbnbBookingReminderModal({
  isOpen,
  onClose,
  title = '¡Recordá cerrar las fechas!',
  items = [],
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
      <DialogContent className="max-w-md w-[95vw] p-0 overflow-hidden border border-amber-200/80 dark:border-amber-900/60 shadow-2xl rounded-2xl">
        {/* Header with warning styling */}
        <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent p-5 pb-3 border-b border-amber-200/50 dark:border-amber-900/40">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-500/20 dark:bg-amber-500/25 flex items-center justify-center flex-shrink-0 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300/60 dark:border-amber-800 mb-1">
                Reserva Directa
              </div>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {title}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Al ser una reserva directa, debés bloquear manualmente las fechas en los canales externos para evitar sobreventas (overbooking).
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
            <div
              onClick={() => setAirbnbChecked(prev => !prev)}
              className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                airbnbChecked
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                  : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#FF385C]/10 flex items-center justify-center flex-shrink-0 text-[#FF385C] font-black text-sm">
                  Ab
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

            {/* Booking Card */}
            <div
              onClick={() => setBookingChecked(prev => !prev)}
              className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                bookingChecked
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                  : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#003580]/10 flex items-center justify-center flex-shrink-0 text-[#003580] dark:text-[#3884ff] font-black text-sm">
                  Bk
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
          </div>
        </div>

        <DialogFooter className="p-4 bg-slate-50/80 dark:bg-slate-900/50 border-t border-slate-200/80 dark:border-slate-800 flex justify-end">
          <Button
            type="button"
            onClick={() => handleOpenChange(false)}
            className="w-full sm:w-auto font-semibold shadow-sm"
          >
            Entendido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
