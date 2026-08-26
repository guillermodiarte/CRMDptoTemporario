"use client";

import { useState, useMemo, useEffect } from "react";
import { format, addDays, isSameDay, isWithinInterval, startOfDay, endOfDay, differenceInDays, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, isBefore, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, MapPin, Users, Bed, ChevronRight, AlertTriangle, ChevronLeft, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

import { ImageCarousel, DepartmentModal, SharedDepartment } from "./shared-ui";
import { PublicFooter } from "./public-footer";

type Reservation = {
  id: string;
  checkIn: Date;
  checkOut: Date;
};

type Department = SharedDepartment & {
  reservations?: Reservation[];
};

type StaySegment = {
  deptId: string;
  deptName: string;
  checkIn: Date;
  checkOut: Date;
  nights: number;
  price: number;
};

type Combination = {
  segments: StaySegment[];
  totalChanges: number;
  totalPrice: number;
};

// Helper: Check if dept is free on a specific date (night)
const isDeptFreeOnDate = (dept: Department, date: Date) => {
  if (!dept.reservations) return true;
  const checkDate = startOfDay(date);

  for (const res of dept.reservations) {
    const resIn = startOfDay(new Date(res.checkIn));
    const resOut = startOfDay(new Date(res.checkOut));
    // Busy if checkDate is >= checkIn and < checkOut
    if (checkDate >= resIn && checkDate < resOut) {
      return false;
    }
  }
  return true;
};

const getPriceForPeople = (dept: any, count: number) => {
  try {
    if (dept.prices) {
      const p = JSON.parse(dept.prices);
      if (p[count.toString()]) return p[count.toString()];
    }
  } catch { }
  return dept.basePrice;
};

export function PublicLandingClient({ initialDepartments }: { initialDepartments: any[] }) {
  const [checkInDate, setCheckInDate] = useState<Date | undefined>(undefined);
  const [checkOutDate, setCheckOutDate] = useState<Date | undefined>(undefined);
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
  const [monthOffset, setMonthOffset] = useState(0);
  const [peopleCount, setPeopleCount] = useState<number | ''>('');
  const [selectedDept, setSelectedDept] = useState<{ dept: SharedDepartment, parsedImages: string[] } | null>(null);
  const [reservationData, setReservationData] = useState<{
    type: 'direct' | 'combination';
    dept?: Department;
    comb?: Combination;
    checkIn: Date;
    checkOut: Date;
    people: number;
  } | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCheckInDate(undefined);
        setCheckOutDate(undefined);
        setHoveredDate(null);
        setSelectedDept(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const departments = useMemo<Department[]>(() => {
    return initialDepartments.map(dep => ({
      ...dep,
      reservations: dep.reservations || []
    }));
  }, [initialDepartments]);

  const today = startOfDay(new Date());

  // Dual Calendar Generation
  const currentMonthStart = startOfMonth(addMonths(today, monthOffset));
  const nextMonthStart = startOfMonth(addMonths(today, monthOffset + 1));

  const generateMonthDays = (monthStart: Date) => {
    const monthEnd = endOfMonth(monthStart);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    // getDay() returns 0 for Sunday, 1 for Monday. We want Mon=0, Sun=6.
    const startOffset = (getDay(monthStart) + 6) % 7;
    return { days, startOffset };
  };

  const cal1 = generateMonthDays(currentMonthStart);
  const cal2 = generateMonthDays(nextMonthStart);

  // Free depts per day logic
  const getFreeDeptsCount = (date: Date) => {
    return departments.filter(d => isDeptFreeOnDate(d, date)).length;
  };

  const renderCalendarMonth = (monthStart: Date, { days, startOffset }: { days: Date[], startOffset: number }) => (
    <div className="flex-1 w-full min-w-[280px]">
      <h3 className="text-lg font-bold text-slate-800 mb-4 capitalize">
        {format(monthStart, "MMMM yyyy", { locale: es })}
      </h3>
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
          <div key={d} className="text-xs font-bold text-slate-400">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`empty-${i}`} className="h-14" />
        ))}
        {days.map((date, i) => {
          const isPast = isBefore(date, today);
          const freeCount = isPast ? 0 : getFreeDeptsCount(date);
          const isFull = freeCount === 0;

          let isSelected = false;
          let isInRange = false;

          if (checkInDate && isSameDay(date, checkInDate)) isSelected = true;
          if (checkOutDate && isSameDay(date, checkOutDate)) isSelected = true;

          if (checkInDate && checkOutDate) {
            if (date > checkInDate && date < checkOutDate) isInRange = true;
          } else if (checkInDate && hoveredDate && !checkOutDate) {
            const start = checkInDate < hoveredDate ? checkInDate : hoveredDate;
            const end = checkInDate > hoveredDate ? checkInDate : hoveredDate;
            if (date > start && date < end) isInRange = true;
          }

          let bgClass = "bg-white border-slate-200 text-slate-700 hover:border-sky-300 hover:shadow-sm";
          if (isSelected) {
            bgClass = "bg-slate-900 border-slate-900 text-white shadow-md transform scale-105 z-10 relative";
          } else if (isInRange) {
            bgClass = "bg-sky-200 border-sky-400 text-sky-900 font-medium";
          } else if (isPast) {
            bgClass = "bg-slate-50 border-transparent text-slate-300";
          } else if (isFull) {
            bgClass = "bg-red-50 border-red-100 text-red-500 opacity-60";
          }

          return (
            <div
              key={i}
              onMouseEnter={() => {
                if (!isPast && !isFull && checkInDate && !checkOutDate) {
                  setHoveredDate(date);
                }
              }}
              className={`flex flex-col items-center justify-center p-1 h-14 rounded-lg border cursor-pointer transition-all duration-200 ${bgClass}`}
              onClick={() => {
                if (isPast || isFull) return;

                // Deselect if clicking the same start date when only checkIn is set
                if (checkInDate && isSameDay(date, checkInDate) && !checkOutDate) {
                  setCheckInDate(undefined);
                  setHoveredDate(null);
                  return;
                }

                // Deselect all if clicking either selected date when both are set
                if (checkInDate && checkOutDate && (isSameDay(date, checkInDate) || isSameDay(date, checkOutDate))) {
                  setCheckInDate(undefined);
                  setCheckOutDate(undefined);
                  setHoveredDate(null);
                  return;
                }

                // Simple click-to-fill Check-in
                if (!checkInDate || (checkInDate && checkOutDate)) {
                  setCheckInDate(date);
                  setCheckOutDate(undefined);
                  setHoveredDate(null);
                } else if (checkInDate && date > checkInDate) {
                  setCheckOutDate(date);
                  setHoveredDate(null);
                } else {
                  setCheckInDate(date);
                  setHoveredDate(null);
                }
              }}
            >
              <span className={`text-sm font-bold ${isPast ? '' : isSelected ? 'text-white' : 'text-slate-800'}`}>
                {format(date, 'd')}
              </span>
              {!isPast && (
                <span className={`text-[9px] leading-tight font-medium mt-0.5 ${isSelected ? 'text-sky-200' : isFull ? 'text-red-600 font-bold' : 'text-sky-600'}`}>
                  {isFull ? 'Sin Disp.' : `${freeCount} libres`}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  // Search Logic
  const { directDepts, combinations } = useMemo(() => {
    let direct: Department[] = [];
    let combs: Combination[] = [];

    if (!checkInDate || !checkOutDate) {
      if (peopleCount !== '') {
        return { directDepts: departments.filter(d => d.maxPeople >= peopleCount), combinations: [] };
      }
      return { directDepts: departments, combinations: [] };
    }

    if (peopleCount === '') {
      return { directDepts: [], combinations: [] };
    }

    const inDate = startOfDay(checkInDate);
    const outDate = startOfDay(checkOutDate);
    const totalNights = differenceInDays(outDate, inDate);

    if (totalNights <= 0) return { directDepts: [], combinations: [] };

    // 1. Find direct availability
    direct = departments.filter(dept => {
      if (peopleCount !== '' && dept.maxPeople < peopleCount) return false;
      for (let i = 0; i < totalNights; i++) {
        if (!isDeptFreeOnDate(dept, addDays(inDate, i))) return false;
      }
      return true;
    });

    // 2. If no direct available, find combinations
    if (direct.length === 0) {
      const maxChanges = totalNights > 10 ? 4 : 2;

      const search = (nightIdx: number, segments: StaySegment[], changes: number) => {
        if (changes > maxChanges) return;
        if (nightIdx === totalNights) {
          const totalP = segments.reduce((acc, s) => acc + s.price, 0);
          combs.push({ segments, totalChanges: changes, totalPrice: totalP });
          return;
        }

        const currentNightDate = addDays(inDate, nightIdx);
        const availableDepts = departments.filter(d => isDeptFreeOnDate(d, currentNightDate) && d.maxPeople >= (peopleCount as number));
        const currentDeptId = segments.length > 0 ? segments[segments.length - 1].deptId : null;

        for (const nextDept of availableDepts) {
          const isChange = currentDeptId !== null && nextDept.id !== currentDeptId;
          const nextChanges = changes + (isChange ? 1 : 0);
          if (nextChanges > maxChanges) continue;

          const newSegments = segments.map(s => ({ ...s }));

          if (currentDeptId === null || isChange) {
            newSegments.push({
              deptId: nextDept.id,
              deptName: nextDept.name,
              checkIn: currentNightDate,
              checkOut: addDays(currentNightDate, 1),
              nights: 1,
              price: getPriceForPeople(nextDept, peopleCount as number)
            });
          } else {
            const lastSeg = newSegments[newSegments.length - 1];
            lastSeg.checkOut = addDays(currentNightDate, 1);
            lastSeg.nights += 1;
            lastSeg.price += getPriceForPeople(nextDept, peopleCount as number);
          }

          search(nightIdx + 1, newSegments, nextChanges);
        }
      };

      search(0, [], 0);

      if (combs.length > 0) {
        const minChanges = Math.min(...combs.map(c => c.totalChanges));
        let bestMinChangesCombs = combs.filter(c => c.totalChanges === minChanges);

        // Group combinations by the exact sequence of departments used
        const grouped = new Map<string, Combination[]>();
        for (const c of bestMinChangesCombs) {
          const key = c.segments.map(s => s.deptId).join('|');
          if (!grouped.has(key)) grouped.set(key, []);
          grouped.get(key)!.push(c);
        }

        const filteredCombs: Combination[] = [];
        for (const groupCombs of grouped.values()) {
          // For each group, pick the combination that maximizes the longest continuous stay
          let bestComb = groupCombs[0];
          let maxNights = Math.max(...bestComb.segments.map(s => s.nights));

          for (let i = 1; i < groupCombs.length; i++) {
            const c = groupCombs[i];
            const cMax = Math.max(...c.segments.map(s => s.nights));
            if (cMax > maxNights) {
              bestComb = c;
              maxNights = cMax;
            }
          }
          filteredCombs.push(bestComb);
        }

        combs = filteredCombs.slice(0, 6); // Top 6 unique sequences
      }
    }

    return { directDepts: direct, combinations: combs };
  }, [departments, checkInDate, checkOutDate, peopleCount]);

  const globalMaxPeople = Math.max(...departments.map(d => d.maxPeople), 1);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white overflow-hidden pt-16">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative w-full max-w-[1600px] mx-auto px-4 py-24 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-6">
            Alojamientos Di'Arte
          </h1>
          <p className="text-lg sm:text-xl max-w-2xl mx-auto text-slate-300">
            Encontrá el lugar perfecto para tu estadía. Departamentos temporarios premium, equipados para tu comodidad.
          </p>
        </div>
        {/* Wave */}
        <div className="absolute bottom-0 left-0 right-0 translate-y-[1px]">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full text-slate-50">
            <path d="M0 60L60 50C120 40 240 20 360 16.7C480 13.3 600 26.7 720 30C840 33.3 960 26.7 1080 23.3C1200 20 1320 20 1380 20L1440 20V60H1380C1320 60 1200 60 1080 60C960 60 840 60 720 60C600 60 480 60 360 60C240 60 120 60 60 60H0Z" fill="currentColor" />
          </svg>
        </div>
      </div>

      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">

        {/* Search / Filter Section */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 border border-slate-100 flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-slate-700 mb-1">Check-in (Fecha de Ingreso)</label>
            <Popover>
              <PopoverTrigger asChild>
                <button className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-left bg-white hover:bg-slate-50 flex items-center justify-between">
                  {checkInDate ? format(checkInDate, 'dd/MM/yyyy') : <span className="text-slate-400">Seleccionar fecha</span>}
                  <CalendarDays className="w-4 h-4 text-slate-400" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={checkInDate}
                  onSelect={setCheckInDate}
                  disabled={(date) => isBefore(date, today)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-slate-700 mb-1">Check-out (Fecha de Salida)</label>
            <Popover>
              <PopoverTrigger asChild>
                <button className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-left bg-white hover:bg-slate-50 flex items-center justify-between">
                  {checkOutDate ? format(checkOutDate, 'dd/MM/yyyy') : <span className="text-slate-400">Seleccionar fecha</span>}
                  <CalendarDays className="w-4 h-4 text-slate-400" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={checkOutDate}
                  onSelect={setCheckOutDate}
                  disabled={(date) => isBefore(date, checkInDate || today)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-slate-700 mb-1">Personas</label>
            <select
              value={peopleCount}
              onChange={e => setPeopleCount(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 bg-white text-slate-700 outline-none focus:border-sky-500 hover:bg-slate-50 transition-colors cursor-pointer appearance-none"
            >
              <option value="" disabled hidden>Seleccionar cantidad</option>
              {Array.from({ length: globalMaxPeople }).map((_, i) => (
                <option key={i + 1} value={i + 1}>{i + 1} {i + 1 === 1 ? 'persona' : 'personas'}</option>
              ))}
            </select>
          </div>
          <div className="w-full md:w-auto">
            <button
              className="w-full md:w-auto px-8 py-2.5 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors"
              onClick={() => {
                setCheckInDate(undefined);
                setCheckOutDate(undefined);
                setHoveredDate(null);
                setPeopleCount('');
              }}
            >
              Limpiar
            </button>
          </div>
        </div>

        {/* Dual Calendar Section */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-12 border border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-sky-100 p-2 rounded-lg text-sky-600">
                <CalendarDays className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Disponibilidad General</h2>
                <p className="text-sm text-slate-500">Haz clic en los días para seleccionar tus fechas de estadía rápidamente.</p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                onClick={() => setMonthOffset(prev => prev - 1)}
                className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                title="Mes Anterior"
              >
                <ChevronLeft className="w-5 h-5 text-slate-600" />
              </button>
              <button
                onClick={() => setMonthOffset(0)}
                className="px-3 py-2 text-sm font-medium border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Hoy
              </button>
              <button
                onClick={() => setMonthOffset(prev => prev + 1)}
                className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                title="Mes Siguiente"
              >
                <ChevronRight className="w-5 h-5 text-slate-600" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8">
            <div className="w-full">
              {renderCalendarMonth(currentMonthStart, cal1)}
            </div>
            <div className="hidden lg:block w-full">
              {renderCalendarMonth(nextMonthStart, cal2)}
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold text-slate-900">
              {checkInDate && checkOutDate
                ? `Resultados del ${format(checkInDate, "d/MMM", { locale: es })} al ${format(checkOutDate, "d/MMM", { locale: es })}`
                : "Todos los Departamentos"
              }
            </h2>
          </div>

          {checkInDate && checkOutDate && peopleCount === '' ? (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100 max-w-md mx-auto">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-700 mb-2">Falta indicar la cantidad de personas</h3>
              <p className="text-slate-500 mb-6">Por favor, seleccioná cuántas personas van a alojarse para buscar disponibilidad.</p>
              <select
                value={peopleCount}
                onChange={e => setPeopleCount(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-white text-slate-700 outline-none focus:border-sky-500 hover:bg-slate-50 transition-colors cursor-pointer appearance-none text-center font-medium"
              >
                <option value="" disabled hidden>Seleccionar cantidad</option>
                {Array.from({ length: globalMaxPeople }).map((_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1} {i + 1 === 1 ? 'persona' : 'personas'}</option>
                ))}
              </select>
            </div>
          ) : checkInDate && checkOutDate && directDepts.length === 0 && combinations.length > 0 && peopleCount !== '' ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center gap-4 shadow-sm">
              <div className="bg-amber-100 p-3 rounded-full text-amber-600">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-amber-900">No hay opciones directas disponibles</h3>
                <p className="text-amber-800">Ningún departamento está libre de forma continua para todas tus fechas. Sin embargo, armamos estas <strong>combinaciones posibles</strong> mudándote de alojamiento para cubrir toda tu estadía.</p>
              </div>
            </div>
          ) : null}

          {checkInDate && checkOutDate && directDepts.length === 0 && combinations.length === 0 && peopleCount !== '' ? (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100">
              <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-700 mb-2">Sin disponibilidad</h3>
              <p className="text-slate-500">No tenemos opciones ni combinaciones para las fechas seleccionadas. Probá con otras fechas.</p>
            </div>
          ) : (checkInDate && checkOutDate && peopleCount === '') ? null : (
            <div className="flex flex-wrap justify-center gap-6 lg:gap-8">

              {/* Render Direct Departments */}
              {directDepts.map((dept, index) => {
                let parsedImages: string[] = [];
                try {
                  const parsed = JSON.parse(dept.images);
                  if (Array.isArray(parsed)) parsedImages = parsed;
                  else if (typeof parsed === 'string') parsedImages = [parsed];
                } catch {
                  parsedImages = dept.images ? [dept.images] : [];
                }

                const priceForSelection = getPriceForPeople(dept, peopleCount === '' ? 1 : peopleCount);

                return (
                  <div
                    key={dept.id}
                    className="w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-22px)] bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-2xl transition-all duration-300 flex flex-col group cursor-pointer animate-in fade-in zoom-in-95 duration-500"
                    style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'both' }}
                    onClick={() => setSelectedDept({ dept, parsedImages })}
                  >
                    <div className="relative h-72 md:h-80 overflow-hidden bg-slate-100 rounded-t-3xl">
                      <ImageCarousel images={parsedImages} name={dept.name} />
                      <div className="absolute top-4 right-4 bg-slate-900/90 backdrop-blur-md px-4 py-1.5 rounded-full text-sm font-bold text-white shadow-lg border border-white/10 z-20">
                        ${priceForSelection} <span className="text-xs font-medium text-slate-300">/noche</span>
                      </div>
                    </div>

                    <div className="p-6 flex flex-col flex-1">
                      <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-sky-600 transition-colors">{dept.name}</h3>
                      <p className="text-slate-500 text-sm line-clamp-2 mb-4 flex-1">
                        {dept.description || "Un hermoso departamento completamente equipado para tu estadía."}
                      </p>

                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="flex items-center justify-center gap-2 text-slate-700 bg-slate-50 p-2 rounded-2xl border border-slate-100 group-hover:border-sky-100 transition-colors">
                          <Users className="w-4 h-4 text-sky-500" />
                          <span className="font-medium text-sm">Hasta {dept.maxPeople} {dept.maxPeople === 1 ? 'persona' : 'personas'}</span>
                        </div>
                        <div className="flex items-center justify-center gap-2 text-slate-700 bg-slate-50 p-2 rounded-2xl border border-slate-100 group-hover:border-sky-100 transition-colors">
                          <Bed className="w-4 h-4 text-sky-500" />
                          <span className="font-medium text-sm">{dept.bedCount} camas</span>
                        </div>
                      </div>

                      {checkInDate && checkOutDate && peopleCount !== '' ? (
                        <button
                          className="w-full py-3 px-4 bg-sky-50 text-sky-700 hover:bg-sky-600 hover:text-white border border-sky-200 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            setReservationData({ type: 'direct', dept, checkIn: checkInDate, checkOut: checkOutDate, people: peopleCount as number });
                          }}
                        >
                          Reservar
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      ) : (
                        <button className="w-full py-3 px-4 bg-sky-50 text-sky-700 hover:bg-sky-600 hover:text-white border border-sky-200 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm">
                          Ver Detalles y Precios
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Render Combinations if no direct depts */}
              {directDepts.length === 0 && combinations.map((comb, idx) => (
                <div key={`comb-${idx}`} className="w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-22px)] bg-white rounded-2xl overflow-hidden shadow-md border-2 border-amber-200 transition-all flex flex-col">
                  <div className="bg-amber-100 p-4 border-b border-amber-200">
                    <h3 className="text-lg font-bold text-amber-900">Opción Combinada #{idx + 1}</h3>
                    <p className="text-sm text-amber-800 font-medium">{comb.totalChanges} mudanza(s) • Total: ${comb.totalPrice}</p>
                  </div>
                  <div className="p-5 flex-1 flex flex-col gap-4">
                    {comb.segments.map((seg, sIdx) => {
                      const d = departments.find(dep => dep.id === seg.deptId);
                      let parsedImages: string[] = [];
                      if (d) {
                        try {
                          const parsed = JSON.parse(d.images);
                          if (Array.isArray(parsed)) parsedImages = parsed;
                          else if (typeof parsed === 'string') parsedImages = [parsed];
                        } catch {
                          parsedImages = d.images ? [d.images] : [];
                        }
                      }
                      
                      return (
                      <div key={sIdx} className="relative pl-4 border-l-2 border-slate-200">
                        <div className="absolute w-3 h-3 bg-amber-400 rounded-full -left-[7px] top-1.5 ring-4 ring-white" />
                        <div 
                          className="flex items-center gap-3 cursor-pointer group"
                          onClick={() => d && setSelectedDept({ dept: d, parsedImages })}
                        >
                          {parsedImages[0] && (
                            <img src={parsedImages[0]} alt={seg.deptName} className="w-10 h-10 rounded-lg object-cover" />
                          )}
                          <div>
                            <h4 className="font-bold text-slate-800 group-hover:text-amber-600 transition-colors">{seg.deptName}</h4>
                            <p className="text-sm text-slate-500">
                              {format(seg.checkIn, "d MMM", { locale: es })} - {format(seg.checkOut, "d MMM", { locale: es })}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs font-medium text-slate-400 mt-2">{seg.nights} noche(s) • ${seg.price}</p>
                      </div>
                      );
                    })}
                  </div>
                  <div className="p-6 pt-0 mt-auto">
                    <button
                      className="w-full py-3 px-4 bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white border border-amber-200 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setReservationData({ type: 'combination', comb, checkIn: checkInDate!, checkOut: checkOutDate!, people: peopleCount as number });
                      }}
                    >
                      Reservar Combinación
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

            </div>
          )}
        </div>
      </div>

      {selectedDept && (
        <DepartmentModal
          dept={selectedDept.dept}
          parsedImages={selectedDept.parsedImages}
          onClose={() => setSelectedDept(null)}
        />
      )}

      {reservationData && (
        <ReservationRequestModal
          data={reservationData}
          departments={departments}
          onClose={() => setReservationData(null)}
          onSelectDept={setSelectedDept}
          isHidden={!!selectedDept}
        />
      )}

      <PublicFooter />
    </div>
  );
}

function ReservationRequestModal({
  data,
  departments,
  onClose,
  onSelectDept,
  isHidden
}: {
  data: { type: 'direct' | 'combination'; dept?: Department; comb?: Combination; checkIn: Date; checkOut: Date; people: number; };
  departments: Department[];
  onClose: () => void;
  onSelectDept: (data: { dept: Department, parsedImages: string[] }) => void;
  isHidden?: boolean;
}) {
  const [name, setName] = useState("");
  const [dni, setDni] = useState("");
  const [nationality, setNationality] = useState("Argentino");
  const [phone, setPhone] = useState("");
  const [people, setPeople] = useState(data.people || 1);
  const [garage, setGarage] = useState(false);
  const [sent, setSent] = useState(false);

  const nights = differenceInDays(data.checkOut, data.checkIn);

  // Calculate max people allowed
  const maxPeople = data.type === 'direct'
    ? data.dept!.maxPeople
    : Math.min(...data.comb!.segments.map(s => {
      const d = departments.find(dep => dep.id === s.deptId);
      return d ? d.maxPeople : 1;
    }));

  const totalPrice = data.type === 'direct'
    ? getPriceForPeople(data.dept!, people) * nights
    : data.comb!.segments.reduce((acc, seg) => {
      const d = departments.find(dep => dep.id === seg.deptId);
      return acc + (d ? getPriceForPeople(d, people) * seg.nights : 0);
    }, 0);

  const handleReserve = async () => {
    // Build segments for API call
    const segments = data.type === 'direct'
      ? [{
          deptId: data.dept!.id,
          checkIn: data.checkIn.toISOString(),
          checkOut: data.checkOut.toISOString(),
          totalAmount: getPriceForPeople(data.dept!, people) * nights,
        }]
      : data.comb!.segments.map(seg => {
          const d = departments.find(dep => dep.id === seg.deptId);
          return {
            deptId: seg.deptId,
            checkIn: seg.checkIn.toISOString(),
            checkOut: seg.checkOut.toISOString(),
            totalAmount: d ? getPriceForPeople(d, people) * seg.nights : 0,
          };
        });

    // POST to API (fire and forget, but await so WhatsApp opens after)
    try {
      await fetch('/api/public/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: data.type,
          guestName: name,
          guestDni: dni,
          guestNationality: nationality,
          guestPhone: phone,
          people,
          hasParking: garage,
          segments,
        })
      });
    } catch (e) {
      console.error('Error registering reservation request:', e);
    }

    const wsNumber = "5493513146924";
    let message = `¡Hola! Me gustaría solicitar una reserva.\n\n`;
    message += `*Datos Personales*\n`;
    message += `- Nombre: ${name}\n`;
    message += `- DNI/Cédula: ${dni}\n`;
    message += `- Nacionalidad: ${nationality}\n`;
    message += `- Teléfono: ${phone}\n\n`;

    message += `*Detalles de la Reserva*\n`;
    if (data.type === 'direct') {
      message += `- Departamento: ${data.dept!.name}\n`;
    } else {
      message += `- Tipo: Reserva Combinada\n`;
      data.comb!.segments.forEach((seg, i) => {
        message += `  ${i + 1}. ${seg.deptName} (${format(seg.checkIn, 'dd/MM')} al ${format(seg.checkOut, 'dd/MM')})\n`;
      });
    }
    message += `- Check-in: ${format(data.checkIn, 'dd/MM/yyyy')}\n`;
    message += `- Check-out: ${format(data.checkOut, 'dd/MM/yyyy')}\n`;
    message += `- Noches: ${nights}\n`;
    message += `- Personas: ${people}\n`;
    message += `- Cochera: ${garage ? 'Sí' : 'No'}\n`;
    message += `- Precio Total: $${totalPrice.toLocaleString()}\n`;

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${wsNumber}?text=${encoded}`, '_blank');
    setSent(true);
  };

  // Ensure people doesn't exceed max if user selects combination that has lower max
  useEffect(() => {
    if (people > maxPeople) setPeople(maxPeople);
  }, [maxPeople, people]);

  return (
    <div className={`fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto ${isHidden ? 'hidden' : ''}`} onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-2xl p-6 md:p-8 relative my-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <button onClick={() => { onClose(); if (sent) window.location.reload(); }} className="absolute top-6 right-6 p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors text-slate-500 hover:text-slate-700">
          <X className="w-5 h-5" />
        </button>

        {sent ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-5">
              <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">¡Solicitud enviada!</h2>
            <p className="text-slate-600 max-w-sm mb-2">
              Gracias por elegir Alojamientos Di&apos;Arte. Tu solicitud fue registrada exitosamente.
            </p>
            <p className="text-slate-500 text-sm max-w-sm mb-6">
              📱 Te contactaremos por WhatsApp a la brevedad para <strong>confirmar tu reserva</strong>. Recordá que las fechas quedan bloqueadas únicamente luego de recibir el adelanto de $10.000.
            </p>
            <button
              onClick={() => { onClose(); window.location.reload(); }}
              className="px-8 py-3 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-2xl transition-colors shadow-lg"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <CalendarDays className="w-6 h-6 text-sky-500" />
              Solicitud de Reserva
            </h2>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all" placeholder="Ej. Juan Pérez" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">DNI / Cédula de Identidad</label>
              <input type="text" value={dni} onChange={e => setDni(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all" placeholder="Número de documento" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nacionalidad</label>
              <input type="text" value={nationality} onChange={e => setNationality(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value.replace(/[^\d+\s\-()]/g, ''))} inputMode="tel" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all" placeholder="Ej. +54 9 351..." />
            </div>
          </div>

          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
            <h3 className="font-semibold text-slate-800 mb-3 text-sm uppercase tracking-wider">Detalles de la estadía</h3>
            <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
              <div>
                <span className="text-slate-500 block text-xs mb-0.5">Fechas seleccionadas</span>
                <span className="font-medium text-slate-900">{format(data.checkIn, "dd/MM/yyyy")} al {format(data.checkOut, "dd/MM/yyyy")}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs mb-0.5">Cantidad de noches</span>
                <span className="font-medium text-slate-900">{nights} {nights === 1 ? 'noche' : 'noches'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs mb-1">Cantidad de personas</span>
                <select value={people} onChange={e => setPeople(Number(e.target.value))} className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-sky-500 bg-white">
                  {Array.from({ length: maxPeople }).map((_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1} {i + 1 === 1 ? 'persona' : 'personas'}</option>
                  ))}
                </select>
              </div>
              <div>
                <span className="text-slate-500 block text-xs mb-1">Cochera</span>
                <label className="flex items-center gap-2 mt-1 cursor-pointer">
                  <input type="checkbox" checked={garage} onChange={e => setGarage(e.target.checked)} className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300" />
                  <span className="text-slate-700">Necesita cochera</span>
                </label>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200">
              <span className="text-slate-800 font-semibold mb-2 block text-sm uppercase tracking-wider">Alojamiento</span>
              {data.type === 'direct' ? (() => {
                let parsedImages: string[] = [];
                try {
                  const parsed = JSON.parse(data.dept!.images);
                  if (Array.isArray(parsed)) parsedImages = parsed;
                  else if (typeof parsed === 'string') parsedImages = [parsed];
                } catch {
                  parsedImages = data.dept!.images ? [data.dept!.images] : [];
                }
                
                return (
                  <div 
                    className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 cursor-pointer hover:border-sky-300 transition-colors group"
                    onClick={() => onSelectDept({ dept: data.dept!, parsedImages })}
                  >
                    <div className="flex items-center gap-3">
                      {parsedImages[0] && <img src={parsedImages[0]} alt={data.dept!.name} className="w-10 h-10 rounded-lg object-cover" />}
                      <span className="font-medium text-slate-800 group-hover:text-sky-600 transition-colors">{data.dept!.name}</span>
                    </div>
                    <span className="text-slate-600 text-sm font-medium">${(getPriceForPeople(data.dept!, people) * nights).toLocaleString()}</span>
                  </div>
                );
              })() : (
                <div className="space-y-2">
                  {data.comb!.segments.map((seg, i) => {
                    const d = departments.find(dep => dep.id === seg.deptId);
                    const segPrice = d ? getPriceForPeople(d, people) * seg.nights : 0;
                    
                    let parsedImages: string[] = [];
                    if (d) {
                      try {
                        const parsed = JSON.parse(d.images);
                        if (Array.isArray(parsed)) parsedImages = parsed;
                        else if (typeof parsed === 'string') parsedImages = [parsed];
                      } catch {
                        parsedImages = d.images ? [d.images] : [];
                      }
                    }

                    return (
                      <div 
                        key={i} 
                        className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 cursor-pointer hover:border-sky-300 transition-colors group"
                        onClick={() => d && onSelectDept({ dept: d, parsedImages })}
                      >
                        <div className="flex items-center gap-3">
                          {parsedImages[0] && <img src={parsedImages[0]} alt={seg.deptName} className="w-10 h-10 rounded-lg object-cover" />}
                          <div>
                            <span className="font-medium text-slate-800 block text-sm group-hover:text-sky-600 transition-colors">{seg.deptName}</span>
                            <span className="text-xs text-slate-500">{seg.nights} noche(s)</span>
                          </div>
                        </div>
                        <span className="text-slate-600 text-sm font-medium">${segPrice.toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200 flex items-end justify-between">
              <span className="text-slate-500 font-medium">Precio Total</span>
              <span className="text-2xl font-bold text-sky-600">${totalPrice.toLocaleString()}</span>
            </div>
          </div>

          <div className="bg-sky-50/50 p-4 rounded-xl border border-sky-100 text-sm text-slate-600 leading-relaxed space-y-3 max-h-48 overflow-y-auto custom-scrollbar">
            <p><strong>¡Gracias por elegirnos para tu estadía!</strong> Para poder confirmar y asegurar tu reserva, te pedimos un depósito o transferencia previa de <strong>$10.000</strong>. Este adelanto nos permite bloquear las fechas exclusivamente para vos. El resto del monto se abona al momento del ingreso, descontando obviamente lo ya abonado.</p>
            <p>Te contamos que trabajamos así porque no contamos con garantías en caso de que los huéspedes no se presenten, lo que nos genera pérdidas al tener esas fechas bloqueadas. En cambio, si preferís, también tenemos la opción de reservar por Airbnb, donde el pago se gestiona directamente por la plataforma y no hace falta adelantar el depósito.</p>
            <p>Como detalle importante, te contamos que los cambios de fecha pueden realizarse con al menos 5 días de anticipación, así podemos organizarnos mejor y ofrecer una buena experiencia tanto a vos como a los siguientes huéspedes.</p>
          </div>

          <button
            onClick={handleReserve}
            disabled={!name.trim() || !dni.trim() || !phone.trim()}
            className="w-full py-4 bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-bold text-lg shadow-lg shadow-green-500/20 transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /><path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.118 1.528 5.845L0 24l6.335-1.508A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.882a9.87 9.87 0 01-5.031-1.375l-.361-.214-3.742.981.999-3.648-.235-.374A9.861 9.861 0 012.118 12C2.118 6.545 6.545 2.118 12 2.118S21.882 6.545 21.882 12 17.455 21.882 12 21.882z" /></svg>
            Reservar por WhatsApp
          </button>
          </div>
          </>
        )}
      </div>
    </div>
  );
}
