"use client";

import { useState } from "react";
import { Department } from "@prisma/client";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  differenceInDays
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
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

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const getReservationStyle = (res: any) => {
    const resStart = new Date(res.checkIn);
    const resEnd = new Date(res.checkOut);

    // Clamp start/end to view window
    const effectiveStart = resStart < monthStart ? monthStart : resStart;
    const effectiveEnd = resEnd > monthEnd ? monthEnd : resEnd;

    const diff = differenceInDays(effectiveEnd, effectiveStart) + 1; // +1 to include start day
    const startOffset = differenceInDays(effectiveStart, monthStart);

    return {
      left: `${startOffset * 100}px`,
      width: `${diff * 100}px`,
    };
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header controls */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={handlePrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold w-40 text-center capitalize">
            {format(currentDate, "MMMM yyyy", { locale: es })}
          </h3>
          <Button variant="outline" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-1 text-sm"><div className="w-3 h-3 bg-green-500 rounded-sm"></div>Pagado</div>
          <div className="flex items-center gap-1 text-sm"><div className="w-3 h-3 bg-yellow-500 rounded-sm"></div>Parcial</div>
          <div className="flex items-center gap-1 text-sm"><div className="w-3 h-3 bg-red-500 rounded-sm"></div>Pendiente</div>
        </div>
      </div>

      <ScrollArea className="flex-1 w-full whitespace-nowrap rounded-md border">
        <div className="w-max">
          {/* Calendar Header: Days */}
          <div className="flex border-b sticky top-0 bg-secondary/20 z-10">
            <div className="w-[200px] p-4 font-semibold sticky left-0 bg-background border-r z-20 shadow-sm">
              Propiedades
            </div>
            <div className="flex">
              {days.map((day) => (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "w-[100px] border-r p-2 text-center text-sm flex flex-col justify-center",
                    day.getDay() === 0 || day.getDay() === 6 ? "bg-muted/50" : ""
                  )}
                >
                  <span className="font-bold">{format(day, "d")}</span>
                  <span className="text-xs text-muted-foreground capitalize">{format(day, "EEE", { locale: es })}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Rows */}
          <div className="flex flex-col">
            {departments.map((dept) => {
              // Find reservations for this department in this window
              // Find reservations for this department in this window
              const deptReservations = reservations.filter(
                (r) =>
                  r.departmentId === dept.id &&
                  ((new Date(r.checkIn) <= monthEnd) && (new Date(r.checkOut) >= monthStart)) &&
                  r.status !== 'NO_SHOW' // Exclude No-Show reservations
              );

              // Hide inactive department if it has no reservations in this view
              if (!dept.isActive && deptReservations.length === 0) {
                return null;
              }

              return (
                <div key={dept.id} className="flex border-b h-[80px] group hover:bg-muted/5">
                  {/* Fixed Dept Column */}
                  <div className="w-[200px] p-4 flex flex-col justify-center border-r sticky left-0 bg-background z-10 group-hover:bg-muted/5 transition-colors">
                    <span className="font-medium truncate">{dept.name}</span>
                    <span className="text-xs text-muted-foreground">{dept.bedCount} camas</span>
                  </div>

                  {/* Timeline Grid */}
                  <div className="relative flex h-full">
                    {/* Background Grid Lines */}
                    {days.map((day) => (
                      <div
                        key={day.toISOString()}
                        className={cn(
                          "w-[100px] border-r h-full flex-shrink-0 cursor-pointer hover:bg-blue-50/50 transition-colors",
                          day.getDay() === 0 || day.getDay() === 6 ? "bg-muted/20" : ""
                        )}
                        onClick={() => console.log(`Clicked ${dept.name} on ${format(day, 'yyyy-MM-dd')}`)}
                      />
                    ))}

                    {/* Reservations Bars */}
                    {deptReservations.map((res) => {
                      const style = getReservationStyle(res);
                      const colorClass =
                        res.paymentStatus === 'PAID' ? 'bg-green-500 hover:bg-green-600' :
                          res.paymentStatus === 'PARTIAL' ? 'bg-yellow-500 hover:bg-yellow-600' :
                            'bg-red-500 hover:bg-red-600'; // UNPAID

                      return (
                        <TooltipProvider key={res.id}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={cn(
                                  "absolute top-4 h-12 rounded-md shadow-sm border border-white/20 text-white text-xs p-2 overflow-hidden cursor-pointer transition-all z-0",
                                  colorClass
                                )}
                                style={style}
                              >
                                <div className="font-bold truncate">{res.guestName}</div>
                                <div className="truncate opacity-90">{res.status}</div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-sm">
                                <p className="font-bold">{res.guestName}</p>
                                <p>Ingreso: {format(new Date(res.checkIn), 'd MMM', { locale: es })}</p>
                                <p>Egreso: {format(new Date(res.checkOut), 'd MMM', { locale: es })}</p>
                                <p>Pago: {res.paymentStatus}</p>
                                <p>Método: {res.source}</p>
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
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
