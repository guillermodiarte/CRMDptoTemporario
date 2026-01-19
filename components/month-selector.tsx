"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

interface MonthSelectorProps {
  startYear?: number;
  endYear?: number;
}

export function MonthSelector({ startYear = 2026, endYear = 2036 }: MonthSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth(); // 0-11

  // Use raw values directly from URL to drive state, 
  // or just use them as defaultValues if uncontrolled, 
  // but controlled with URL update on change is safer.
  const paramMonth = searchParams.get("month");
  const paramYear = searchParams.get("year");

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  if (!isMounted) return <div className="flex gap-2 h-10 w-[248px]" />; // Placeholder to prevet layout shift

  const month = paramMonth ? paramMonth : currentMonth.toString();
  const year = paramYear ? paramYear : currentYear.toString();

  const handleUpdate = (key: "month" | "year", value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set(key, value);
    router.push(`?${params.toString()}`);
  }

  const months = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  // Dynamic years from props
  const years = Array.from(
    { length: endYear - startYear + 1 },
    (_, i) => (startYear + i).toString()
  );

  return (
    <div className="flex gap-2">
      <Select value={month} onValueChange={(val) => handleUpdate("month", val)}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Mes" />
        </SelectTrigger>
        <SelectContent>
          {months.map((m, i) => (
            <SelectItem key={i} value={i.toString()}>{m}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={year} onValueChange={(val) => handleUpdate("year", val)}>
        <SelectTrigger className="w-[100px]">
          <SelectValue placeholder="Año" />
        </SelectTrigger>
        <SelectContent>
          {years.map((y) => (
            <SelectItem key={y} value={y}>{y}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
