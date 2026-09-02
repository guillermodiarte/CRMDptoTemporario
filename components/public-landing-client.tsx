"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { format, addDays, isSameDay, isWithinInterval, startOfDay, endOfDay, differenceInDays, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, isBefore, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, MapPin, Users, Bed, ChevronRight, AlertTriangle, ChevronLeft, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

import { ImageCarousel, DepartmentModal, SharedDepartment } from "./shared-ui";
import { PublicFooter } from "./public-footer";
import { SiteConfig, SITE_CONFIG_DEFAULTS, HeroSlide } from "@/lib/site.config";

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

const parseDeptImages = (imagesStr: any): string[] => {
  try {
    let parsed = imagesStr || "[]";
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
      .map((item: any) => {
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
      .filter((u: string) => u.length > 0);
  } catch {
    return [];
  }
};

// Smooth scroll helper with custom duration and easing
function smoothScrollTo(targetY: number, duration: number = 850) {
  if (typeof window === "undefined") return;
  const startY = window.scrollY;
  const diff = targetY - startY;
  if (Math.abs(diff) < 10) return;
  const startTime = performance.now();

  function step(currentTime: number) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Easing: easeInOutCubic
    const ease = progress < 0.5
      ? 4 * progress * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;

    window.scrollTo(0, startY + diff * ease);

    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }

  requestAnimationFrame(step);
}

export function PublicLandingClient({
  initialDepartments,
  config = SITE_CONFIG_DEFAULTS,
}: {
  initialDepartments: any[];
  config?: SiteConfig;
}) {
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

  const searchBarRef = useRef<HTMLDivElement>(null);
  const peopleSelectRef = useRef<HTMLSelectElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const isDatesSet = !!(checkInDate && checkOutDate);
  const isMissingPeople = isDatesSet && peopleCount === '';
  const isFilterComplete = isDatesSet && peopleCount !== '';

  const datesKey = `${checkInDate ? checkInDate.getTime() : ''}_${checkOutDate ? checkOutDate.getTime() : ''}`;
  const peopleKey = `${peopleCount}`;
  const prevFilterKey = useRef('');

  useEffect(() => {
    const currentKey = `${datesKey}_${peopleKey}`;
    if (currentKey === prevFilterKey.current) return;
    prevFilterKey.current = currentKey;

    if (checkInDate && checkOutDate) {
      if (peopleCount === '') {
        // Missing people: scroll UP smoothly to the red alert in the search bar
        const timer = setTimeout(() => {
          if (searchBarRef.current) {
            const rect = searchBarRef.current.getBoundingClientRect();
            const targetY = rect.top + window.scrollY - 100;
            smoothScrollTo(targetY, 800);
            setTimeout(() => {
              peopleSelectRef.current?.focus();
            }, 850);
          }
        }, 150);
        return () => clearTimeout(timer);
      } else {
        // Both dates and people selected: scroll DOWN slowly and smoothly to results
        const timer = setTimeout(() => {
          if (resultsRef.current) {
            const rect = resultsRef.current.getBoundingClientRect();
            const targetY = rect.top + window.scrollY - 80;
            smoothScrollTo(targetY, 950);
          }
        }, 200);
        return () => clearTimeout(timer);
      }
    }
  }, [datesKey, peopleKey, checkInDate, checkOutDate, peopleCount]);

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
      <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 capitalize">
        {format(monthStart, "MMMM yyyy", { locale: es })}
      </h3>
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
          <div key={d} className="text-xs font-bold text-slate-400 dark:text-slate-500">{d}</div>
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

          // A full day is selectable as checkout only when checkin is set and this day is after it
          const isSelectableAsCheckout = isFull && !isPast && checkInDate && !checkOutDate && date > checkInDate;

          let bgClass = "bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 hover:border-sky-300 dark:hover:border-sky-500 hover:shadow-sm cursor-pointer";
          let numberColor = "text-slate-900 dark:text-white";
          let subtextColor = "text-sky-600 dark:text-sky-400 font-semibold";

          if (isPast) {
            bgClass = "bg-slate-50 dark:bg-slate-900/50 border-transparent cursor-default";
            numberColor = "text-slate-300 dark:text-slate-600";
            subtextColor = "text-slate-300 dark:text-slate-600";
          } else if (isSelected) {
            bgClass = "bg-slate-900 dark:bg-sky-600 border-slate-900 dark:border-sky-600 text-white shadow-md transform scale-105 z-10 relative cursor-pointer";
            numberColor = "text-white";
            subtextColor = "text-sky-100 dark:text-white font-semibold";
          } else if (isInRange) {
            bgClass = "bg-sky-200 dark:bg-sky-900/60 border-sky-400 dark:border-sky-600 font-medium cursor-pointer";
            numberColor = "text-sky-950 dark:text-sky-100";
            subtextColor = "text-sky-800 dark:text-sky-200";
          } else if (isFull && isSelectableAsCheckout) {
            bgClass = "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-700/50 opacity-80 hover:border-amber-400 cursor-pointer";
            numberColor = "text-amber-900 dark:text-amber-200";
            subtextColor = "text-amber-700 dark:text-amber-400 font-semibold";
          } else if (isFull) {
            bgClass = "bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-900/30 opacity-50 cursor-not-allowed";
            numberColor = "text-red-400 dark:text-red-400";
            subtextColor = "text-red-600 dark:text-red-400 font-bold";
          }

          return (
            <div
              key={i}
              onMouseEnter={() => {
                if (!isPast && !isFull && checkInDate && !checkOutDate) {
                  setHoveredDate(date);
                }
                if (!isPast && isFull && checkInDate && !checkOutDate && date > checkInDate) {
                  setHoveredDate(date);
                }
              }}
              className={`flex flex-col items-center justify-center p-1 h-14 rounded-lg border cursor-pointer transition-all duration-200 ${bgClass}`}
              onClick={() => {
                // Past days: always blocked
                if (isPast) return;

                // Full day with NO check-in yet: blocked (can't check IN on a full day)
                if (isFull && !isSelectableAsCheckout) return;

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
              <span className={`text-sm font-bold ${numberColor}`}>
                {format(date, 'd')}
              </span>
              {!isPast && (
                <span className={`text-[9px] leading-tight font-medium mt-0.5 ${subtextColor}`}>
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
      if (typeof peopleCount === 'number' && dept.maxPeople < peopleCount) return false;
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

  const parsedHeroSlides = useMemo<HeroSlide[]>(() => {
    try {
      if (config.heroSlides) {
        const parsed = typeof config.heroSlides === "string" ? JSON.parse(config.heroSlides) : config.heroSlides;
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter(s => s && (s.title || s.subtitle || s.image));
        }
      }
    } catch (e) {
      console.error("Error parsing hero slides:", e);
    }
    return [
      {
        id: "default-slide",
        image: "",
        title: config.siteName || "Alojamientos Di'Arte",
        subtitle: config.siteSlogan || "Departamentos temporarios premium en Formosa, Argentina. Equipados para tu comodidad y listos para hacer de tu estadía una experiencia inigualable.",
      }
    ];
  }, [config.heroSlides, config.siteName, config.siteSlogan]);

  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isHoveringHero, setIsHoveringHero] = useState(false);

  // Auto-advance slides every 6 seconds if not hovered and multiple slides exist
  useEffect(() => {
    if (parsedHeroSlides.length <= 1 || isHoveringHero) return;
    const interval = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % parsedHeroSlides.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [parsedHeroSlides.length, isHoveringHero]);

  const nextSlide = () => {
    setCurrentSlideIndex((prev) => (prev + 1) % parsedHeroSlides.length);
  };

  const prevSlide = () => {
    setCurrentSlideIndex((prev) => (prev - 1 + parsedHeroSlides.length) % parsedHeroSlides.length);
  };

  const globalMaxPeople = Math.max(...departments.map(d => d.maxPeople), 1);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors duration-300">
      {/* Dynamic Hero Slider Section */}
      <div 
        className="relative bg-slate-950 text-white overflow-hidden min-h-[420px] sm:min-h-[480px] md:min-h-[520px] flex items-center justify-center pt-16 transition-colors duration-300 group/hero"
        onMouseEnter={() => setIsHoveringHero(true)}
        onMouseLeave={() => setIsHoveringHero(false)}
      >
        {/* Background Slides */}
        {parsedHeroSlides.map((slide, idx) => {
          const isActive = idx === currentSlideIndex;
          return (
            <div
              key={slide.id || idx}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                isActive ? "opacity-100 z-10" : "opacity-0 pointer-events-none z-0"
              }`}
            >
              {slide.image ? (
                <div className="absolute inset-0 overflow-hidden">
                  <img
                    src={slide.image}
                    alt={slide.title || "Slide"}
                    className={`w-full h-full object-cover transform transition-transform duration-7000 ease-out ${
                      isActive ? "scale-105" : "scale-100"
                    }`}
                  />
                  {/* Dark gradient overlay for text readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/75 backdrop-blur-[0.5px]" />
                </div>
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
                  <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
                </div>
              )}
            </div>
          );
        })}

        {/* Content of the active slide */}
        <div className="relative z-20 w-full max-w-[1600px] mx-auto px-4 py-20 sm:px-6 lg:px-8 text-center">
          {parsedHeroSlides.map((slide, idx) => {
            const isActive = idx === currentSlideIndex;
            if (!isActive) return null;
            return (
              <div key={slide.id || idx} className="max-w-3xl mx-auto animate-in fade-in zoom-in-95 duration-500">
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-5 text-white drop-shadow-lg">
                  {slide.title || config.siteName}
                </h1>
                <p className="text-lg sm:text-xl text-slate-200 drop-shadow-md leading-relaxed mb-6 font-normal max-w-2xl mx-auto">
                  {slide.subtitle || config.siteSlogan}
                </p>
                {slide.buttonText && (
                  <div className="mt-2">
                    <a
                      href={slide.buttonLink || "#search-bar"}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-2xl shadow-lg shadow-sky-500/30 hover:scale-105 transition-all duration-200 cursor-pointer"
                    >
                      {slide.buttonText}
                      <ChevronRight className="w-4 h-4" />
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Navigation Arrows (if > 1 slide) */}
        {parsedHeroSlides.length > 1 && (
          <>
            <button
              onClick={prevSlide}
              aria-label="Slide anterior"
              className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-black/40 hover:bg-black/70 text-white border border-white/20 backdrop-blur-md shadow-xl transition-all hover:scale-110 cursor-pointer opacity-80 hover:opacity-100"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextSlide}
              aria-label="Siguiente slide"
              className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-black/40 hover:bg-black/70 text-white border border-white/20 backdrop-blur-md shadow-xl transition-all hover:scale-110 cursor-pointer opacity-80 hover:opacity-100"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Pagination Indicators / Dots */}
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2.5">
              {parsedHeroSlides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlideIndex(idx)}
                  aria-label={`Ir al slide ${idx + 1}`}
                  className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                    idx === currentSlideIndex
                      ? "w-8 bg-sky-400 shadow-md shadow-sky-400/50"
                      : "w-2.5 bg-white/40 hover:bg-white/70"
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {/* Wave Divider */}
        <div className="absolute bottom-0 left-0 right-0 translate-y-[1px] z-20 pointer-events-none">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full text-slate-50 dark:text-slate-950 transition-colors duration-300">
            <path d="M0 60L60 50C120 40 240 20 360 16.7C480 13.3 600 26.7 720 30C840 33.3 960 26.7 1080 23.3C1200 20 1320 20 1380 20L1440 20V60H1380C1320 60 1200 60 1080 60C960 60 840 60 720 60C600 60 480 60 360 60C240 60 120 60 60 60H0Z" fill="currentColor" />
          </svg>
        </div>
      </div>

      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">

        {/* Search / Filter Section */}
        <div ref={searchBarRef} className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 sm:p-7 mb-8 border border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row gap-4 items-end transition-colors duration-300 relative z-20">
          <div className="flex-1 w-full">
            <label className="block text-sm font-bold text-slate-800 dark:text-slate-100 mb-1.5 tracking-wide">
              Check-in <span className="text-xs font-medium text-slate-500 dark:text-slate-400">(Fecha de Ingreso)</span>
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <button className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-left bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700/80 flex items-center justify-between transition-colors cursor-pointer shadow-xs">
                  {checkInDate ? <span className="font-semibold">{format(checkInDate, 'dd/MM/yyyy')}</span> : <span className="text-slate-400 dark:text-slate-400 font-medium">Seleccionar fecha</span>}
                  <CalendarDays className="w-4 h-4 text-sky-600 dark:text-sky-400" />
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
            <label className="block text-sm font-bold text-slate-800 dark:text-slate-100 mb-1.5 tracking-wide">
              Check-out <span className="text-xs font-medium text-slate-500 dark:text-slate-400">(Fecha de Salida)</span>
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <button className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-left bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700/80 flex items-center justify-between transition-colors cursor-pointer shadow-xs">
                  {checkOutDate ? <span className="font-semibold">{format(checkOutDate, 'dd/MM/yyyy')}</span> : <span className="text-slate-400 dark:text-slate-400 font-medium">Seleccionar fecha</span>}
                  <CalendarDays className="w-4 h-4 text-sky-600 dark:text-sky-400" />
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
          <div className="flex-1 w-full relative">
            <label className="block text-sm font-bold text-slate-800 dark:text-slate-100 mb-1.5 tracking-wide">
              Personas {isMissingPeople && <span className="text-red-500 font-bold">*</span>}
            </label>
            <select
              ref={peopleSelectRef}
              value={peopleCount}
              onChange={e => setPeopleCount(e.target.value === '' ? '' : Number(e.target.value))}
              className={`w-full rounded-xl px-4 py-2.5 outline-none transition-all cursor-pointer appearance-none shadow-xs ${
                isMissingPeople
                  ? "border-2 border-red-500 bg-red-50/40 dark:bg-red-950/20 text-red-900 dark:text-red-200 ring-4 ring-red-500/15 font-semibold"
                  : "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold focus:border-sky-500 hover:bg-slate-50 dark:hover:bg-slate-700/80"
              }`}
            >
              <option value="" disabled hidden>Seleccionar cantidad</option>
              {Array.from({ length: globalMaxPeople }).map((_, i) => (
                <option key={i + 1} value={i + 1}>{i + 1} {i + 1 === 1 ? 'persona' : 'personas'}</option>
              ))}
            </select>

            {/* Absolute floating tooltip - does not alter the layout or push the input */}
            {isMissingPeople && (
              <div className="absolute top-full mt-2 left-0 right-0 z-30 pointer-events-none animate-in fade-in zoom-in-95 duration-200">
                <div className="relative bg-red-600 text-white text-xs font-semibold py-1.5 px-3 rounded-xl shadow-xl flex items-center justify-center gap-1.5 text-center">
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-red-600 rotate-45" />
                  <span>* Obligatorio seleccionar cantidad para continuar</span>
                </div>
              </div>
            )}
          </div>
          <div className="w-full md:w-auto">
            <button
              className="w-full md:w-auto px-8 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl font-semibold transition-all cursor-pointer shadow-sm hover:shadow"
              onClick={() => {
                setCheckInDate(undefined);
                setCheckOutDate(undefined);
                setHoveredDate(null);
                setPeopleCount('');
                hasScrolledToResults.current = false;
              }}
            >
              Limpiar
            </button>
          </div>
        </div>

        {/* Dual Calendar Section */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-6 mb-12 border border-slate-100 dark:border-slate-800 transition-colors duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-sky-100 dark:bg-sky-500/15 p-2 rounded-lg text-sky-600 dark:text-sky-400">
                <CalendarDays className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Disponibilidad General</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Haz clic en los días para seleccionar tus fechas de estadía rápidamente.</p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                onClick={() => setMonthOffset(prev => prev - 1)}
                className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                title="Mes Anterior"
              >
                <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
              </button>
              <button
                onClick={() => setMonthOffset(0)}
                className="px-3 py-2 text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              >
                Hoy
              </button>
              <button
                onClick={() => setMonthOffset(prev => prev + 1)}
                className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                title="Mes Siguiente"
              >
                <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-300" />
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
        <div ref={resultsRef} className="space-y-8 scroll-mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
              {checkInDate && checkOutDate
                ? `Resultados del ${format(checkInDate, "d/MMM", { locale: es })} al ${format(checkOutDate, "d/MMM", { locale: es })}`
                : "Todos los Departamentos"
              }
            </h2>
          </div>

          {checkInDate && checkOutDate && directDepts.length === 0 && combinations.length > 0 && peopleCount !== '' ? (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-700/50 rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center gap-4 shadow-sm">
              <div className="bg-amber-100 dark:bg-amber-900/50 p-3 rounded-full text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-amber-900 dark:text-amber-200">No hay opciones directas disponibles</h3>
                <p className="text-amber-800 dark:text-amber-300">Ningún departamento está libre de forma continua para todas tus fechas. Sin embargo, armamos estas <strong>combinaciones posibles</strong> mudándote de alojamiento para cubrir toda tu estadía.</p>
              </div>
            </div>
          ) : null}

          {checkInDate && checkOutDate && directDepts.length === 0 && combinations.length === 0 && peopleCount !== '' ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center shadow-sm border border-slate-100 dark:border-slate-800">
              <CalendarDays className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-200 mb-2">Sin disponibilidad</h3>
              <p className="text-slate-500 dark:text-slate-400">No tenemos opciones ni combinaciones para las fechas seleccionadas. Probá con otras fechas.</p>
            </div>
          ) : (checkInDate && checkOutDate && peopleCount === '') ? null : (
            <div className="flex flex-wrap justify-center gap-6 lg:gap-8">

              {/* Render Direct Departments */}
              {directDepts.map((dept, index) => {
                const parsedImages = parseDeptImages(dept.images);
                const priceForSelection = getPriceForPeople(dept, peopleCount === '' ? 1 : peopleCount);

                return (
                  <div
                    key={dept.id}
                    className="w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-22px)] bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-2xl transition-all duration-300 flex flex-col group cursor-pointer animate-in fade-in zoom-in-95 duration-500"
                    style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'both' }}
                    onClick={() => setSelectedDept({ dept, parsedImages })}
                  >
                    <div className="relative h-72 md:h-80 overflow-hidden bg-slate-100 dark:bg-slate-800 rounded-t-3xl">
                      <ImageCarousel images={parsedImages} name={dept.name} />
                      <div className="absolute top-4 right-4 bg-slate-900/90 dark:bg-slate-950/90 backdrop-blur-md px-4 py-1.5 rounded-full text-sm font-bold text-white shadow-lg border border-white/10 z-20">
                        ${priceForSelection} <span className="text-xs font-medium text-slate-300">/noche</span>
                      </div>
                    </div>

                    <div className="p-6 flex flex-col flex-1">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">{dept.name}</h3>
                      <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-2 mb-4 flex-1">
                        {dept.description || "Un hermoso departamento completamente equipado para tu estadía."}
                      </p>

                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="flex items-center justify-center gap-2 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 p-2 rounded-2xl border border-slate-100 dark:border-slate-700 group-hover:border-sky-100 transition-colors">
                          <Users className="w-4 h-4 text-sky-500" />
                          <span className="font-medium text-sm">Hasta {dept.maxPeople} {dept.maxPeople === 1 ? 'persona' : 'personas'}</span>
                        </div>
                        <div className="flex items-center justify-center gap-2 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 p-2 rounded-2xl border border-slate-100 dark:border-slate-700 group-hover:border-sky-100 transition-colors">
                          <Bed className="w-4 h-4 text-sky-500" />
                          <span className="font-medium text-sm">{dept.bedCount} camas</span>
                        </div>
                      </div>

                      {checkInDate && checkOutDate && peopleCount !== '' ? (
                        <button
                          className="w-full py-3 px-4 bg-sky-50 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300 hover:bg-sky-600 hover:text-white dark:hover:bg-sky-500 dark:hover:text-white border border-sky-200 dark:border-sky-500/30 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setReservationData({ type: 'direct', dept, checkIn: checkInDate, checkOut: checkOutDate, people: peopleCount as number });
                          }}
                        >
                          Reservar
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      ) : (
                        <button className="w-full py-3 px-4 bg-sky-50 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300 hover:bg-sky-600 hover:text-white dark:hover:bg-sky-500 dark:hover:text-white border border-sky-200 dark:border-sky-500/30 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm cursor-pointer">
                          Ver Detalles y Precios
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Render Combinations if no direct depts */}
              {directDepts.length === 0 && combinations.map((comb, idx) => (
                <div key={`comb-${idx}`} className="w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-22px)] bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-md border-2 border-amber-300 dark:border-amber-500/40 transition-all flex flex-col">
                  <div className="bg-amber-100 dark:bg-amber-950/60 p-4 border-b border-amber-200 dark:border-amber-800/60">
                    <h3 className="text-lg font-bold text-amber-900 dark:text-amber-200">Opción Combinada #{idx + 1}</h3>
                    <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">{comb.totalChanges} mudanza(s) • Total: ${comb.totalPrice}</p>
                  </div>
                  <div className="p-5 flex-1 flex flex-col gap-4">
                    {comb.segments.map((seg, sIdx) => {
                      const d = departments.find(dep => dep.id === seg.deptId);
                      const parsedImages = d ? parseDeptImages(d.images) : [];
                      
                      return (
                      <div key={sIdx} className="relative pl-4 border-l-2 border-slate-200 dark:border-slate-700">
                        <div className="absolute w-3 h-3 bg-amber-400 rounded-full -left-[7px] top-1.5 ring-4 ring-white dark:ring-slate-900" />
                        <div 
                          className="flex items-center gap-3 cursor-pointer group"
                          onClick={() => d && setSelectedDept({ dept: d, parsedImages })}
                        >
                          {parsedImages[0] && (
                            <img src={parsedImages[0]} alt={seg.deptName} className="w-10 h-10 rounded-lg object-cover" />
                          )}
                          <div>
                            <h4 className="font-bold text-slate-800 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">{seg.deptName}</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              {format(seg.checkIn, "d MMM", { locale: es })} - {format(seg.checkOut, "d MMM", { locale: es })}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mt-2">{seg.nights} noche(s) • ${seg.price}</p>
                      </div>
                      );
                    })}
                  </div>
                  <div className="p-6 pt-0 mt-auto">
                    <button
                      className="w-full py-3 px-4 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-300 hover:bg-amber-500 hover:text-white dark:hover:bg-amber-500 dark:hover:text-white border border-amber-200 dark:border-amber-700/50 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
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
          config={config}
        />
      )}

      <PublicFooter config={config} />
    </div>
  );
}

function ReservationRequestModal({
  data,
  departments,
  onClose,
  onSelectDept,
  isHidden,
  config = SITE_CONFIG_DEFAULTS,
}: {
  data: { type: 'direct' | 'combination'; dept?: Department; comb?: Combination; checkIn: Date; checkOut: Date; people: number; };
  departments: Department[];
  onClose: () => void;
  onSelectDept: (data: { dept: Department, parsedImages: string[] }) => void;
  isHidden?: boolean;
  config?: SiteConfig;
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

    const wsNumber = config.phoneWhatsApp.replace(/\D/g, "") || "5493513146924";
    let message = `¡Hola! Me gustaría solicitar una reserva.\n\n`;
    message += `*Datos Personales*\n`;
    message += `- Nombre: ${name}\n`;
    message += `- DNI/Cédula: ${dni}\n`;
    message += `- Nacionalidad: ${nationality}\n`;
    message += `- Teléfono: ${phone}\n\n`;

    message += `*Detalles de la Reserva*\n`;
    if (data.type === 'direct') {
      const dailyPrice = getPriceForPeople(data.dept!, people);
      message += `- Departamento: ${data.dept!.name}\n`;
      message += `- Precio por día (${people} ${people === 1 ? 'persona' : 'personas'}): $${dailyPrice.toLocaleString()}\n`;
    } else {
      message += `- Tipo: Reserva Combinada\n`;
      data.comb!.segments.forEach((seg, i) => {
        const d = departments.find(dep => dep.id === seg.deptId);
        const segDaily = d ? getPriceForPeople(d, people) : 0;
        message += `  ${i + 1}. ${seg.deptName} (${format(seg.checkIn, 'dd/MM')} al ${format(seg.checkOut, 'dd/MM')}) - $${segDaily.toLocaleString()}/día\n`;
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
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl w-full max-w-2xl p-6 md:p-8 relative my-auto shadow-2xl transition-colors" onClick={e => e.stopPropagation()}>
        <button onClick={() => { onClose(); if (sent) window.location.reload(); }} className="absolute top-6 right-6 p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white cursor-pointer">
          <X className="w-5 h-5" />
        </button>

        {sent ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center mb-5">
              <svg className="w-10 h-10 text-green-500 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">¡Solicitud enviada!</h2>
            <p className="text-slate-600 dark:text-slate-300 max-w-sm mb-2">
              Gracias por elegir Alojamientos Di&apos;Arte. Tu solicitud fue registrada exitosamente.
            </p>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mb-6">
              📱 Te contactaremos por WhatsApp a la brevedad para <strong>confirmar tu reserva</strong>. Recordá que las fechas quedan bloqueadas únicamente luego de recibir el adelanto de $10.000.
            </p>
            <button
              onClick={() => { onClose(); window.location.reload(); }}
              className="px-8 py-3 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-2xl transition-colors shadow-lg cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
              <CalendarDays className="w-6 h-6 text-sky-500" />
              Solicitud de Reserva
            </h2>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre Completo</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all" placeholder="Ej. Juan Pérez" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">DNI / Cédula de Identidad</label>
              <input type="text" value={dni} onChange={e => setDni(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all" placeholder="Número de documento" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nacionalidad</label>
              <input type="text" value={nationality} onChange={e => setNationality(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Teléfono</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value.replace(/[^\d+\s\-()]/g, ''))} inputMode="tel" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all" placeholder="Ej. +54 9 351..." />
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/80 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 transition-colors">
            <h3 className="font-semibold text-slate-800 dark:text-white mb-3 text-sm uppercase tracking-wider">Detalles de la estadía</h3>
            <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-xs mb-0.5">Fechas seleccionadas</span>
                <span className="font-medium text-slate-900 dark:text-white">{format(data.checkIn, "dd/MM/yyyy")} al {format(data.checkOut, "dd/MM/yyyy")}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-xs mb-0.5">Cantidad de noches</span>
                <span className="font-medium text-slate-900 dark:text-white">{nights} {nights === 1 ? 'noche' : 'noches'}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-xs mb-1">Cantidad de personas</span>
                <select value={people} onChange={e => setPeople(Number(e.target.value))} className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-sky-500 bg-white dark:bg-slate-900 text-slate-800 dark:text-white font-medium">
                  {Array.from({ length: maxPeople }).map((_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1} {i + 1 === 1 ? 'persona' : 'personas'}</option>
                  ))}
                </select>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-xs mb-1">Cochera</span>
                <label className="flex items-center gap-2 mt-1 cursor-pointer">
                  <input type="checkbox" checked={garage} onChange={e => setGarage(e.target.checked)} className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300 dark:border-slate-600" />
                  <span className="text-slate-700 dark:text-slate-300">Necesita cochera</span>
                </label>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <span className="text-slate-800 dark:text-white font-semibold mb-2 block text-sm uppercase tracking-wider">Alojamiento</span>
              {data.type === 'direct' ? (() => {
                const parsedImages = parseDeptImages(data.dept?.images);
                const dailyPrice = getPriceForPeople(data.dept!, people);
                const stayPrice = dailyPrice * nights;
                
                return (
                  <div 
                    className="flex justify-between items-center bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-100 dark:border-slate-700 cursor-pointer hover:border-sky-300 dark:hover:border-sky-500 transition-colors group shadow-xs"
                    onClick={() => onSelectDept({ dept: data.dept!, parsedImages })}
                  >
                    <div className="flex items-center gap-3">
                      {parsedImages[0] && <img src={parsedImages[0]} alt={data.dept!.name} className="w-12 h-12 rounded-lg object-cover" />}
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors block text-sm">{data.dept!.name}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs font-semibold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-500/15 px-2 py-0.5 rounded-md">
                            ${dailyPrice.toLocaleString()} / día
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">({people} {people === 1 ? 'persona' : 'personas'})</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-900 dark:text-white text-base font-bold block">${stayPrice.toLocaleString()}</span>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">total {nights} {nights === 1 ? 'noche' : 'noches'}</span>
                    </div>
                  </div>
                );
              })() : (
                <div className="space-y-2">
                  {data.comb!.segments.map((seg, i) => {
                    const d = departments.find(dep => dep.id === seg.deptId);
                    const segDailyPrice = d ? getPriceForPeople(d, people) : 0;
                    const segPrice = segDailyPrice * seg.nights;
                    const parsedImages = d ? parseDeptImages(d.images) : [];

                    return (
                      <div 
                        key={i} 
                        className="flex justify-between items-center bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-700 cursor-pointer hover:border-sky-300 dark:hover:border-sky-500 transition-colors group"
                        onClick={() => d && onSelectDept({ dept: d, parsedImages })}
                      >
                        <div className="flex items-center gap-3">
                          {parsedImages[0] && <img src={parsedImages[0]} alt={seg.deptName} className="w-10 h-10 rounded-lg object-cover" />}
                          <div>
                            <span className="font-medium text-slate-800 dark:text-white block text-sm group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">{seg.deptName}</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">${segDailyPrice.toLocaleString()}/día • {seg.nights} noche(s)</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-900 dark:text-white text-sm font-bold block">${segPrice.toLocaleString()}</span>
                          <span className="text-xs text-slate-400 dark:text-slate-500">{seg.nights} noche(s)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <span className="text-slate-900 dark:text-white font-bold block text-sm">Precio Total</span>
                {data.type === 'direct' && (
                  <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5 font-medium">
                    ${(getPriceForPeople(data.dept!, people)).toLocaleString()}/día × {nights} {nights === 1 ? 'noche' : 'noches'}
                  </span>
                )}
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-sky-600 dark:text-sky-400">${totalPrice.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="bg-sky-50/50 dark:bg-sky-950/40 p-4 rounded-xl border border-sky-100 dark:border-sky-900/50 text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-3 max-h-48 overflow-y-auto custom-scrollbar">
            <p><strong>¡Gracias por elegirnos para tu estadía!</strong> Para poder confirmar y asegurar tu reserva, te pedimos un depósito o transferencia previa de <strong>$10.000</strong>. Este adelanto nos permite bloquear las fechas exclusivamente para vos. El resto del monto se abona al momento del ingreso, descontando obviamente lo ya abonado.</p>
            <p>Te contamos que trabajamos así porque no contamos con garantías en caso de que los huéspedes no se presenten, lo que nos genera pérdidas al tener esas fechas bloqueadas. En cambio, si preferís, también tenemos la opción de reservar por Airbnb, donde el pago se gestiona directamente por la plataforma y no hace falta adelantar el depósito.</p>
            <p>Como detalle importante, te contamos que los cambios de fecha pueden realizarse con al menos 5 días de anticipación, así podemos organizarnos mejor y ofrecer una buena experiencia tanto a vos como a los siguientes huéspedes.</p>
          </div>

          <button
            onClick={handleReserve}
            disabled={!name.trim() || !dni.trim() || !phone.trim()}
            className="w-full py-4 bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-bold text-lg shadow-lg shadow-green-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
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
