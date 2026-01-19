"use client";

import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { Department } from "@prisma/client";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  differenceInDays,
  isSameDay,
  isBefore,
  startOfToday,
  isWeekend as isWeekendFn
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
// import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"; // Replaced with native div for better ref control
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface GlobalCalendarProps {
  departments: Department[];
  reservations: any[]; // Extended reservation type
}

export function GlobalCalendar({ departments, reservations }: GlobalCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const viewportRef = useRef<HTMLDivElement>(null);

  // Responsive check
  // Using a simple state-based detection for simplicity in this component
  const [isDesktop, setIsDesktop] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useLayoutEffect(() => {
    const checkMedia = () => {
      setIsDesktop(window.matchMedia("(min-width: 768px)").matches);
    };

    checkMedia(); // Initial check
    window.addEventListener("resize", checkMedia);
    return () => window.removeEventListener("resize", checkMedia);
  }, []);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const today = new Date();

  // Dimensions based on screen size
  const dayWidthPx = isDesktop ? 100 : 50;
  const deptWidthPx = isDesktop ? 220 : 110;

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  // Auto-scroll to today
  useLayoutEffect(() => {
    if (viewportRef.current) {
      const todayEl = viewportRef.current.querySelector('[data-is-today="true"]');
      let targetLeft = 0;

      if (todayEl) {
        const rect = (todayEl as HTMLElement).getBoundingClientRect();
        const containerRect = viewportRef.current.getBoundingClientRect();
        const offsetLeft = (todayEl as HTMLElement).offsetLeft;

        targetLeft = offsetLeft - (containerRect.width / 2) + (rect.width / 2);
      }

      targetLeft = Math.max(0, targetLeft);
      viewportRef.current.scrollTo({ left: targetLeft, behavior: 'smooth' });
    }
  }, [currentDate, isDesktop]);

  const getReservationStyle = (res: any) => {
    const resStart = new Date(res.checkIn);
    const resEnd = new Date(res.checkOut);

    // Clamp start/end to view window
    const effectiveStart = resStart < monthStart ? monthStart : resStart;
    const effectiveEnd = resEnd > monthEnd ? monthEnd : resEnd;

    // If completely out of range, return hidden
    if (resEnd < monthStart || resStart > monthEnd) return { display: 'none' };

    // NIGHTS ONLY: exact difference.
    // 1 night (Jan 1 to Jan 2) = 1 day width.
    const diff = differenceInDays(effectiveEnd, effectiveStart);
    const startOffset = differenceInDays(effectiveStart, monthStart);

    return {
      left: `${startOffset * dayWidthPx}px`,
      width: `${Math.max(diff, 0.2) * dayWidthPx}px`, // Ensure at least a sliver
    };
  };

  if (!isMounted) return <div className="h-full bg-white border rounded-md shadow-sm animate-pulse" />;

  return (
    <div className="flex flex-col h-full bg-white border rounded-md shadow-sm overflow-hidden select-none">
      {/* Header controls */}
      <div className="flex flex-col md:flex-row items-center justify-between p-4 border-b bg-background z-30 relative shrink-0 gap-4">
        <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto justify-between md:justify-start">
          <Button variant="outline" size="icon" onClick={handlePrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-sm md:text-lg font-semibold w-32 md:w-48 text-center capitalize animate-in fade-in">
            {format(currentDate, "MMMM yyyy", { locale: es })}
          </h3>
          <Button variant="outline" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setCurrentDate(new Date())}>
            Hoy
          </Button>
        </div>
        <div className="flex flex-wrap gap-4 justify-center md:justify-end w-full md:w-auto">
          <div className="flex items-center gap-2 text-xs md:text-sm">
            <span className="w-3 h-3 bg-red-500 rounded-sm"></span> Pendiente
          </div>
          <div className="flex items-center gap-2 text-xs md:text-sm">
            <span className="w-3 h-3 bg-yellow-500 rounded-sm"></span> Parcial
          </div>
          <div className="flex items-center gap-2 text-xs md:text-sm">
            <span className="w-3 h-3 bg-green-500 rounded-sm"></span> Pagado
          </div>
        </div>
      </div>

      {/* Main Scrollable Area */}
      <div
        ref={viewportRef}
        className="flex-1 w-full overflow-auto relative bg-slate-50"
      >
        <div className="min-w-max flex flex-col">

          {/* Calendar Header with Sticky Columns */}
          <div className="flex border-b h-14 bg-slate-50 sticky top-0 z-40 shadow-sm">
            {/* Sticky Department Header */}
            <div
              className="sticky left-0 bg-slate-100 border-r z-50 flex items-center px-4 font-semibold shadow-[4px_0_12px_-4px_rgba(0,0,0,0.1)] text-slate-600 transition-all duration-300"
              style={{ width: deptWidthPx, minWidth: deptWidthPx }}
            >
              <div className="truncate">{isDesktop ? "Departamentos" : "Deptos"}</div>
            </div>

            {/* Days Header */}
            <div className="flex h-full">
              {days.map((day) => {
                const isToday = isSameDay(day, today);
                const isPast = isBefore(day, startOfToday());
                const isWeekend = isWeekendFn(day);

                return (
                  <div
                    key={day.toISOString()}
                    data-is-today={isToday}
                    className={cn(
                      "shrink-0 border-r border-slate-200 p-1 md:p-2 text-center flex flex-col justify-center transition-colors relative",
                      isPast ? "bg-slate-50/50 text-slate-400" : "bg-white text-slate-700",
                      isToday ? "bg-blue-50/50" : "",
                      isWeekend && !isPast ? "bg-slate-50/30" : ""
                    )}
                    style={{ width: dayWidthPx }}
                  >
                    {isToday && (
                      <div className="absolute inset-y-0 left-0 w-1 bg-blue-600 z-10" />
                    )}
                    <span
                      className={cn(
                        "font-bold leading-none",
                        isToday ? "text-blue-600" : "",
                        isDesktop ? "text-lg" : "text-sm"
                      )}
                    >
                      {format(day, "d")}
                    </span>
                    <span className={cn("uppercase font-medium tracking-wide opacity-70", isDesktop ? "text-[10px]" : "text-[8px]")}>
                      {format(day, "EEE", { locale: es })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Departments Rows */}
          <div className="flex flex-col relative">
            {departments.map((dept) => {
              // 1. Filter: Allow NO_SHOW now.
              let deptReservations = reservations.filter(
                (r) =>
                  r.departmentId === dept.id &&
                  // Ensure reservation overlaps with range
                  (new Date(r.checkIn) <= monthEnd && new Date(r.checkOut) >= monthStart)
              );

              // 2. Sort: render NO_SHOW first (bottom layer), then others by priority.
              deptReservations.sort((a, b) => {
                const score = (r: any) => {
                  if (r.status === 'NO_SHOW') return 0;
                  if (r.status === 'CANCELLED') return 1;
                  return 2; // Active
                };
                return score(a) - score(b);
              });

              if (!dept.isActive && deptReservations.length === 0) return null;

              return (
                <div key={dept.id} className="flex h-[80px] group isolate relative border-b hover:bg-slate-50/50 transition-colors">
                  {/* Fixed Dept Column */}
                  <div
                    className="sticky left-0 z-40 bg-white border-r flex flex-col justify-center px-4 shadow-[4px_0_12px_-4px_rgba(0,0,0,0.1)] transition-all duration-300"
                    style={{ width: deptWidthPx, minWidth: deptWidthPx }}
                  >
                    <span className={cn("font-semibold text-slate-800 truncate", isDesktop ? "text-sm" : "text-xs")}>{dept.name}</span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <span className="px-1.5 py-0.5 bg-slate-100 rounded border scale-90 origin-left">
                        {dept.bedCount}p
                      </span>
                    </div>
                  </div>

                  {/* Timeline Grid */}
                  <div className="relative flex h-full">
                    {/* Background Cells */}
                    {days.map((day) => {
                      const isPast = isBefore(day, startOfToday());
                      const isToday = isSameDay(day, new Date());
                      const isWeekend = isWeekendFn(day);

                      return (
                        <div
                          key={day.toISOString()}
                          className={cn(
                            "border-r h-full flex-shrink-0 relative",
                            isPast ? "bg-slate-50/40" : "bg-white",
                            isWeekend && !isPast ? "bg-slate-50/30" : "",
                            isToday ? "bg-blue-50/20 shadow-[inset_4px_0_0_0_#2563eb]" : ""
                          )}
                          style={{ width: dayWidthPx }}
                        >
                          {isToday && <div className="absolute inset-y-0 left-0 w-1 bg-blue-600/50"></div>}
                        </div>
                      );
                    })}

                    {/* Reservations */}
                    {deptReservations.map((res) => {
                      const style = getReservationStyle(res);
                      if (style.display === 'none') return null;

                      let bgClass = "bg-slate-500";

                      // Status Logic
                      if (res.status === 'NO_SHOW') {
                        bgClass = "bg-slate-400 opacity-80 border-dashed border-2 border-slate-600";
                      } else {
                        if (res.paymentStatus === 'PAID') bgClass = "bg-green-600 hover:bg-green-700 shadow-md";
                        else if (res.paymentStatus === 'PARTIAL') bgClass = "bg-yellow-500 hover:bg-yellow-600 shadow-md";
                        else if (res.paymentStatus === 'PENDING') bgClass = "bg-red-500 hover:bg-red-600 shadow-md";
                      }

                      // Blacklist OVERRIDE
                      if ((res as any).isBlacklisted) {
                        bgClass = "bg-rose-900 border-2 border-red-500 shadow-[0_0_10px_rgba(220,38,38,0.5)]";
                      }

                      // Status Translation Helper
                      const translateStatus = (s: string) => {
                        const map: Record<string, string> = {
                          "CONFIRMED": "Confirmada",
                          "TENTATIVE": "Tentativa",
                          "CANCELLED": "Cancelada",
                          "NO_SHOW": "No Asistió"
                        };
                        return map[s] || s;
                      };

                      return (
                        <TooltipProvider key={res.id}>
                          <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild>
                              <div
                                className={cn(
                                  "absolute top-1/2 -translate-y-1/2 h-12 rounded-md border border-white/10 text-white text-xs p-1 md:p-2 overflow-hidden cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg select-none flex flex-col justify-center",
                                  res.status === 'NO_SHOW' ? "z-10 grayscale-[0.5]" : "z-20",
                                  bgClass
                                )}
                                style={style}
                              >
                                {res.status === 'NO_SHOW' && (
                                  <div className="absolute inset-0 flex items-center justify-center opacity-10 font-black text-3xl -rotate-12 pointer-events-none select-none text-black">
                                    AUSENTE
                                  </div>
                                )}
                                <div className={cn("font-bold truncate leading-tight", isDesktop ? "text-xs" : "text-[10px]")}>
                                  {(res as any).isBlacklisted && "🚫 "}
                                  {res.guestName}
                                </div>
                                <div className={cn("truncate opacity-90 text-[10px] uppercase tracking-wider", isDesktop ? "block" : "hidden md:block")}>
                                  {res.status === 'NO_SHOW' ? 'No Asistió' : res.source}
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="bg-slate-900 border-slate-800 text-white p-3 z-50">
                              <div className="text-sm space-y-1">
                                <p className="font-bold text-base flex items-center gap-2">
                                  {res.guestName}
                                  {(res as any).isBlacklisted && <span className="text-red-500 text-xs px-1 border border-red-500 rounded">LISTA NEGRA</span>}
                                </p>
                                <hr className="border-slate-700 my-2" />
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-300">
                                  <span>Entrada:</span>
                                  <span className="text-white font-medium">{format(new Date(res.checkIn), "d MMM", { locale: es })}</span>
                                  <span>Salida:</span>
                                  <span className="text-white font-medium">{format(new Date(res.checkOut), "d MMM", { locale: es })}</span>
                                  <span>Estado:</span>
                                  <span className="text-white font-medium capitalize">{translateStatus(res.status)}</span>
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
