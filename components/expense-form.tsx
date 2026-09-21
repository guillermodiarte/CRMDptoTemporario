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

const formSchema = z.object({
  type: z.enum(["COMMISSION", "TAX", "SUPPLY"]),
  description: z.string().min(2),
  amount: z.coerce.number().min(0.01),
  quantity: z.coerce.number().optional(),
  unitPrice: z.coerce.number().optional(),
  departmentId: z.string().optional(),
  date: z.string(),
});

interface ExpenseFormProps {
  departments: Department[];
  setOpen: (open: boolean) => void;
  initialData?: any;
  defaultDate?: Date;
  receivers?: { id: string; name: string; accountInfo?: string | null }[];
}

export function ExpenseForm({ departments, setOpen, initialData, defaultDate, receivers = [] }: ExpenseFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedReceiverId, setSelectedReceiverId] = useState<string>(
    initialData?.paymentReceiverId || initialData?.paymentReceiver?.id || ""
  );

  const defaultDateStr = initialData?.date
    ? new Date(initialData.date).toISOString().split("T")[0]
    : defaultDate
      ? defaultDate.toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: initialData ? {
      type: initialData.type,
      description: initialData.description,
      amount: initialData.amount,
      quantity: initialData.quantity || 1,
      unitPrice: initialData.unitPrice || 0,
      departmentId: initialData.departmentId || "global",
      date: defaultDateStr,
    } : {
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

  // Auto-calculate amount for SUPPLY
  useEffect(() => {
    if (type === "SUPPLY") {
      const calc = quantity * unitPrice;
      form.setValue("amount", parseFloat(calc.toFixed(2)));
    }
  }, [type, quantity, unitPrice, form]);

  useEffect(() => {
    setSelectedReceiverId(initialData?.paymentReceiverId || initialData?.paymentReceiver?.id || "");
    if (initialData) {
      form.reset({
        type: initialData.type,
        description: initialData.description,
        amount: initialData.amount,
        quantity: initialData.quantity || 1,
        unitPrice: initialData.unitPrice || 0,
        departmentId: initialData.departmentId || "global",
        date: initialData.date ? new Date(initialData.date).toISOString().split("T")[0] : defaultDateStr,
      });
    }
  }, [initialData]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
      const payload = {
        ...values,
        departmentId: values.departmentId === "global" ? null : values.departmentId,
        paymentReceiverId: selectedReceiverId || null,
      };

      const url = initialData?.id ? `/api/expenses/${initialData.id}` : "/api/expenses";
      const method = initialData?.id ? "PATCH" : "POST";

      const res = await fetch(url, {
        method: method,
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed");

      router.refresh();
      setOpen(false);
      form.reset();
    } catch (error) {
      alert("Error guardando gasto");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Input placeholder="Factura Luz / Reparación..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {type === "SUPPLY" && (
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cantidad</FormLabel>
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
              name="unitPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio Unit.</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
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
          </div>
        )}

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Monto Total</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  onKeyDown={(e) => ["-", "e", "E"].includes(e.key) && e.preventDefault()}
                  {...field}
                  readOnly={type === "SUPPLY"}
                  className={type === "SUPPLY" ? "bg-muted" : ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="departmentId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Departamento</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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

        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fecha</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Receptor (solo si hay receptores configurados) */}
        {receivers.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium leading-none">Pagado por (opcional)</label>
            <select
              value={selectedReceiverId}
              onChange={(e) => setSelectedReceiverId(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Sin asignar</option>
              {receivers.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}{r.accountInfo ? ` (${r.accountInfo})` : ""}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">Quién pagó este gasto — se descontará de su balance.</p>
          </div>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Guardando..." : (initialData?.id ? "Actualizar Gasto" : "Guardar Gasto")}
        </Button>
      </form>
    </Form>
  );
}
