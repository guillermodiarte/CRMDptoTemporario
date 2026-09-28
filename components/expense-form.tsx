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
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Department } from "@prisma/client";
import { formatCurrency } from "@/lib/utils";

const formSchema = z.object({
  type: z.enum(["COMMISSION", "TAX", "SUPPLY"]),
  description: z.string().min(2),
  amount: z.coerce.number().min(0.01),
  quantity: z.coerce.number().optional(),
  unitPrice: z.coerce.number().optional(),
  departmentId: z.string().optional(),
  date: z.string(),
});

type PaymentMode = "cash" | string;

interface ExpenseFormProps {
  departments: Department[];
  setOpen: (open: boolean) => void;
  initialData?: any;
  defaultDate?: Date;
  receivers?: { id: string; name: string; accountInfo?: string | null }[];
  globalCashBalance?: number;
}

export function ExpenseForm({
  departments,
  setOpen,
  initialData,
  defaultDate,
  receivers = [],
  globalCashBalance = 0,
}: ExpenseFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const getInitialMode = (): PaymentMode => {
    if (initialData?.paidFromCash) return "cash";
    if (initialData?.paymentReceiverId || initialData?.paymentReceiver?.id)
      return initialData.paymentReceiverId || initialData.paymentReceiver?.id;
    return "cash";
  };

  const [paymentMode, setPaymentMode] = useState<PaymentMode>(getInitialMode);

  const defaultDateStr = initialData?.date
    ? new Date(initialData.date).toISOString().split("T")[0]
    : defaultDate
      ? defaultDate.toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: initialData
      ? {
          type: initialData.type,
          description: initialData.description,
          amount: initialData.amount,
          quantity: initialData.quantity || 1,
          unitPrice: initialData.unitPrice || 0,
          departmentId: initialData.departmentId || "global",
          date: defaultDateStr,
        }
      : {
          type: "SUPPLY",
          description: "",
          amount: 0,
          quantity: 1,
          unitPrice: 0,
          departmentId: "global",
          date: defaultDateStr,
        },
  });

  const type = form.watch("type");
  const quantity = form.watch("quantity") || 1;
  const unitPrice = form.watch("unitPrice") || 0;
  const amount = form.watch("amount") || 0;

  useEffect(() => {
    if (type === "SUPPLY") {
      const calc = quantity * unitPrice;
      form.setValue("amount", parseFloat(calc.toFixed(2)));
    }
  }, [type, quantity, unitPrice, form]);

  useEffect(() => {
    setPaymentMode(getInitialMode());
    if (initialData) {
      form.reset({
        type: initialData.type,
        description: initialData.description,
        amount: initialData.amount,
        quantity: initialData.quantity || 1,
        unitPrice: initialData.unitPrice || 0,
        departmentId: initialData.departmentId || "global",
        date: initialData.date
          ? new Date(initialData.date).toISOString().split("T")[0]
          : defaultDateStr,
      });
    }
  }, [initialData]);

  const projectedCashBalance = globalCashBalance - (paymentMode === "cash" ? amount : 0);

  const cashColor =
    projectedCashBalance > 0
      ? "text-emerald-700 dark:text-emerald-400"
      : projectedCashBalance === 0
        ? "text-slate-600 dark:text-slate-400"
        : "text-red-600 dark:text-red-400";

  const cashBg =
    projectedCashBalance > 0
      ? "bg-emerald-50/80 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800"
      : projectedCashBalance === 0
        ? "bg-slate-50 border-slate-200 dark:bg-slate-800/40 dark:border-slate-700"
        : "bg-red-50/80 border-red-200 dark:bg-red-950/30 dark:border-red-800";

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!paymentMode) {
      alert("Por favor selecciona quién pagó este gasto");
      return;
    }

    setLoading(true);
    try {
      const paidFromCash = paymentMode === "cash";
      const paymentReceiverId = !paidFromCash ? paymentMode : null;

      const payload = {
        ...values,
        departmentId: values.departmentId === "global" ? null : values.departmentId,
        paymentReceiverId,
        paidFromCash,
      };

      const url = initialData?.id
        ? `/api/expenses/${initialData.id}`
        : "/api/expenses";
      const method = initialData?.id ? "PATCH" : "POST";

      const res = await fetch(url, { method, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error("Failed");

      router.refresh();
      setOpen(false);
      form.reset();
    } catch {
      alert("Error guardando gasto");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Tipo de Gasto */}
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-xs font-semibold text-foreground">Tipo de Gasto</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="COMMISSION">Comisión (Booking/Airbnb)</SelectItem>
                    <SelectItem value="TAX">Impuestos/Servicios</SelectItem>
                    <SelectItem value="SUPPLY">Insumos/Mantenimiento</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Departamento */}
          <FormField
            control={form.control}
            name="departmentId"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-xs font-semibold text-foreground">Departamento</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="global">Global (Sin Depto)</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Descripción */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="sm:col-span-2 space-y-1">
                <FormLabel className="text-xs font-semibold text-foreground">Descripción</FormLabel>
                <FormControl>
                  <Input className="h-9 text-sm" placeholder="Ej: Factura Luz, Reparación termotanque, Limpieza..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Si SUPPLY: Cantidad y Precio Unitario */}
          {type === "SUPPLY" ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-xs font-semibold text-foreground">Cantidad</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          className="h-9 text-sm"
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
                  name="unitPrice"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-xs font-semibold text-foreground">Precio Unit.</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          className="h-9 text-sm"
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
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs font-semibold text-foreground">Monto Total</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        className="h-9 text-sm bg-muted font-bold"
                        readOnly
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          ) : (
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-xs font-semibold text-foreground">Monto Total</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      className="h-9 text-sm font-bold"
                      onKeyDown={(e) => ["-", "e", "E"].includes(e.key) && e.preventDefault()}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Fecha */}
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-xs font-semibold text-foreground">Fecha</FormLabel>
                <FormControl>
                  <Input type="date" className="h-9 text-sm" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* ¿Quién pagó este gasto? */}
          <div className="sm:col-span-2 space-y-1">
            <label className="text-xs font-semibold text-foreground leading-none">¿Quién pagó este gasto?</label>
            <Select value={paymentMode} onValueChange={(val) => setPaymentMode(val)}>
              <SelectTrigger className="h-9 text-sm w-full">
                <SelectValue placeholder="Seleccionar quién pagó" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">
                  <span className="flex items-center gap-2">
                    <span>💵</span>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">Efectivo (Caja)</span>
                    <span className="text-xs text-muted-foreground">— Se descuenta del dinero físico disponible</span>
                  </span>
                </SelectItem>
                {receivers.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    <span className="flex items-center gap-2">
                      <span>👤</span>
                      <span className="font-medium">{r.name}</span>
                      {r.accountInfo && (
                        <span className="text-xs text-muted-foreground">({r.accountInfo})</span>
                      )}
                      <span className="text-xs text-muted-foreground">— Pagó de su bolsillo</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Status compacto de caja si se paga en efectivo */}
        {paymentMode === "cash" && (
          <div className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs transition-all ${cashBg}`}>
            <div className="flex items-center gap-2">
              <span>💰</span>
              <span className="text-muted-foreground">Caja disponible:</span>
              <span className={`font-semibold ${globalCashBalance >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                {formatCurrency(globalCashBalance)}
              </span>
            </div>
            {amount > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Saldo resultante:</span>
                <span className={`font-extrabold ${cashColor}`}>
                  {formatCurrency(projectedCashBalance)}
                  {projectedCashBalance < 0 && (
                    <span className="font-semibold text-red-500 ml-1">(déficit)</span>
                  )}
                </span>
              </div>
            )}
          </div>
        )}

        <Button type="submit" className="w-full h-10 mt-1" disabled={loading}>
          {loading ? "Guardando..." : initialData?.id ? "Actualizar Gasto" : "Guardar Gasto"}
        </Button>
      </form>
    </Form>
  );
}
