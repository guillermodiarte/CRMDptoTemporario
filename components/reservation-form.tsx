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
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Department, Reservation } from "@prisma/client";
import { format, addDays } from "date-fns";
import { RotateCcw, Moon } from "lucide-react";
import { formatNumber } from "@/lib/utils";

// Removed Alert import

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
}

export function ReservationForm({ departments, setOpen, defaultDepartmentId, defaultDate, initialData, onDirectCreated, onReservationCreated }: ReservationFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [overlapWarning, setOverlapWarning] = useState(false);
  const [capacityWarning, setCapacityWarning] = useState(false);
  const [bedWarning, setBedWarning] = useState(false);
  const [blacklistWarning, setBlacklistWarning] = useState<{ name: string; reason: string } | null>(null);
  const [pendingValues, setPendingValues] = useState<z.infer<typeof formSchema> | null>(null);
  const [amenitiesCost, setAmenitiesCost] = useState(initialData?.amenitiesFee || 0);
  const [globalCleaningFee, setGlobalCleaningFee] = useState<number | null>(null);
  // Initialize as modified if we are editing an existing reservation with a price (to prevent auto-recalc on date/dept change)
  const [isTotalManuallyModified, setIsTotalManuallyModified] = useState(!!(initialData?.totalAmount && initialData.totalAmount > 0));

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
  useEffect(() => {
    if (source === "AIRBNB") {
      form.setValue("currency", "USD");
      form.setValue("paymentStatus", "PAID");

      // Only reset totalAmount if we are NOT editing an existing Airbnb reservation
      const isExistingAirbnb = initialData?.source === "AIRBNB";
      if (!isExistingAirbnb) {
        form.setValue("totalAmount", 0);
      }
    }
  }, [source, form, initialData]);

  // Default Deposit for Partial Payment & Reset for Unpaid
  const paymentStatus = form.watch("paymentStatus");
  useEffect(() => {
    if (paymentStatus === "PARTIAL") {
      const currentDeposit = form.getValues("depositAmount");
      // Only set default if currently 0 (to avoid overwriting user input if they toggle back and forth)
      if (currentDeposit === 0) {
        form.setValue("depositAmount", 10000);
      }
    } else if (paymentStatus === "UNPAID") {
      form.setValue("depositAmount", 0);
    }
  }, [paymentStatus, form]);

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
      } else if (values.paymentStatus !== "CANCELLED") {
        if (!resolvedStatus || resolvedStatus === "CANCELLED") {
          resolvedStatus = "CONFIRMED";
        }
      }

      const res = await fetch(url, {
        method: method,
        body: JSON.stringify({
          ...values,
          status: resolvedStatus,
          guestPeopleCount: unitType === 'PARKING' ? 0 : values.guestPeopleCount,
          bedsRequired: unitType === 'PARKING' ? 0 : values.bedsRequired,
          amenitiesFee: unitType === 'PARKING' ? 0 : amenitiesCost,
          force: forceOverlap
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



        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="departmentId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Departamento</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleccione depto" />
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
        </div>






        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="checkIn"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ingreso</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    {...field}
                    className="cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    onClick={(e) => {
                      try {
                        e.currentTarget.showPicker?.();
                      } catch {}
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="checkOut"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-2">
                  <FormLabel>Egreso</FormLabel>
                  {calculatedNights > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80">
                      <Moon className="w-3 h-3 text-indigo-500 dark:text-indigo-400" />
                      {calculatedNights} {calculatedNights === 1 ? "noche" : "noches"}
                    </span>
                  )}
                </div>
                <FormControl>
                  <Input
                    type="date"
                    {...field}
                    className="cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    onClick={(e) => {
                      try {
                        e.currentTarget.showPicker?.();
                      } catch {}
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div >

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        </div>

        <FormField
          control={form.control}
          name="guestDni"
          render={({ field }) => (
            <FormItem>
              <FormLabel>DNI / Cédula (Opcional)</FormLabel>
              <FormControl>
                <Input placeholder="Número de documento" {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {unitType !== "PARKING" && (
          <FormField
            control={form.control}
            name="hasParking"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-xl border p-4 shadow-xs bg-blue-50/50 dark:bg-slate-800/80 border-blue-100 dark:border-slate-700">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="text-slate-900 dark:text-slate-100 font-semibold">
                    ¿Requiere Cochera?
                  </FormLabel>
                  <FormDescription className="text-slate-500 dark:text-slate-400">
                    Marcar si el huésped solicita lugar en la cochera.
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
        )}

        {unitType !== "PARKING" && (
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="guestPeopleCount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cantidad Personas</FormLabel>
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
                  <FormLabel>Camas Necesarias</FormLabel>
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



        {/* Partial Payment or Cancelled Logic */}
        {
          (form.watch("paymentStatus") === "PARTIAL" || form.watch("paymentStatus") === "CANCELLED") && (
            <div className={`p-4 border rounded-xl space-y-4 transition-colors ${
              form.watch("paymentStatus") === "CANCELLED"
                ? "bg-red-50/90 border-red-200 text-red-950 dark:bg-red-950/40 dark:border-red-900/60 dark:text-red-100"
                : "bg-muted/50 border-border text-foreground"
            }`}>
              <FormField
                control={form.control}
                name="depositAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={form.watch("paymentStatus") === "CANCELLED" ? "text-red-900 dark:text-red-200 font-semibold" : "font-semibold"}>
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
                          : "bg-background"
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className={`flex justify-between items-center text-sm font-medium ${
                form.watch("paymentStatus") === "CANCELLED" ? "text-red-900 dark:text-red-200" : "text-muted-foreground"
              }`}>
                <span>Monto Total:</span>
                <span className="font-semibold text-slate-900 dark:text-white">${formatNumber(form.watch("totalAmount"))}</span>
              </div>
              {form.watch("paymentStatus") !== "CANCELLED" && (
                <div className="flex justify-between items-center text-sm font-medium text-red-600 dark:text-red-400">
                  <span>Restante a Pagar:</span>
                  <span className="font-semibold">${formatNumber((form.watch("totalAmount") || 0) - (form.watch("depositAmount") || 0))}</span>
                </div>
              )}
            </div>
          )
        }

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="cleaningFee"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Gasto de Limpieza (ARS)</FormLabel>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-muted-foreground">$</span>
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
              <FormLabel className="flex items-center gap-2">
                Gasto de Insumos (Global)
                <span className="text-[10px] font-normal text-muted-foreground">(Informativo)</span>
              </FormLabel>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-muted-foreground">$</span>
                <FormControl>
                  <Input
                    type="number"
                    value={amenitiesCost}
                    disabled={true}
                    className="bg-muted"
                    title="Configurable en Sistema"
                  />
                </FormControl>
              </div>
            </FormItem>
          )}

          <FormField
            control={form.control}
            name="totalAmount"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FormLabel>Total</FormLabel>
                    {isTotalManuallyModified && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium border border-amber-500/20">
                        Manual
                      </span>
                    )}
                  </div>
                  {isTotalManuallyModified && (
                    <button
                      type="button"
                      onClick={recalculateAutoTotal}
                      className="text-xs text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 flex items-center gap-1 hover:underline cursor-pointer transition-colors"
                      title="Calcular automáticamente según noches y cantidad de personas"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Auto-calcular
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
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
                        const val = e.target.value;
                        if (val === "") {
                          setIsTotalManuallyModified(false);
                        } else {
                          setIsTotalManuallyModified(true);
                        }
                      }}
                      value={field.value ?? ""}
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
                    <SelectItem value="ARS">ARS</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
                {form.watch("source") === "AIRBNB" && <p className="text-[10px] text-muted-foreground mt-1">Airbnb es siempre USD</p>}
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="paymentStatus"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estado Pago</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={form.watch("source") === "AIRBNB"}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="UNPAID">Pendiente</SelectItem>
                    <SelectItem value="PARTIAL" disabled={form.watch("source") === "AIRBNB"}>Parcial</SelectItem>
                    <SelectItem value="PAID">Pagado</SelectItem>
                    <SelectItem value="CANCELLED">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
                {form.watch("source") === "AIRBNB" && <p className="text-[10px] text-muted-foreground mt-1">Airbnb es siempre Pagado</p>}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="source"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Plataforma</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || "DIRECT"}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar plataforma" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="DIRECT">Directo</SelectItem>
                  <SelectItem value="AIRBNB">Airbnb</SelectItem>
                  <SelectItem value="BOOKING">Booking</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Guardando..." : (initialData ? "Actualizar Reserva" : "Crear Reserva")}
        </Button>
      </form >

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
