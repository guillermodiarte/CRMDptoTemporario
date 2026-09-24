"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Department, Reservation } from "@prisma/client";
import { format, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarIcon, RotateCcw, Moon, Banknote, CreditCard, Check, Clock } from "lucide-react";
import { formatNumber, cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { type DateRange } from "react-day-picker";

const formSchema = z.object({
  departmentId: z.string().min(1, "Departamento requerido"),
  guestName: z.string().min(2, "Nombre requerido"),
  guestPhone: z.string().optional(),
  guestDni: z.string().optional(),
  guestPeopleCount: z.coerce.number().min(0),
  bedsRequired: z.coerce.number().min(0).default(0),
  checkIn: z.string(),
  checkOut: z.string(),
  totalAmount: z.coerce.number().min(0, "Monto requerido"),
  depositAmount: z.coerce.number().default(0),
  heatingFee: z.coerce.number().default(0), // Removed? No, waiting.
  cleaningFee: z.coerce.number().default(0),
  amenitiesFee: z.coerce.number().default(0),
  currency: z.enum(["ARS", "USD"]).default("ARS"),
  paymentStatus: z.enum(["PAID", "PARTIAL", "UNPAID", "CANCELLED"]).default("UNPAID"),
  status: z.string().optional(),
  source: z.enum(["AIRBNB", "BOOKING", "DIRECT"]).default("DIRECT"),
  hasParking: z.boolean().default(false),
  notes: z.string().optional(),
}).refine((data) => {
  const start = new Date(data.checkIn);
  const end = new Date(data.checkOut);
  return end > start;
}, {
  message: "El egreso debe ser posterior al ingreso",
  path: ["checkOut"],
});

interface ReservationFormProps {
  departments: Department[];
  setOpen: (open: boolean) => void;
  defaultDepartmentId?: string;
  defaultDate?: Date;
  initialData?: any; // Relaxed type to include relations if needed
  onDirectCreated?: (info: {
    departmentName?: string;
    checkIn: string | Date;
    checkOut: string | Date;
  }) => void;
  onReservationCreated?: (info: {
    source: 'DIRECT' | 'BOOKING' | 'AIRBNB';
    departmentName?: string;
    checkIn: string | Date;
    checkOut: string | Date;
  }) => void;
  showPaymentTracking?: boolean;
  paymentReceivers?: { id: string; name: string; accountInfo?: string | null; isDefault: boolean }[];
}

export function ReservationForm({ departments, setOpen, defaultDepartmentId, defaultDate, initialData, onDirectCreated, onReservationCreated, showPaymentTracking = false, paymentReceivers = [] }: ReservationFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [overlapWarning, setOverlapWarning] = useState(false);
  const [capacityWarning, setCapacityWarning] = useState(false);
  const [bedWarning, setBedWarning] = useState(false);
  const [blacklistWarning, setBlacklistWarning] = useState<{ name: string; reason: string } | null>(null);
  const [pendingValues, setPendingValues] = useState<z.infer<typeof formSchema> | null>(null);
  const [amenitiesCost, setAmenitiesCost] = useState(initialData?.amenitiesFee || 0);
  const [globalCleaningFee, setGlobalCleaningFee] = useState<number | null>(null);
  const [isTotalManuallyModified, setIsTotalManuallyModified] = useState(!!(initialData?.totalAmount && initialData.totalAmount > 0));
  // Track if user manually changed payment status (so Airbnb→other doesn't reset a deliberate choice)
  const [isPaymentStatusUserModified, setIsPaymentStatusUserModified] = useState(false);
  // Deposit & Payment tracking (payment balance system)
  const [depositMethod, setDepositMethod] = useState<'CASH' | 'TRANSFER' | null>(
    initialData?.depositMethod || (initialData ? null : 'TRANSFER')
  );
  const [depositReceiverId, setDepositReceiverId] = useState<string | null>(() => {
    if (!showPaymentTracking) return null;
    return initialData?.depositReceiverId || paymentReceivers.find(r => r.isDefault)?.id || paymentReceivers[0]?.id || null;
  });

  const [finalPaymentMethod, setFinalPaymentMethod] = useState<'CASH' | 'TRANSFER' | null>(
    initialData?.paymentMethod || null
  );
  const [finalPaymentReceiverId, setFinalPaymentReceiverId] = useState<string | null>(() => {
    if (!showPaymentTracking) return null;
    return initialData?.paymentReceiverId || paymentReceivers.find(r => r.isDefault)?.id || null;
  });

  // ─── Single Calendar Date Range Picker State ───
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);

  // Initialize Type
  const initialType = (initialData?.department as any)?.type ||
    (defaultDepartmentId ? departments.find(d => d.id === defaultDepartmentId && (d as any).type)?.type ?? (departments.find(d => d.id === defaultDepartmentId) as any)?.type : "APARTMENT") as "APARTMENT" | "PARKING";

  // Safe fallback if 'type' is missing in department object (e.g. older fetches), though prisma include should have it.
  // Actually, 'departments' prop might not have 'type' if checkIn page request didn't verify it.
  // app/dashboard/reservations/page.tsx: prisma.department.findMany() -> returns all fields including type.

  const [unitType, setUnitType] = useState<"APARTMENT" | "PARKING">(initialType || "APARTMENT");

  const filteredDepartments = departments.filter(d => ((d as any).type || "APARTMENT") === unitType);

  // Check if there are any active parking units
  const hasActiveParking = departments.some((d: any) => d.type === "PARKING");

  // Determine if we should fetch current global cost.
  // Rule: Fetch if NEW reservation OR if checkIn date is Today or Future.
  // If it's a past reservation, keep the snapshot (initialData.amenitiesFee).

  useEffect(() => {
    let shouldFetch = true;
    if (initialData) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const checkInDate = new Date(initialData.checkIn);
      // We accept it might be a few hours off due to TZ, but generally "Past" means strictly before today.
      checkInDate.setHours(0, 0, 0, 0);

      if (checkInDate < today) {
        shouldFetch = false;
      }
    }

    if (!shouldFetch) return;

    const fetchSettingsAndSupplies = async () => {
      try {
        const [suppliesRes, settingsRes] = await Promise.all([
          fetch("/api/supplies"),
          fetch("/api/settings")
        ]);

        if (suppliesRes.ok) {
          const data = await suppliesRes.json();
          setAmenitiesCost(data.totalCost || 0);
        }

        if (settingsRes.ok) {
          const data = await settingsRes.json();
          setGlobalCleaningFee(data.cleaningFee || 0);
        }
      } catch (error) {
        console.error(error);
      }
    };

    fetchSettingsAndSupplies();
  }, [initialData]);



  async function checkBlacklist(phone: string): Promise<{ name: string; reason: string } | null> {
    try {
      const res = await fetch(`/api/blacklist?q=${encodeURIComponent(phone)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          return { name: data[0].guestName, reason: data[0].reason };
        }
      }
      return null;
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      departmentId: initialData?.departmentId || defaultDepartmentId || "",
      guestName: initialData?.guestName || "",
      guestPhone: initialData?.guestPhone || "",
      guestDni: initialData?.guestDni || "",
      guestPeopleCount: initialData?.guestPeopleCount || 1,
      bedsRequired: initialData?.bedsRequired || 1,
      checkIn: initialData ? format(new Date(initialData.checkIn), "yyyy-MM-dd") : (defaultDate ? format(defaultDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd")),
      checkOut: initialData ? format(new Date(initialData.checkOut), "yyyy-MM-dd") : (defaultDate ? format(addDays(defaultDate, 1), "yyyy-MM-dd") : format(addDays(new Date(), 1), "yyyy-MM-dd")),
      totalAmount: initialData?.totalAmount ?? 0,
      depositAmount: initialData?.depositAmount || 0,
      cleaningFee: initialData?.cleaningFee || 0,
      amenitiesFee: initialData?.amenitiesFee || 0,
      currency: initialData?.source === "AIRBNB" ? "USD" : ((initialData?.currency as "ARS" | "USD") || "ARS"),
      paymentStatus: (initialData?.paymentStatus as "PAID" | "PARTIAL" | "UNPAID" | "CANCELLED") || "UNPAID",
      source: (initialData?.source as "AIRBNB" | "BOOKING" | "DIRECT") || "DIRECT",
      hasParking: initialData?.hasParking || false,
      notes: initialData?.notes || ""
    },
  });

  // Auto-fill Cleaning Fee and Guest Count from selected Department
  const selectedDepartmentId = form.watch("departmentId");
  useEffect(() => {
    if (!initialData) {
      const dept = departments.find(d => d.id === selectedDepartmentId);
      if (dept) {
        form.setValue("cleaningFee", globalCleaningFee || dept.cleaningFee || 0);
        
        if (dept.maxPeople === 1) {
          form.setValue("guestPeopleCount", 1);
        } else if (dept.maxPeople >= 2) {
          form.setValue("guestPeopleCount", 2);
        }
      }
    }
  }, [selectedDepartmentId, departments, initialData, form]);

  // Auto-fill Beds Required based on Guest Count for new reservations
  const guestCount = form.watch("guestPeopleCount");
  useEffect(() => {
    if (!initialData && unitType !== "PARKING") {
      const p = Number(guestCount) || 1;
      const defaultBeds = p <= 2 ? 1 : Math.max(1, p - 1);
      form.setValue("bedsRequired", defaultBeds);
    }
  }, [guestCount, initialData, unitType, form]);

  // Airbnb Logic
  const source = form.watch("source");
  const prevSourceRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const prevSource = prevSourceRef.current;
    prevSourceRef.current = source;

    if (source === "AIRBNB") {
      form.setValue("currency", "USD");
      // Set PAID and clear the "user modified" flag (Airbnb forces PAID)
      form.setValue("paymentStatus", "PAID");
      setIsPaymentStatusUserModified(false);

      // Only reset totalAmount if we are NOT editing an existing Airbnb reservation
      const isExistingAirbnb = initialData?.source === "AIRBNB";
      if (!isExistingAirbnb) {
        form.setValue("totalAmount", 0);
      }
    } else if (prevSource === "AIRBNB" && !isPaymentStatusUserModified) {
      // Switched away from Airbnb and user never manually chose a status → restore UNPAID
      form.setValue("paymentStatus", "UNPAID");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  // Default Deposit for Partial Payment & Reset for Unpaid
  const paymentStatus = form.watch("paymentStatus");
  useEffect(() => {
    if (paymentStatus === "PARTIAL") {
      const currentDeposit = form.getValues("depositAmount");
      // Only set default if currently 0 (to avoid overwriting user input if they toggle back and forth)
      if (currentDeposit === 0) {
        form.setValue("depositAmount", 10000);
      }
      // Ensure deposit method defaults to TRANSFER
      if (!depositMethod) {
        setDepositMethod("TRANSFER");
      }
      if (!depositReceiverId && showPaymentTracking) {
        const defaultRecv = paymentReceivers.find(r => r.isDefault)?.id || paymentReceivers[0]?.id || null;
        if (defaultRecv) setDepositReceiverId(defaultRecv);
      }
    } else if (paymentStatus === "UNPAID") {
      form.setValue("depositAmount", 0);
    }
  }, [paymentStatus, form, depositMethod, depositReceiverId, showPaymentTracking, paymentReceivers]);

  // Auto-calculate Total Amount based on Prices * Nights
  const checkInDate = form.watch("checkIn");
  const checkOutDate = form.watch("checkOut");
  const guestPeopleCount = form.watch("guestPeopleCount");

  const calculatedNights = useMemo(() => {
    if (!checkInDate || !checkOutDate) return 0;
    try {
      const [y1, m1, d1] = checkInDate.split("-").map(Number);
      const [y2, m2, d2] = checkOutDate.split("-").map(Number);
      if (!y1 || !y2) return 0;
      const start = new Date(y1, m1 - 1, d1);
      const end = new Date(y2, m2 - 1, d2);
      const diffTime = end.getTime() - start.getTime();
      if (diffTime <= 0) return 0;
      return Math.round(diffTime / (1000 * 60 * 60 * 24));
    } catch {
      return 0;
    }
  }, [checkInDate, checkOutDate]);

  const parseDateString = (str?: string) => {
    if (!str) return undefined;
    const [y, m, d] = str.split("-").map(Number);
    if (!y || !m || !d) return undefined;
    return new Date(y, m - 1, d, 12, 0, 0);
  };

  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const from = parseDateString(form.getValues("checkIn"));
    const to = parseDateString(form.getValues("checkOut"));
    return from ? { from, to } : undefined;
  });

  useEffect(() => {
    const from = parseDateString(checkInDate);
    const to = parseDateString(checkOutDate);
    if (from && to) {
      setDateRange({ from, to });
    } else if (from) {
      setDateRange({ from, to: undefined });
    } else {
      setDateRange(undefined);
    }
  }, [checkInDate, checkOutDate]);

  // We are awaiting checkout if checkIn is set, BUT checkOut is empty / not selected yet.
  const isAwaitingCheckout = Boolean(checkInDate && !checkOutDate);

  const handleDayClick = (day: Date) => {
    if (!isAwaitingCheckout) {
      // PRIMER CLICK (siempre):
      // Establece el check-in y BORRA el check-out para esperar al segundo click
      const formattedCheckIn = format(day, "yyyy-MM-dd");
      setDateRange({ from: day, to: undefined });
      form.setValue("checkIn", formattedCheckIn, { shouldValidate: true });
      form.setValue("checkOut", "", { shouldValidate: true });
    } else {
      // SEGUNDO CLICK:
      const currentFrom = dateRange?.from || parseDateString(form.getValues("checkIn"));
      if (currentFrom && day > currentFrom) {
        // Establece el checkout y cierra automáticamente el popover
        const formattedCheckOut = format(day, "yyyy-MM-dd");
        setDateRange({ from: currentFrom, to: day });
        form.setValue("checkOut", formattedCheckOut, { shouldValidate: true });
        setTimeout(() => setIsDatePopoverOpen(false), 180);
      } else {
        // El usuario hizo click en la misma fecha o una anterior -> cambia el check-in y el check-out sigue borrado
        const formattedCheckIn = format(day, "yyyy-MM-dd");
        setDateRange({ from: day, to: undefined });
        form.setValue("checkIn", formattedCheckIn, { shouldValidate: true });
        form.setValue("checkOut", "", { shouldValidate: true });
      }
    }
  };

  const handleClearDates = () => {
    setDateRange(undefined);
    form.setValue("checkIn", "", { shouldValidate: true });
    form.setValue("checkOut", "", { shouldValidate: true });
  };

  // Ref to trigger for auto-centering calendar on mobile screen
  const dateTriggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isDatePopoverOpen) {
      const timer = setTimeout(() => {
        if (!dateTriggerRef.current) return;
        const dialogContent = (dateTriggerRef.current.closest("[data-slot='dialog-content']") ||
          dateTriggerRef.current.closest(".overflow-y-auto")) as HTMLElement | null;

        if (dialogContent) {
          const triggerRect = dateTriggerRef.current.getBoundingClientRect();
          const dialogRect = dialogContent.getBoundingClientRect();
          const relativeTop = triggerRect.top - dialogRect.top + dialogContent.scrollTop;

          // Desired offset from top of dialog to place the trigger + calendar in vertical center
          const idealTopOffset = Math.max(50, Math.round((dialogContent.clientHeight - 480) / 2));
          const targetScroll = Math.max(0, Math.round(relativeTop - idealTopOffset));

          dialogContent.scrollTo({
            top: targetScroll,
            behavior: "smooth",
          });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isDatePopoverOpen]);

  // Midnight today (local) used to mark past days in the calendar
  const calendarToday = new Date();
  calendarToday.setHours(0, 0, 0, 0);

  const recalculateAutoTotal = () => {
    setIsTotalManuallyModified(false);
    if (!selectedDepartmentId || !checkInDate || !checkOutDate) return;

    const start = new Date(checkInDate);
    const end = new Date(checkOutDate);
    if (start >= end) return;

    const diffTime = Math.abs(end.getTime() - start.getTime());
    const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const dept = departments.find(d => d.id === selectedDepartmentId);
    if (dept) {
      let pricePerNight = dept.basePrice || 0;
      let pricesObj: Record<string, number> = {};
      try {
        if ((dept as any).prices) {
          pricesObj = JSON.parse((dept as any).prices);
        }
      } catch {}

      if (pricesObj[guestPeopleCount] !== undefined && pricesObj[guestPeopleCount] > 0) {
        pricePerNight = pricesObj[guestPeopleCount];
      }

      const newTotal = nights * pricePerNight;
      form.setValue("totalAmount", newTotal);
    }
  };

  useEffect(() => {
    // Skip auto-calc for Airbnb (manual pricing or 0)
    if (source === "AIRBNB") return;

    if (!selectedDepartmentId || !checkInDate || !checkOutDate) return;

    // Prevent overwriting existing data on form load
    if (initialData) {
      const initCheckIn = format(new Date(initialData.checkIn), "yyyy-MM-dd");
      const initCheckOut = format(new Date(initialData.checkOut), "yyyy-MM-dd");
      if (
        initialData.departmentId === selectedDepartmentId &&
        initCheckIn === checkInDate &&
        initCheckOut === checkOutDate &&
        initialData.guestPeopleCount === guestPeopleCount
      ) {
        return;
      }
    }

    // Do NOT overwrite total if user manually typed or modified the price
    if (isTotalManuallyModified) {
      return;
    }

    const start = new Date(checkInDate);
    const end = new Date(checkOutDate);

    if (start >= end) return;

    const diffTime = Math.abs(end.getTime() - start.getTime());
    const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const dept = departments.find(d => d.id === selectedDepartmentId);
    if (dept) {
      let pricePerNight = dept.basePrice || 0;
      let pricesObj: Record<string, number> = {};
      try {
        if ((dept as any).prices) {
          pricesObj = JSON.parse((dept as any).prices);
        }
      } catch {}

      if (pricesObj[guestPeopleCount] !== undefined && pricesObj[guestPeopleCount] > 0) {
        pricePerNight = pricesObj[guestPeopleCount];
      }

      const newTotal = nights * pricePerNight;
      form.setValue("totalAmount", newTotal);
    }
  }, [selectedDepartmentId, checkInDate, checkOutDate, guestPeopleCount, departments, form, source, initialData, isTotalManuallyModified]);

  async function onSubmit(values: z.infer<typeof formSchema>, forceOverlap: boolean = false, ignoreCapacity: boolean = false, forceBlacklist: boolean = false) {
    setLoading(true);
    setOverlapWarning(false);
    setCapacityWarning(false);
    setBlacklistWarning(null);

    // Blacklist Check
    if (!forceBlacklist && values.guestPhone) {
      const blacklistMatch = await checkBlacklist(values.guestPhone);
      if (blacklistMatch) {
        setBlacklistWarning(blacklistMatch);
        setPendingValues(values);
        setLoading(false);
        return;
      }
    }

    // Capacity Check
    // Capacity Check - Skipped for Parking
    if (!ignoreCapacity && unitType !== 'PARKING') {
      const dept = departments.find(d => d.id === values.departmentId);
      if (dept) {
        if (values.guestPeopleCount > dept.maxPeople) {
          setCapacityWarning(true);
          setPendingValues(values);
          setLoading(false);
          return;
        }
        // Bed Check (New)
        if (values.bedsRequired > dept.bedCount) {
          setBedWarning(true);
          setPendingValues(values);
          setLoading(false);
          return;
        }
      }
    }

    try {
      const url = initialData ? `/api/reservations/${initialData.id}` : "/api/reservations";
      const method = initialData ? "PATCH" : "POST";

      let resolvedStatus = initialData?.status;
      if (values.paymentStatus === "CANCELLED") {
        resolvedStatus = "CANCELLED";
      } else {
        if (!resolvedStatus || resolvedStatus === "CANCELLED") {
          resolvedStatus = "CONFIRMED";
        }
      }

      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          status: resolvedStatus,
          guestPeopleCount: unitType === 'PARKING' ? 0 : values.guestPeopleCount,
          bedsRequired: unitType === 'PARKING' ? 0 : values.bedsRequired,
          amenitiesFee: unitType === 'PARKING' ? 0 : amenitiesCost,
          force: forceOverlap,
          // Deposit tracking fields (only when feature is enabled)
          ...(showPaymentTracking && values.paymentStatus === 'PARTIAL' && depositMethod ? {
            depositMethod,
            depositReceiverId: depositMethod === 'TRANSFER' ? depositReceiverId : null,
          } : {}),
          // Final payment tracking fields (only when feature is enabled)
          ...(showPaymentTracking && values.paymentStatus === 'PAID' && finalPaymentMethod ? {
            paymentMethod: finalPaymentMethod,
            paymentReceiverId: finalPaymentMethod === 'TRANSFER' ? finalPaymentReceiverId : null,
          } : {})
        }),
      });

      if (res.status === 409) {
        setOverlapWarning(true);
        setPendingValues(values);
        setLoading(false);
        return;
      }

      if (!res.ok) throw new Error("Error creando reserva");

      const isNewReservation = !initialData;
      const createdCheckIn = values.checkIn;
      const createdCheckOut = values.checkOut;
      const createdSource = (values.source || 'DIRECT').toString().trim().toUpperCase();
      const deptName = departments.find(d => d.id === values.departmentId)?.name;

      router.refresh();
      setOpen(false);
      form.reset();

      if (isNewReservation) {
        if (onReservationCreated) {
          onReservationCreated({
            source: createdSource as 'DIRECT' | 'BOOKING' | 'AIRBNB',
            departmentName: deptName || 'Departamento',
            checkIn: createdCheckIn,
            checkOut: createdCheckOut,
          });
        } else if (createdSource === 'DIRECT' && onDirectCreated) {
          onDirectCreated({
            departmentName: deptName || 'Departamento',
            checkIn: createdCheckIn,
            checkOut: createdCheckOut,
          });
        }
      }
    } catch (error) {
      console.error(error);
      // alert("Error al guardar reserva"); 
      setLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((v) => onSubmit(v, false))} className="space-y-4">

        {/* Type Selector */}
        {!initialData && (
          <Tabs value={unitType} onValueChange={(v) => {
            setUnitType(v as any);
            form.setValue("departmentId", ""); // Clear selection on switch
            // Adjust defaults
            if (v === "PARKING") {
              form.setValue("guestPeopleCount", 0);
              form.setValue("bedsRequired", 0);
              form.setValue("amenitiesFee", 0);
            } else {
              form.setValue("guestPeopleCount", 1);
              form.setValue("bedsRequired", 1);
            }
          }} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="APARTMENT">Departamento</TabsTrigger>
              <TabsTrigger
                value="PARKING"
                disabled={!hasActiveParking}
                className={!hasActiveParking ? "line-through opacity-50 cursor-not-allowed" : ""}
              >
                Cochera
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}



        {/* Two-Column Responsive Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 items-start">
          {/* LEFT COLUMN: Datos de la Reserva y Huésped */}
          <div className="space-y-2.5">
            {/* Departamento / Cochera y Plataforma */}
            {/* On mobile: depto on its own row, then platform buttons below */}
            {/* On sm+: two-col grid as before */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <FormField
                control={form.control}
                name="departmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{unitType === "PARKING" ? "Cochera" : "Departamento"}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={unitType === "PARKING" ? "Seleccione cochera" : "Seleccione depto"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredDepartments.map((d) => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plataforma</FormLabel>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { value: "DIRECT", label: "Directo", img: "/icons/direct.png" },
                        { value: "BOOKING", label: "Booking", img: "/icons/booking.png" },
                        { value: "AIRBNB", label: "Airbnb", img: "/icons/airbnb.png" },
                      ].map((opt) => {
                        const isSelected = (field.value || "DIRECT") === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => field.onChange(opt.value)}
                            className={cn(
                              "relative flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl border-2 transition-all cursor-pointer select-none",
                              isSelected
                                ? "border-primary bg-primary/5 dark:bg-primary/10 shadow-sm"
                                : "border-border bg-background hover:border-primary/40 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                            )}
                          >
                            <img
                              src={opt.img}
                              alt={opt.label}
                              className="h-6 w-6 object-contain"
                            />
                            <span className={cn(
                              "text-[10px] font-semibold",
                              isSelected ? "text-primary" : "text-muted-foreground"
                            )}>
                              {opt.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

            </div>


            {/* Fechas de Estadía (Rango de Ingreso y Egreso en un solo calendario) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <FormLabel className="text-xs font-semibold text-foreground">Fechas de Estadía</FormLabel>
                {calculatedNights > 0 && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80">
                    <Moon className="w-3 h-3 text-indigo-500 dark:text-indigo-400" />
                    {calculatedNights} {calculatedNights === 1 ? "noche" : "noches"}
                  </span>
                )}
              </div>

              <Popover open={isDatePopoverOpen} onOpenChange={setIsDatePopoverOpen}>
                <PopoverTrigger asChild>
                  <div
                    ref={dateTriggerRef}
                    className={cn(
                      "grid grid-cols-2 gap-2 p-1 rounded-xl border border-input bg-background hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-all shadow-xs",
                      isDatePopoverOpen && "ring-2 ring-primary border-primary",
                      (form.formState.errors.checkIn || form.formState.errors.checkOut) && "border-destructive ring-1 ring-destructive"
                    )}
                  >
                    {/* Ingreso Card */}
                    <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                      <CalendarIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <div className="min-w-0 text-left flex-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                          Ingreso
                        </span>
                        <span className="text-sm font-bold text-foreground block truncate">
                          {checkInDate ? format(parseDateString(checkInDate)!, "dd/MM/yyyy") : "Seleccionar"}
                        </span>
                      </div>
                    </div>

                    {/* Egreso Card */}
                    <div
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors",
                        isAwaitingCheckout && "ring-2 ring-primary/80 bg-primary/5 dark:bg-primary/10"
                      )}
                    >
                      <CalendarIcon className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                      <div className="min-w-0 text-left flex-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                          {isAwaitingCheckout ? "Elegir Salida" : "Egreso"}
                        </span>
                        <span
                          className={cn(
                            "text-sm font-bold block truncate",
                            checkOutDate ? "text-foreground" : "text-muted-foreground italic font-normal"
                          )}
                        >
                          {checkOutDate ? format(parseDateString(checkOutDate)!, "dd/MM/yyyy") : "Seleccionar"}
                        </span>
                      </div>
                    </div>
                  </div>
                </PopoverTrigger>

                <PopoverContent
                  className="p-0 z-50 shadow-2xl rounded-2xl border border-border/80 overflow-hidden"
                  style={{ width: "var(--radix-popover-trigger-width)" }}
                  align="start"
                  sideOffset={6}
                >
                  <div className="w-full">
                  {/* Calendar Header */}
                  <div className="p-3 border-b bg-muted/40 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="font-semibold block text-foreground">Seleccionar fechas de estadía</span>
                      <span className="text-muted-foreground text-[11px]">
                        {!checkInDate
                          ? "1. Haz clic en el día de ingreso"
                          : !checkOutDate
                          ? "2. Haz clic en el día de egreso"
                          : `${calculatedNights} ${calculatedNights === 1 ? "noche seleccionada" : "noches seleccionadas"}`}
                      </span>
                    </div>
                    {checkInDate && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClearDates();
                        }}
                      >
                        Limpiar
                      </Button>
                    )}
                  </div>

                  <div className="p-2.5 sm:p-3 w-full">
                    <Calendar
                      mode="range"
                      defaultMonth={dateRange?.from || new Date()}
                      selected={dateRange}
                      onSelect={() => {}}
                      onDayClick={handleDayClick}
                      numberOfMonths={1}
                      locale={es}
                      initialFocus
                      modifiers={{ past: (date) => date < calendarToday }}
                      modifiersClassNames={{
                        past: "line-through opacity-40 text-muted-foreground",
                      }}
                      className="w-full p-0"
                    />
                  </div>

                  {/* Quick Shortcuts — shown after first click (awaiting checkout) */}
                  {isAwaitingCheckout && dateRange?.from && (
                    <div className="px-3 pb-2 flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-muted-foreground font-medium">Estadía rápida:</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6 text-[11px] px-2.5 py-0"
                        onClick={() => {
                          if (!dateRange?.from) return;
                          const to = addDays(dateRange.from, 1);
                          setDateRange({ from: dateRange.from, to });
                          form.setValue("checkOut", format(to, "yyyy-MM-dd"), { shouldValidate: true });
                          setTimeout(() => setIsDatePopoverOpen(false), 180);
                        }}
                      >
                        1 noche
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6 text-[11px] px-2.5 py-0"
                        onClick={() => {
                          if (!dateRange?.from) return;
                          const to = addDays(dateRange.from, 2);
                          setDateRange({ from: dateRange.from, to });
                          form.setValue("checkOut", format(to, "yyyy-MM-dd"), { shouldValidate: true });
                          setTimeout(() => setIsDatePopoverOpen(false), 180);
                        }}
                      >
                        2 noches
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6 text-[11px] px-2.5 py-0"
                        onClick={() => {
                          if (!dateRange?.from) return;
                          const to = addDays(dateRange.from, 7);
                          setDateRange({ from: dateRange.from, to });
                          form.setValue("checkOut", format(to, "yyyy-MM-dd"), { shouldValidate: true });
                          setTimeout(() => setIsDatePopoverOpen(false), 180);
                        }}
                      >
                        7 noches
                      </Button>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="p-2.5 border-t bg-muted/20 flex items-center justify-between text-xs gap-2">
                    <div className="text-muted-foreground text-[11px] truncate">
                      {checkInDate && checkOutDate
                        ? `${format(parseDateString(checkInDate)!, "d 'de' MMMM", { locale: es })} → ${format(parseDateString(checkOutDate)!, "d 'de' MMMM", { locale: es })}`
                        : "Selecciona ambas fechas en el calendario"}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 text-xs px-3"
                      disabled={!checkInDate || !checkOutDate}
                      onClick={() => setIsDatePopoverOpen(false)}
                    >
                      Listo
                    </Button>
                  </div>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Validation errors */}
              {form.formState.errors.checkIn && (
                <p className="text-xs font-medium text-destructive">
                  {form.formState.errors.checkIn.message}
                </p>
              )}
              {form.formState.errors.checkOut && (
                <p className="text-xs font-medium text-destructive">
                  {form.formState.errors.checkOut.message}
                </p>
              )}
            </div>

            {/* Huésped */}
            <FormField
              control={form.control}
              name="guestName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Huésped</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre completo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Teléfono y DNI */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <FormField
                control={form.control}
                name="guestPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="+54 9 11 ..."
                        {...field}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9+\-()\s]/g, "");
                          field.onChange(val);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="guestDni"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>DNI / Cédula <span className="text-xs text-muted-foreground font-normal">(Opcional)</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Número de documento" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Personas y Camas */}
            {unitType !== "PARKING" && (
              <div className="grid grid-cols-2 gap-2.5">
                <FormField
                  control={form.control}
                  name="guestPeopleCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Personas</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          onKeyDown={(e) => ["-", "e", "E"].includes(e.key) && e.preventDefault()}
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bedsRequired"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Camas Nec.</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          onKeyDown={(e) => ["-", "e", "E"].includes(e.key) && e.preventDefault()}
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Requiere Cochera */}
            {unitType !== "PARKING" && (
              <FormField
                control={form.control}
                name="hasParking"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-xl border p-2.5 shadow-2xs bg-blue-50/40 dark:bg-slate-800/60 border-blue-100 dark:border-slate-700">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-0.5 leading-none">
                      <FormLabel className="text-slate-900 dark:text-slate-100 font-semibold cursor-pointer">
                        ¿Requiere Cochera?
                      </FormLabel>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Marcar si el huésped solicita lugar en la cochera.
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            )}

            {/* Notas */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Observaciones o pedidos..." className="resize-none h-20 text-sm" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* RIGHT COLUMN: Estado, Montos y Cobros */}
          <div className="space-y-2.5">
            {/* Tarjeta de Estado y Precios */}
            <div className="p-3.5 rounded-xl border bg-slate-50/70 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 space-y-2.5">
              <FormField
                control={form.control}
                name="paymentStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold text-slate-900 dark:text-slate-100">Estado del Pago</FormLabel>
                    <Select
                      onValueChange={(val) => {
                        field.onChange(val);
                        setIsPaymentStatusUserModified(true);
                      }}
                      value={field.value}
                      disabled={form.watch("source") === "AIRBNB"}
                    >
                      <FormControl>
                        <SelectTrigger className="font-medium">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="UNPAID">Pendiente (Sin Pago)</SelectItem>
                        <SelectItem value="PARTIAL" disabled={form.watch("source") === "AIRBNB"}>Parcial (Con Seña)</SelectItem>
                        <SelectItem value="PAID">Pagado (Total)</SelectItem>
                        <SelectItem value="CANCELLED">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                    {form.watch("source") === "AIRBNB" && <p className="text-[10px] text-muted-foreground mt-0.5">Airbnb es siempre Pagado</p>}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <FormField
                  control={form.control}
                  name="totalAmount"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <FormLabel>Total</FormLabel>
                          {isTotalManuallyModified && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium border border-amber-500/20">
                              Manual
                            </span>
                          )}
                        </div>
                        {isTotalManuallyModified && (
                          <button
                            type="button"
                            onClick={recalculateAutoTotal}
                            className="text-[11px] text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 flex items-center gap-0.5 hover:underline cursor-pointer"
                            title="Calcular automáticamente según noches y personas"
                          >
                            <RotateCcw className="h-2.5 w-2.5" />
                            Auto
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-muted-foreground">$</span>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            onKeyDown={(e) => ["-", "e", "E"].includes(e.key) && e.preventDefault()}
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              // Empty OR any user input = manually modified (prevents auto-refill)
                              setIsTotalManuallyModified(true);
                            }}
                            value={field.value ?? ""}
                            className="font-semibold text-base"
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Moneda</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={form.watch("source") === "AIRBNB"}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ARS">ARS (Pesos)</SelectItem>
                          <SelectItem value="USD">USD (Dólares)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Limpieza e Insumos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 border-t border-slate-200/80 dark:border-slate-800/80">
                <FormField
                  control={form.control}
                  name="cleaningFee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Gasto Limpieza (ARS)</FormLabel>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-muted-foreground">$</span>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            onKeyDown={(e) => ["-", "e", "E"].includes(e.key) && e.preventDefault()}
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {unitType !== "PARKING" && (
                  <FormItem>
                    <FormLabel className="text-xs flex items-center gap-1">
                      Insumos <span className="text-[10px] text-muted-foreground font-normal">(Global)</span>
                    </FormLabel>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-muted-foreground">$</span>
                      <FormControl>
                        <Input
                          type="number"
                          value={amenitiesCost}
                          disabled={true}
                          className="bg-muted text-xs"
                          title="Configurable en Sistema"
                        />
                      </FormControl>
                    </div>
                  </FormItem>
                )}
              </div>
            </div>

            {/* Sección Pendiente (Sin Pago) */}
            {form.watch("paymentStatus") === "UNPAID" && (
              <div className="p-3.5 border rounded-xl space-y-2.5 bg-amber-50/50 border-amber-200/80 dark:bg-amber-950/20 dark:border-amber-900/50 text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold text-xs">
                  <Clock className="h-4 w-4 shrink-0" />
                  <span>Pendiente de Cobro</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  No se registra pago anticipado. El importe total quedará pendiente para cobrar al momento del check-in o ingreso del huésped.
                </p>
                <div className="pt-2 border-t border-amber-200/70 dark:border-amber-900/70 space-y-1">
                  <div className="flex justify-between items-center text-xs font-medium text-muted-foreground">
                    <span>Monto Total:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">${formatNumber(form.watch("totalAmount"))}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-medium text-amber-600 dark:text-amber-400">
                    <span>Resta Cobrar al Ingreso:</span>
                    <span className="font-bold text-sm">${formatNumber(form.watch("totalAmount"))}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Sección de Pago Parcial / Seña */}
            {(form.watch("paymentStatus") === "PARTIAL" || form.watch("paymentStatus") === "CANCELLED") && (
              <div className={`p-3.5 border rounded-xl space-y-2.5 transition-colors ${
                form.watch("paymentStatus") === "CANCELLED"
                  ? "bg-red-50/90 border-red-200 text-red-950 dark:bg-red-950/40 dark:border-red-900/60 dark:text-red-100"
                  : "bg-blue-50/60 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900/60 text-foreground"
              }`}>
                <FormField
                  control={form.control}
                  name="depositAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={form.watch("paymentStatus") === "CANCELLED" ? "text-red-900 dark:text-red-200 font-semibold" : "font-semibold text-blue-950 dark:text-blue-100"}>
                        {form.watch("paymentStatus") === "CANCELLED" ? "Ganancia Seña (Retenido)" : "Monto Abonado (Seña)"}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          onKeyDown={(e) => ["-", "e", "E"].includes(e.key) && e.preventDefault()}
                          {...field}
                          value={field.value ?? ""}
                          className={form.watch("paymentStatus") === "CANCELLED"
                            ? "bg-white dark:bg-slate-900/90 border-red-200 dark:border-red-900/70 text-slate-900 dark:text-white font-medium focus-visible:ring-red-500"
                            : "bg-background font-semibold text-base"
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Deposit tracking: method + receiver (only for PARTIAL + tracking enabled) */}
                {showPaymentTracking && form.watch("paymentStatus") === "PARTIAL" && form.watch("source") !== "AIRBNB" && (
                  <div className="space-y-2 pt-1 border-t border-blue-200/70 dark:border-blue-900/70">
                    <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                      ¿Cómo se recibió la seña?
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setDepositMethod('CASH')}
                        className={`flex items-center gap-2 p-2 rounded-lg border-2 text-xs font-medium transition-all cursor-pointer ${
                          depositMethod === 'CASH'
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-emerald-300'
                        }`}
                      >
                        <Banknote className="h-3.5 w-3.5 shrink-0" />
                        <span>Efectivo</span>
                        {depositMethod === 'CASH' && <Check className="h-3 w-3 ml-auto text-emerald-500" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDepositMethod('TRANSFER')}
                        className={`flex items-center gap-2 p-2 rounded-lg border-2 text-xs font-medium transition-all cursor-pointer ${
                          depositMethod === 'TRANSFER'
                            ? 'border-blue-500 bg-blue-100/70 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 font-semibold'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-blue-300'
                        }`}
                      >
                        <CreditCard className="h-3.5 w-3.5 shrink-0" />
                        <span>Transferencia</span>
                        {depositMethod === 'TRANSFER' && <Check className="h-3 w-3 ml-auto text-blue-500" />}
                      </button>
                    </div>

                    {/* Receiver selector as Select dropdown */}
                    {depositMethod === 'TRANSFER' && paymentReceivers.length > 0 && (
                      <div className="space-y-1 pt-0.5">
                        <FormLabel className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">¿Quién recibió la seña?</FormLabel>
                        <Select
                          value={depositReceiverId || ""}
                          onValueChange={(val) => setDepositReceiverId(val)}
                        >
                          <SelectTrigger className="w-full bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-xs h-8">
                            <SelectValue placeholder="Seleccionar receptor / cuenta" />
                          </SelectTrigger>
                          <SelectContent>
                            {paymentReceivers.map((receiver) => (
                              <SelectItem key={receiver.id} value={receiver.id} className="text-xs">
                                {receiver.name} {receiver.accountInfo ? `(${receiver.accountInfo})` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}

                {/* Resumen financiero */}
                <div className="pt-1.5 border-t border-slate-200/80 dark:border-slate-800/80 space-y-1">
                  <div className={`flex justify-between items-center text-xs font-medium ${
                    form.watch("paymentStatus") === "CANCELLED" ? "text-red-900 dark:text-red-200" : "text-muted-foreground"
                  }`}>
                    <span>Monto Total:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">${formatNumber(form.watch("totalAmount"))}</span>
                  </div>
                  {form.watch("paymentStatus") !== "CANCELLED" && (
                    <div className="flex justify-between items-center text-xs font-medium text-red-600 dark:text-red-400">
                      <span>Resta Cobrar:</span>
                      <span className="font-bold text-sm">${formatNumber((form.watch("totalAmount") || 0) - (form.watch("depositAmount") || 0))}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sección de Pago Total (PAGADO) */}
            {showPaymentTracking && form.watch("paymentStatus") === "PAID" && form.watch("source") !== "AIRBNB" && (
              <div className="p-3.5 border rounded-xl space-y-2.5 bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/50">
                <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                  ¿Cómo se recibió el pago?
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFinalPaymentMethod('CASH')}
                    className={`flex items-center gap-2 p-2 rounded-lg border-2 text-xs font-medium transition-all cursor-pointer ${
                      finalPaymentMethod === 'CASH'
                        ? 'border-emerald-500 bg-emerald-100/70 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-semibold'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-emerald-300'
                    }`}
                  >
                    <Banknote className="h-3.5 w-3.5 shrink-0" />
                    <span>Efectivo</span>
                    {finalPaymentMethod === 'CASH' && <Check className="h-3 w-3 ml-auto text-emerald-500" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFinalPaymentMethod('TRANSFER')}
                    className={`flex items-center gap-2 p-2 rounded-lg border-2 text-xs font-medium transition-all cursor-pointer ${
                      finalPaymentMethod === 'TRANSFER'
                        ? 'border-blue-500 bg-blue-100/70 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 font-semibold'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-blue-300'
                    }`}
                  >
                    <CreditCard className="h-3.5 w-3.5 shrink-0" />
                    <span>Transferencia</span>
                    {finalPaymentMethod === 'TRANSFER' && <Check className="h-3 w-3 ml-auto text-blue-500" />}
                  </button>
                </div>

                {/* Receiver selector as Select dropdown */}
                {finalPaymentMethod === 'TRANSFER' && paymentReceivers.length > 0 && (
                  <div className="space-y-1 pt-0.5">
                    <FormLabel className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">¿Quién recibió el pago?</FormLabel>
                    <Select
                      value={finalPaymentReceiverId || ""}
                      onValueChange={(val) => setFinalPaymentReceiverId(val)}
                    >
                      <SelectTrigger className="w-full bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-xs h-8">
                        <SelectValue placeholder="Seleccionar receptor / cuenta" />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentReceivers.map((receiver) => (
                          <SelectItem key={receiver.id} value={receiver.id} className="text-xs">
                            {receiver.name} {receiver.accountInfo ? `(${receiver.accountInfo})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="pt-1.5 border-t border-emerald-200/80 dark:border-emerald-900/80 space-y-1">
                  <div className="flex justify-between items-center text-xs font-medium text-emerald-800 dark:text-emerald-300">
                    <span>Monto Total Cobrado:</span>
                    <span className="font-bold text-sm text-emerald-900 dark:text-emerald-200">${formatNumber(form.watch("totalAmount"))}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="min-w-[160px] font-semibold"
          >
            {loading ? "Guardando..." : (initialData ? "Actualizar Reserva" : "Crear Reserva")}
          </Button>
        </div>
      </form>

      <AlertDialog open={bedWarning} onOpenChange={setBedWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exceso de Camas</AlertDialogTitle>
            <AlertDialogDescription>
              La cantidad de camas solicitadas ({pendingValues?.bedsRequired}) supera las disponibles en el departamento.
              ¿Desea continuar de todas formas?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setLoading(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-orange-600 hover:bg-orange-700 text-white" onClick={() => pendingValues && onSubmit(pendingValues, false, true, false)}>
              Sí, Continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={capacityWarning} onOpenChange={setCapacityWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exceso de Capacidad</AlertDialogTitle>
            <AlertDialogDescription>
              La cantidad de personas ({pendingValues?.guestPeopleCount}) supera la capacidad máxima del departamento.
              ¿Desea continuar de todas formas?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setLoading(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-orange-600 hover:bg-orange-700 text-white" onClick={() => pendingValues && onSubmit(pendingValues, false, true, false)}>
              Sí, Continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={overlapWarning} onOpenChange={setOverlapWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conflicto de Fechas</AlertDialogTitle>
            <AlertDialogDescription>
              Las fechas seleccionadas se superponen con otra reserva existente en este departamento.
              ¿Desea forzar la reserva de todas formas?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setLoading(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-yellow-600 hover:bg-yellow-700 text-white" onClick={() => pendingValues && onSubmit(pendingValues, true, true, true)}>
              Sí, Forzar Reserva
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!blacklistWarning} onOpenChange={(val) => !val && setBlacklistWarning(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 flex items-center gap-2">⚠️ Huésped en Lista Negra</AlertDialogTitle>
            <AlertDialogDescription>
              Este huésped <strong>{blacklistWarning?.name}</strong> se encuentra registrado en la lista negra.
              <br /><br />
              <strong>Motivo:</strong> {blacklistWarning?.reason}
              <br /><br />
              ¿Está seguro que desea admitir esta reserva?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setLoading(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={() => pendingValues && onSubmit(pendingValues, false, false, true)}>
              Sí, Admitir (Bajo mi responsabilidad)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Form >
  );
}
