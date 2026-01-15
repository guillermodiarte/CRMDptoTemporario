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
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { BlacklistEntry } from "@prisma/client";

const formSchema = z.object({
  guestName: z.string().min(1, "El nombre es obligatorio"),
  guestPhone: z.string().min(1, "El teléfono es obligatorio"),
  reason: z.string().min(1, "El motivo es obligatorio"),
});

interface BlacklistFormProps {
  initialData?: Partial<BlacklistEntry> | null;
  setOpen: (open: boolean) => void;
  // If pre-filling from reservation
  contextData?: {
    departmentName?: string;
    checkIn?: string;
    checkOut?: string;
    totalAmount?: number;
  };
}

export function BlacklistForm({ initialData, setOpen, contextData }: BlacklistFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      guestName: initialData?.guestName || "",
      guestPhone: initialData?.guestPhone || "",
      reason: initialData?.reason || "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    setError("");

    try {
      const url = initialData?.id ? `/api/blacklist/${initialData.id}` : "/api/blacklist";
      const method = initialData?.id ? "PATCH" : "POST";

      const payload = {
        ...values,
        ...(contextData || {})
      };

      const res = await fetch(url, {
        method,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }

      router.refresh();
      setOpen(false);
    } catch (err: any) {
      setError(err.message || "Error al guardar registro");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {error && <div className="text-red-500 text-sm">{error}</div>}

        <FormField
          control={form.control}
          name="guestName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre Completo</FormLabel>
              <FormControl>
                <Input placeholder="Nombre del huésped" {...field} />
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
                  placeholder="+54 9 ..."
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
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Motivo de Inclusión</FormLabel>
              <FormControl>
                <Textarea placeholder="Describa el incidente o motivo..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button type="submit" disabled={loading} variant="destructive">
            {loading ? "Guardando..." : (initialData?.id ? "Actualizar" : "Agregar a Lista Negra")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
