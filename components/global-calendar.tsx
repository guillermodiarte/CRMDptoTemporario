"use client";

import { useState, useEffect, useRef, useLayoutEffect, useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  differenceInDays,
  isSameDay,
  setDate,
  getDate,
  isBefore,
  startOfToday,
  addDays,
  startOfDay,
  isWeekend as isWeekendFn,
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, ShieldAlert, Home, Car } from "lucide-react"; // Removed Zoom icons
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Define a looser type for Department to accept the partial selection from page.tsx
interface CalendarDepartment {
  id: string;
  name: string;
  images: string; // JSON string
  address: string | null;
  bedCount: number;
  isActive: boolean;
  color: string;
  type?: string;
}

interface GlobalCalendarProps {
  departments: CalendarDepartment[];
  reservations: any[]; // Extended reservation type
}

// Helper component for Department Image with Icon Fallback
const DepartmentImage = ({ src, name, type }: { src: string, name: string, type?: string }) => {
  const [imgSrc, setImgSrc] = useState(src);
  const [error, setError] = useState(false);

  useEffect(() => {
    setImgSrc(src);
    setError(false);
  }, [src]);

  // If error or using default placeholder (which we want to replace with icon)
  if (error || !imgSrc || imgSrc === "/placeholder-house.png") {
    return (
      <div className="h-full aspect-[4/3] rounded-lg overflow-hidden bg-indigo-50 shrink-0 border border-indigo-100 flex items-center justify-center">
        {type === 'PARKING' ? (
          <Car className="w-8 h-8 text-indigo-500" />
        ) : (
          <Home className="w-8 h-8 text-indigo-500" />
        )}
      </div>
    );
  }

  return (
    <div className="h-full aspect-[4/3] rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
      <img
        src={imgSrc}
        alt={name}
        className="w-full h-full object-cover"
        onError={() => setError(true)}
      />
    </div>
  );
};

export function GlobalCalendar({ departments, reservations }: GlobalCalendarProps) {
  const viewportRef = useRef<HTMLDivElement>(null);

  // Display State
  const [currentDate, setCurrentDate] = useState(new Date());
  // Initialize based on current date: 1-15 -> first, 16+ -> second
  const [viewHalf, setViewHalf] = useState<'first' | 'second'>(() =>
    new Date().getDate() <= 15 ? 'first' : 'second'
  );
  // Mobile Chunk State (0-5 blocks of 5 days)
  const [mobileChunk, setMobileChunk] = useState(() => Math.floor((new Date().getDate() - 1) / 5));

  const [isDesktop, setIsDesktop] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useLayoutEffect(() => {
    const checkMedia = () => {
      setIsDesktop(window.matchMedia("(min-width: 768px)").matches);
    };
    checkMedia();
    window.addEventListener("resize", checkMedia);
    return () => window.removeEventListener("resize", checkMedia);
  }, []);

  // Calculate Range based on Half
  // Calculate Range based on Half or Mobile Chunk
  const intervalStart = useMemo(() => {
    const start = startOfMonth(currentDate);
    if (isDesktop) {
      return viewHalf === 'first' ? start : setDate(start, 16);
    } else {
      // Mobile 5-day chunks: 0:1-5, 1:6-10, 2:11-15, 3:16-20, 4:21-25, 5:26-End
      return addDays(start, mobileChunk * 5);
    }
  }, [currentDate, viewHalf, isDesktop, mobileChunk]);

  const intervalEnd = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);

    if (isDesktop) {
      return viewHalf === 'first' ? setDate(start, 15) : end;
    } else {
      // Mobile: End of 5-day chunk (start + 4 days, but max endOfMonth)
      const calculatedEnd = addDays(intervalStart, 4);
      return isBefore(calculatedEnd, end) ? calculatedEnd : end;
    }
  }, [currentDate, viewHalf, isDesktop, intervalStart, mobileChunk]);

  const days = useMemo(() => eachDayOfInterval({ start: intervalStart, end: intervalEnd }), [intervalStart, intervalEnd]);

  const deptWidthPx = isDesktop ? 280 : 120;
  const rowHeight = 88; // Height for sidebar image

  const handlePrevMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
    setViewHalf('first');
    setMobileChunk(0);
  };
  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
    setViewHalf('first');
    setMobileChunk(0);
  };
  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setViewHalf(today.getDate() <= 15 ? 'first' : 'second');
    setMobileChunk(Math.floor((today.getDate() - 1) / 5));
  };

  // Mobile Pagination
  const handlePrevChunk = () => {
    if (mobileChunk > 0) setMobileChunk(c => c - 1);
    else {
      // Go to prev month, last chunk
      const prevMonth = subMonths(currentDate, 1);
      const daysInPrev = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0).getDate();
      const lastChunk = Math.floor((daysInPrev - 1) / 5);
      setCurrentDate(prevMonth);
      setMobileChunk(lastChunk);
    }
  };

  const handleNextChunk = () => {
    // Check if current chunk is the last one (if intervalEnd is end of month)
    const endOfCurrentMonth = endOfMonth(currentDate);
    if (isSameDay(intervalEnd, endOfCurrentMonth)) {
      // Go to next month
      setCurrentDate(addMonths(currentDate, 1));
      setMobileChunk(0);
    } else {
      setMobileChunk(c => c + 1);
    }
  };

  const dayWidthPct = 100 / days.length;

  const getReservationStyle = (res: any) => {
    // Normalize all dates to start of day to avoid time issues
    const resStart = startOfDay(new Date(res.checkIn));
    const resEnd = startOfDay(new Date(res.checkOut));
    const intervalStart = startOfDay(days[0]);
    const intervalEnd = startOfDay(days[days.length - 1]);

    // Filter if completely out of view
    // If starts after the last day's start, it's not in view (e.g. 16th start for 1-15 view)
    if (resEnd <= intervalStart || resStart > intervalEnd) return { display: 'none' };

    // Clamp to current VIEW interval
    const effectiveStart = resStart < intervalStart ? intervalStart : resStart;
    // Allow ending on the valid next day boundary to calculate full duration for the last day
    const validEndBoundary = addDays(intervalEnd, 1);
    const effectiveEnd = resEnd > validEndBoundary ? validEndBoundary : resEnd;

    // If checkIn=1st, checkOut=2nd, diff=1. Width=1 slot. Correct.
    const duration = differenceInDays(effectiveEnd, effectiveStart);

    // Hide if duration in this view is 0 (e.g. ends exactly on start, handled by filter above mostly but safe check)
    if (duration <= 0) return { display: 'none' };

    const renderWidth = duration;

    const startOffset = differenceInDays(effectiveStart, intervalStart);

    return {
      left: `${(startOffset / days.length) * 100}%`,
      width: `${(renderWidth / days.length) * 100}%`,
    };
  };

  if (!isMounted) return <div className="h-full bg-slate-50 border rounded-xl animate-pulse" />;

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden select-none font-sans">
      {/* Controls Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-white z-20 shrink-0">
        <div className="flex items-center gap-4">
          {/* Navigation */}
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border">
            <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="h-8 w-8 hover:bg-white hover:shadow-sm">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="px-3 font-semibold text-sm capitalize min-w-[140px] text-center select-none">
              {format(currentDate, "MMMM yyyy", { locale: es })}
            </div>
            <Button variant="ghost" size="icon" onClick={handleNextMonth} className="h-8 w-8 hover:bg-white hover:shadow-sm">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Half Selector (Desktop) */}
          {isDesktop ? (
            <div className="flex bg-slate-100 p-0.5 rounded-lg border">
              <button
                onClick={() => setViewHalf('first')}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                  viewHalf === 'first' ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"
                )}
              >
                1ra Quincena
              </button>
              <button
                onClick={() => setViewHalf('second')}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                  viewHalf === 'second' ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"
                )}
              >
                2da Quincena
              </button>
            </div>
          ) : (
            /* Mobile 5-Day Navigation */
            <div className="flex bg-slate-100 p-0.5 rounded-lg border">
              <button onClick={handlePrevChunk} className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="px-2 py-1.5 text-xs font-medium text-slate-800 border-x border-slate-200">
                {getDate(intervalStart)}-{getDate(intervalEnd)}
              </div>
              <button onClick={handleNextChunk} className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          <Button variant="outline" size="sm" onClick={handleToday}>Hoy</Button>
        </div>

        {/* Legend (Restored for context since Zoom is gone) */}
        <div className="hidden lg:flex items-center gap-4 text-xs text-slate-500 font-medium">
          <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#008489]"></span>Confirmada</div>
          <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#FFB400]"></span>Parcial</div>
          <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#FF5A5F]"></span>Pendiente</div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div ref={viewportRef} className="flex-1 w-full overflow-hidden bg-white relative flex flex-col">
        {/* Header Row */}
        <div className="flex border-b h-10 shrink-0 shadow-sm z-40 bg-white">
          {/* Corner */}
          <div className="shrink-0 bg-white border-r z-50 shadow-[4px_0_12px_-4px_rgba(0,0,0,0.05)]" style={{ width: deptWidthPx }}></div>

          {/* Days Header */}
          <div className="flex-1 flex overflow-hidden">
            {days.map(day => {
              const isWeekend = isWeekendFn(day);
              const isToday = isSameDay(day, new Date());
              return (
                <div key={day.toISOString()}
                  className={cn(
                    "flex flex-col items-center justify-center border-r border-slate-100 text-xs overflow-hidden",
                    isToday ? "bg-blue-50 text-blue-600 font-bold" : (isWeekend ? "bg-slate-50 text-slate-500" : "text-slate-600")
                  )}
                  style={{ width: `${dayWidthPct}%` }}
                >
                  <span className="text-[10px] uppercase opacity-70">{format(day, "EEE", { locale: es }).slice(0, 1)}</span>
                  <span>{format(day, "d")}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Content Rows Scrollable Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="min-w-full flex flex-col relative">
            {/* Background Grid Lines (Absolute Overlay) */}
            <div className="absolute inset-0 flex pointer-events-none pl-[var(--dept-width)]" style={{ paddingLeft: deptWidthPx }}>
              {days.map((day) => {
                const today = startOfToday();
                const isToday = isSameDay(day, today);
                const isPastDay = isBefore(day, today);

                return (
                  <div key={`bg-${day.toISOString()}`}
                    className={cn(
                      "border-r border-slate-100 h-full relative",
                      isPastDay ? "bg-slate-100/60" : (isWeekendFn(day) ? "bg-slate-50/30" : ""),
                      isToday ? "bg-blue-50/10" : ""
                    )}
                    style={{ width: `${dayWidthPct}%` }}
                  >
                    {/* Current Day Indicator Line */}
                    {isToday && (
                      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500 z-10 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                    )}
                  </div>
                )
              })}
            </div>

            {departments.map(dept => {
              // Image Logic
              let imageUrl = "/placeholder-house.png";
              try {
                const images = JSON.parse(dept.images);
                if (Array.isArray(images) && images.length > 0) imageUrl = images[0];
              } catch (e) { }

              const deptReservations = reservations.filter(
                (r) => r.departmentId === dept.id &&
                  (new Date(r.checkIn) <= intervalEnd && new Date(r.checkOut) >= intervalStart) &&
                  r.paymentStatus !== 'CANCELLED'
              );

              if (!dept.isActive && deptReservations.length === 0) return null;

              return (
                <div key={dept.id} className="flex group relative border-b hover:bg-slate-50/40 transition-colors isolate" style={{ height: rowHeight }}>
                  {/* Sticky Sidebar */}
                  <div className="sticky left-0 z-30 bg-white border-r flex p-3 gap-3 shadow-[4px_0_12px_-4px_rgba(0,0,0,0.05)] transition-colors group-hover:bg-slate-50/40" style={{ width: deptWidthPx, minWidth: deptWidthPx }}>
                    {isDesktop && (
                      <DepartmentImage src={imageUrl} name={dept.name} type={dept.type} />
                    )}
                    <div className="flex flex-col justify-center min-w-0 flex-1">
                      <div className="font-bold text-sm text-slate-800 truncate leading-tight">{dept.name}</div>
                      <div className="text-xs text-slate-500 truncate mt-0.5">{dept.address || "Sin dirección"}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <div className={cn("w-2 h-2 rounded-full", dept.isActive ? "bg-emerald-400" : "bg-rose-400")} />
                        <span className="text-[10px] text-slate-400 font-medium">{dept.bedCount} huéspedes</span>
                      </div>
                    </div>
                  </div>

                  {/* Reservations Lane */}
                  <div className="relative flex-1 h-full overflow-hidden">
                    {deptReservations.map(res => {
                      const style = getReservationStyle(res);
                      if (style.display === 'none') return null;

                      let bgClass = "bg-slate-800 text-white";
                      const isBlacklisted = (res as any).isBlacklisted;

                      if (res.status === 'NO_SHOW') bgClass = "bg-slate-100 text-slate-400 border border-dashed border-slate-300";
                      else if (isBlacklisted) bgClass = "bg-[#8B0000] text-white shadow-sm ring-1 ring-[#5c0000]"; // Dark Red
                      else {
                        const status = res.paymentStatus;
                        if (status === 'PAID') bgClass = "bg-[#008489] text-white shadow-sm ring-1 ring-[#008489]";
                        else if (status === 'PARTIAL') bgClass = "bg-[#FFB400] text-white shadow-sm ring-1 ring-[#FFB400]";
                        else bgClass = "bg-[#FF5A5F] text-white shadow-sm ring-1 ring-[#FF5A5F]";
                      }
                      const isPast = isBefore(new Date(res.checkOut), startOfToday()) || isSameDay(new Date(res.checkOut), startOfToday());

                      const statusTranslations: Record<string, string> = {
                        "CONFIRMED": isPast ? "Finalizado" : "Confirmado",
                        "PAID": isPast ? "Finalizado" : "Confirmado",
                        "PENDING": "Pendiente",
                        "PARTIAL": "Parcial",
                        "CANCELLED": "Cancelada",
                        "NO_SHOW": "No Presentado"
                      };

                      const isNoShow = res.status === 'NO_SHOW';
                      const isPaid = res.paymentStatus === 'PAID';

                      let displayAmountLabel = "Total a Cobrar:";
                      if (isNoShow) displayAmountLabel = "Seña Cobrada:";
                      else if (isPaid) displayAmountLabel = "Total Cobrado:";

                      const displayAmount = isNoShow ? res.depositAmount : res.totalAmount;

                      // Helper for display status
                      const getDisplayStatus = () => {
                        if (res.status === 'NO_SHOW') return "No Presentado";
                        if (res.status === 'CANCELLED') return "Cancelada";

                        // Payment Status Logic
                        if (res.paymentStatus === 'PAID') return isPast ? "Finalizado" : "Confirmado";
                        if (res.paymentStatus === 'PARTIAL') return "Parcial";
                        return "Pendiente"; // Default for PENDING
                      };

                      return (
                        <TooltipProvider key={res.id}>
                          <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild>
                              <div
                                className={cn(
                                  "absolute top-1/2 -translate-y-1/2 h-10 rounded-full px-3 flex items-center cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md z-10 text-xs font-medium overflow-hidden whitespace-nowrap",
                                  bgClass
                                )}
                                style={style}
                              >
                                {res.status === 'NO_SHOW' && <span className="line-through decoration-slate-400 mr-2 opacity-70">Ausente</span>}
                                {isBlacklisted && <ShieldAlert className="w-3 h-3 mr-1.5 shrink-0 inline-block" />}
                                <span className="truncate drop-shadow-sm">{res.guestName}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="bg-slate-900 text-white border-0 shadow-xl p-0 overflow-hidden rounded-lg">
                              <div className="p-3 w-56">
                                <div className="font-bold text-sm">{res.guestName}</div>
                                <div className="text-xs text-slate-400 mb-2">{format(new Date(res.checkIn), "dd MMM")} - {format(new Date(res.checkOut), "dd MMM")}</div>
                                <div className="space-y-1 text-xs">
                                  <div className="flex justify-between"><span>{dept.type === 'PARKING' ? 'Cochera:' : 'Depto:'}</span> <span className="font-medium text-slate-200">{dept.name}</span></div>
                                  <div className="flex justify-between">
                                    <span>Estado:</span>
                                    <span className="font-medium text-slate-200">
                                      {getDisplayStatus()}
                                    </span>
                                  </div>
                                  <div className="flex justify-between pt-2 mt-2 border-t border-slate-700">
                                    <span>{displayAmountLabel}</span>
                                    <span className="font-bold text-emerald-400">
                                      {res.currency === 'USD' ? 'USD ' : '$'}
                                      {displayAmount?.toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
