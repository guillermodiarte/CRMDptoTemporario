"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Department, Reservation } from "@prisma/client";
import { format, addDays } from "date-fns";

// Removed Alert import

const formSchema = z.object({
  departmentId: z.string().min(1, "Departamento requerido"),
  guestName: z.string().min(2, "Nombre requerido"),
  guestPhone: z.string().optional(),
  guestPeopleCount: z.coerce.number().min(1),
  checkIn: z.string(),
  checkOut: z.string(),
  totalAmount: z.coerce.number().min(0, "Monto requerido"),
  depositAmount: z.coerce.number().default(0),
  cleaningFee: z.coerce.number().default(0), // New field for cleaning expenses
  currency: z.enum(["ARS", "USD"]).default("ARS"),
  paymentStatus: z.enum(["PAID", "PARTIAL", "UNPAID"]).default("UNPAID"),
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
  initialData?: Reservation | null;
}

export function ReservationForm({ departments, setOpen, defaultDepartmentId, defaultDate, initialData }: ReservationFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [overlapWarning, setOverlapWarning] = useState(false);
  const [capacityWarning, setCapacityWarning] = useState(false);
  const [blacklistWarning, setBlacklistWarning] = useState<{ name: string; reason: string } | null>(null);
  const [pendingValues, setPendingValues] = useState<z.infer<typeof formSchema> | null>(null);
  const [amenitiesCost, setAmenitiesCost] = useState(initialData?.amenitiesFee || 0);

  useEffect(() => {
    // Determine if we should fetch current global cost.
    // Rule: Fetch if NEW reservation OR if checkIn date is Today or Future.
    // If it's a past reservation, keep the snapshot (initialData.amenitiesFee).

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

    fetch("/api/supplies")
      .then(res => res.json())
      .then((data: { supplies: any[], totalCost: number }) => {
        // API returns { supplies: [], totalCost: number }
        setAmenitiesCost(data.totalCost || 0);
      })
      .catch(console.error);
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
    } catch (e) {
      console.error(e);
    }
    return null;
  }

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      departmentId: initialData?.departmentId || defaultDepartmentId || "",
      guestName: initialData?.guestName || "",
      guestPhone: initialData?.guestPhone || "",
      guestPeopleCount: initialData?.guestPeopleCount || 1,
      checkIn: initialData ? format(new Date(initialData.checkIn), "yyyy-MM-dd") : (defaultDate ? format(defaultDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd")),
      checkOut: initialData ? format(new Date(initialData.checkOut), "yyyy-MM-dd") : (defaultDate ? format(addDays(defaultDate, 1), "yyyy-MM-dd") : format(addDays(new Date(), 1), "yyyy-MM-dd")),
      totalAmount: initialData?.totalAmount ?? 0,
      depositAmount: initialData?.depositAmount || 0,
      cleaningFee: initialData?.cleaningFee || 0,
      currency: initialData?.source === "AIRBNB" ? "USD" : ((initialData?.currency as "ARS" | "USD") || "ARS"),
      paymentStatus: (initialData?.paymentStatus as "PAID" | "PARTIAL" | "UNPAID") || "UNPAID",
      source: (initialData?.source as "AIRBNB" | "BOOKING" | "DIRECT") || "DIRECT",
      hasParking: initialData?.hasParking || false,
      notes: initialData?.notes || ""
    },
  });

  // Auto-fill Cleaning Fee from selected Department
  const selectedDepartmentId = form.watch("departmentId");
  useEffect(() => {
    if (!initialData && selectedDepartmentId) {
      const dept = departments.find(d => d.id === selectedDepartmentId);
      if (dept) {
        form.setValue("cleaningFee", dept.cleaningFee || 0);
      }
    }
  }, [selectedDepartmentId, departments, initialData, form]);

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

  // Default Deposit for Partial Payment
  const paymentStatus = form.watch("paymentStatus");
  useEffect(() => {
    if (paymentStatus === "PARTIAL") {
      const currentDeposit = form.getValues("depositAmount");
      // Only set default if currently 0 (to avoid overwriting user input if they toggle back and forth)
      if (currentDeposit === 0) {
        form.setValue("depositAmount", 10000);
      }
    }
  }, [paymentStatus, form]);

  // Parking Logic
  // const selectedDepartmentId = form.watch("departmentId"); // Already watched above
  useEffect(() => {
    const selectedDept = departments.find(d => d.id === selectedDepartmentId);
    if (selectedDept && !selectedDept.hasParking) {
      form.setValue("hasParking", false);
    }
  }, [selectedDepartmentId, departments, form]);

  // Auto-calculate Total Amount based on Base Price * Nights
  const checkInDate = form.watch("checkIn");
  const checkOutDate = form.watch("checkOut");

  useEffect(() => {
    // Skip auto-calc for Airbnb (manual pricing or 0)
    if (source === "AIRBNB") return;

    // Only auto-calc for new reservations (or if user changes key params in edit? User said "update", implies edit too?)
    // User said: "al crear la reserva...".
    // "que siga siendo editable".
    // If I do this on EDIT, it might overwrite valid manual changes if dates are touched.
    // Let's restrict to "Active editing of these fields".
    // If initialData exists, maybe we respect it unless they change dates? 
    // Usually if you change dates, price IS recalculated.

    if (!selectedDepartmentId || !checkInDate || !checkOutDate) return;

    // Prevent overwriting existing data on form load
    if (initialData) {
      const initCheckIn = format(new Date(initialData.checkIn), "yyyy-MM-dd");
      const initCheckOut = format(new Date(initialData.checkOut), "yyyy-MM-dd");
      if (
        initialData.departmentId === selectedDepartmentId &&
        initCheckIn === checkInDate &&
        initCheckOut === checkOutDate
      ) {
        return;
      }
    }

    const start = new Date(checkInDate);
    const end = new Date(checkOutDate);

    if (start >= end) return;

    const diffTime = Math.abs(end.getTime() - start.getTime());
    const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const dept = departments.find(d => d.id === selectedDepartmentId);
    if (dept && dept.basePrice) {
      // We set value. This allows overwrite if user types later (as long as dependencies don't re-trigger).
      // Dependencies are date/dept. So if those stay same, user can edit total.
      const newTotal = nights * dept.basePrice;
      form.setValue("totalAmount", newTotal);
    }
  }, [selectedDepartmentId, checkInDate, checkOutDate, departments, form, source]);

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
    if (!ignoreCapacity) {
      const dept = departments.find(d => d.id === values.departmentId);
      if (dept && values.guestPeopleCount > dept.maxPeople) {
        setCapacityWarning(true);
        setPendingValues(values);
        setLoading(false);
        return;
      }
    }

    try {
      const url = initialData ? `/api/reservations/${initialData.id}` : "/api/reservations";
      const method = initialData ? "PATCH" : "POST";

      const res = await fetch(url, {
        method: method,
        body: JSON.stringify({
          ...values,
          amenitiesFee: amenitiesCost,
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

      router.refresh();
      setOpen(false);
      form.reset();
    } catch (error) {
      console.error(error);
      // alert("Error al guardar reserva"); 
      setLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((v) => onSubmit(v, false))} className="space-y-4">



        <FormField
          control={form.control}
          name="departmentId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Departamento</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione depto" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {departments.map((d) => (
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
          name="hasParking"
          render={({ field }) => {
            const selectedDept = departments.find(d => d.id === form.getValues("departmentId"));
            const canHaveParking = selectedDept ? selectedDept.hasParking : true;

            return (
              <FormItem className={`flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 mb-4 ${!canHaveParking ? 'opacity-50' : ''}`}>
                <FormControl>
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={field.onChange}
                    disabled={!canHaveParking}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    ¿Requiere Cochera? {!canHaveParking && "(No disp. en este depto)"}
                  </FormLabel>
                </div>
              </FormItem>
            );
          }}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="checkIn"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ingreso</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
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
                <FormLabel>Egreso</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

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



        {/* Partial Payment Logic */}
        {form.watch("paymentStatus") === "PARTIAL" && (
          <div className="p-4 border rounded-md bg-muted/50 space-y-4">
            <FormField
              control={form.control}
              name="depositAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto Abonado (Seña)</FormLabel>
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
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-between items-center text-sm font-medium">
              <span>Monto Total:</span>
              <span>${form.watch("totalAmount")}</span>
            </div>
            <div className="flex justify-between items-center text-sm font-medium text-red-600">
              <span>Restante a Pagar:</span>
              <span>${(form.watch("totalAmount") || 0) - (form.watch("depositAmount") || 0)}</span>
            </div>
          </div>
        )}

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

          <FormItem>
            <FormLabel>Gasto de Insumos (Global)</FormLabel>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-muted-foreground">$</span>
              <FormControl>
                <Input
                  type="number"
                  value={amenitiesCost}
                  disabled={true}
                  className="bg-muted"
                />
              </FormControl>
            </div>
            <p className="text-[0.8rem] text-muted-foreground">Informativo. Configurable en Sistema.</p>
          </FormItem>

          <FormField
            control={form.control}
            name="totalAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Total</FormLabel>
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
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
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
      </form>

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
    </Form>
  );
}
