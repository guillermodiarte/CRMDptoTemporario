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
import { ChevronLeft, ChevronRight, ShieldAlert, Home, Car, Expand, Shrink } from "lucide-react";
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
  const [viewHalf, setViewHalf] = useState<'first' | 'middle' | 'second'>(() => {
    const d = new Date().getDate();
    if (d <= 6) return 'first';
    if (d <= 22) return 'middle';
    return 'second';
  });
  
  const [mobileDaysView, setMobileDaysView] = useState<5 | 10>(5);
  const [mobileChunk, setMobileChunk] = useState(() => Math.floor((new Date().getDate() - 1) / 5));

  const [isDesktop, setIsDesktop] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [isForceLandscape, setIsForceLandscape] = useState(false);

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

  // Calculate Range based on Half or Mobile Chunk
  const intervalStart = useMemo(() => {
    const start = startOfMonth(currentDate);
    if (isDesktop) {
      if (viewHalf === 'first') return start;
      if (viewHalf === 'middle') return setDate(start, 7);
      return setDate(start, 16);
    } else {
      // Mobile chunks
      return addDays(start, mobileChunk * mobileDaysView);
    }
  }, [currentDate, viewHalf, isDesktop, mobileChunk, mobileDaysView]);

  const intervalEnd = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);

    if (isDesktop) {
      if (viewHalf === 'first') return setDate(start, 15);
      if (viewHalf === 'middle') return setDate(start, 22);
      return end;
    } else {
      const maxC = Math.floor(29 / mobileDaysView);
      if (mobileChunk >= maxC) {
        return end;
      }
      const calculatedEnd = addDays(intervalStart, mobileDaysView - 1);
      return isBefore(calculatedEnd, end) ? calculatedEnd : end;
    }
  }, [currentDate, viewHalf, isDesktop, intervalStart, mobileChunk, mobileDaysView]);

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
    const maxC = Math.floor(29 / mobileDaysView);
    let newChunk = Math.floor((today.getDate() - 1) / mobileDaysView);
    if (newChunk > maxC) newChunk = maxC;
    setMobileChunk(newChunk);
  };

  const toggleMobileView = () => {
    setIsForceLandscape(prev => !prev);
    setMobileDaysView(prev => {
      const nextView = prev === 5 ? 10 : 5;
      const currentDayOfMonth = getDate(intervalStart);
      const maxC = Math.floor(29 / nextView);
      let newChunk = Math.floor((currentDayOfMonth - 1) / nextView);
      if (newChunk > maxC) newChunk = maxC;
      setMobileChunk(newChunk);
      return nextView;
    });
  };

  // Mobile Pagination
  const handlePrevChunk = () => {
    if (mobileChunk > 0) setMobileChunk(c => c - 1);
    else {
      // Go to prev month, last chunk
      const prevMonth = subMonths(currentDate, 1);
      setCurrentDate(prevMonth);
      setMobileChunk(Math.floor(29 / mobileDaysView));
    }
  };

  const handleNextChunk = () => {
    const maxC = Math.floor(29 / mobileDaysView);
    if (mobileChunk >= maxC) {
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
    <div 
      className={cn(
        "flex flex-col bg-white overflow-hidden select-none font-sans",
        isForceLandscape 
          ? "fixed top-0 left-0 w-[100vh] h-[100vw] z-50 rounded-none shadow-2xl" 
          : "h-full border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs bg-white dark:bg-slate-900"
      )}
      style={isForceLandscape ? {
        transform: 'rotate(90deg) translateY(-100%)',
        transformOrigin: 'top left'
      } : {}}
    >
      {/* Controls Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-20 shrink-0">
        <div className="flex items-center gap-4">
          {/* Navigation */}
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
            <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="h-8 w-8 hover:bg-white dark:hover:bg-slate-700 hover:shadow-xs">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="px-3 font-semibold text-sm capitalize min-w-[140px] text-center select-none text-slate-800 dark:text-slate-100">
              {format(currentDate, "MMMM yyyy", { locale: es })}
            </div>
            <Button variant="ghost" size="icon" onClick={handleNextMonth} className="h-8 w-8 hover:bg-white dark:hover:bg-slate-700 hover:shadow-xs">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Half Selector (Desktop) */}
          {isDesktop ? (
            <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setViewHalf('first')}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer",
                  viewHalf === 'first' ? "bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                )}
              >
                1ra Quincena
              </button>
              <button
                onClick={() => setViewHalf('middle')}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer",
                  viewHalf === 'middle' ? "bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                )}
              >
                7 al 22
              </button>
              <button
                onClick={() => setViewHalf('second')}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer",
                  viewHalf === 'second' ? "bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                )}
              >
                2da Quincena
              </button>
            </div>
          ) : (
            /* Mobile 5-Day Navigation */
            <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <button onClick={handlePrevChunk} className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="px-2 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200 border-x border-slate-200 dark:border-slate-700">
                {getDate(intervalStart)}-{getDate(intervalEnd)}
              </div>
              <button onClick={handleNextChunk} className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={handleToday} className="cursor-pointer">Hoy</Button>
          </div>
        </div>

        {/* Legend */}
        <div className="hidden lg:flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 font-medium">
          <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#008489]"></span>Confirmada</div>
          <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#FFB400]"></span>Parcial</div>
          <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#FF5A5F]"></span>Pendiente</div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div ref={viewportRef} className="flex-1 w-full overflow-hidden bg-white dark:bg-slate-900 relative flex flex-col">
        {/* Floating Landscape Toggle Button (Mobile Only) */}
        {!isDesktop && (
          <Button
            variant="default"
            size="icon"
            onClick={toggleMobileView}
            className="absolute bottom-4 right-4 z-50 rounded-full shadow-lg h-14 w-14 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isForceLandscape ? <Shrink className="h-6 w-6" /> : <Expand className="h-6 w-6" />}
          </Button>
        )}
        
        {/* Header Row */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 h-10 shrink-0 shadow-xs z-40 bg-white dark:bg-slate-900">
          {/* Corner */}
          <div className="shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-50 shadow-[4px_0_12px_-4px_rgba(0,0,0,0.05)]" style={{ width: deptWidthPx }}></div>

          {/* Days Header */}
          <div className="flex-1 flex overflow-hidden">
            {days.map(day => {
              const isWeekend = isWeekendFn(day);
              const isToday = isSameDay(day, new Date());
              return (
                <div key={day.toISOString()}
                  className={cn(
                    "flex flex-col items-center justify-center border-r border-slate-100 dark:border-slate-800/80 text-xs overflow-hidden",
                    isToday 
                      ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold" 
                      : (isWeekend ? "bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400" : "text-slate-600 dark:text-slate-300")
                  )}
                  style={{ width: `${dayWidthPct}%` }}
                >
                  <span className="text-[10px] uppercase opacity-70">{format(day, "EEE", { locale: es }).slice(0, 1)}</span>
                  <span className="font-semibold">{format(day, "d")}</span>
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
                      "border-r border-slate-100 dark:border-slate-800/80 h-full relative",
                      isPastDay ? "bg-slate-100/60 dark:bg-slate-800/30" : (isWeekendFn(day) ? "bg-slate-50/30 dark:bg-slate-800/20" : ""),
                      isToday ? "bg-blue-50/10 dark:bg-blue-950/20" : ""
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
                <div key={dept.id} className="flex group relative border-b border-slate-200 dark:border-slate-800/80 hover:bg-slate-50/40 dark:hover:bg-slate-800/40 transition-colors isolate" style={{ height: rowHeight }}>
                  {/* Sticky Sidebar */}
                  <div className="sticky left-0 z-30 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex p-3 gap-3 shadow-[4px_0_12px_-4px_rgba(0,0,0,0.05)] transition-colors group-hover:bg-slate-50/40 dark:group-hover:bg-slate-800/40" style={{ width: deptWidthPx, minWidth: deptWidthPx }}>
                    {isDesktop && (
                      <DepartmentImage src={imageUrl} name={dept.name} type={dept.type} />
                    )}
                    <div className="flex flex-col justify-center min-w-0 flex-1">
                      <div className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate leading-tight">{dept.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{dept.address || "Sin dirección"}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <div className={cn("w-2 h-2 rounded-full", dept.isActive ? "bg-emerald-400" : "bg-rose-400")} />
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{dept.bedCount} huéspedes</span>
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
