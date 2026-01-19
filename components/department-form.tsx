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
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Department } from "@prisma/client";

const formSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
  alias: z.string().optional(),
  description: z.string().optional(),
  address: z.string().optional(),
  googleMapsLink: z.string().url("Debe ser una URL válida").optional().or(z.literal("")),

  bedCount: z.coerce.number().min(1),
  maxPeople: z.coerce.number().min(1),
  basePrice: z.coerce.number().min(0),
  cleaningFee: z.coerce.number().min(0),

  wifiName: z.string().optional(),
  wifiPass: z.string().optional(),

  keyLocation: z.string().optional(),
  lockBoxCode: z.string().optional(),

  meterLuz: z.string().optional(),
  meterGas: z.string().optional(),
  meterAgua: z.string().optional(),
  meterWifi: z.string().optional(),

  ownerName: z.string().optional(),

  airbnbLink: z.string().url("Debe ser una URL válida de Airbnb").optional().or(z.literal("")),
  bookingLink: z.string().url("Debe ser una URL válida de Booking").optional().or(z.literal("")),

  inventoryNotes: z.string().optional(),

  color: z.string().optional(), // Hex color
  hasParking: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

interface DepartmentFormProps {
  setOpen: (open: boolean) => void;
  initialData?: Department | null;
}

export function DepartmentForm({ setOpen, initialData }: DepartmentFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Parse images if editing (Legacy support internal only, mostly empty now)
  // Removed ImageUrls field as requested, but we keep the logic to not break schema if data exists.
  const initialImages = initialData?.images ? JSON.parse(initialData.images as string).join("\n") : "";

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: initialData?.name || "",
      alias: initialData?.alias || "",
      description: initialData?.description || "",
      address: initialData?.address || "",
      googleMapsLink: (initialData as any)?.googleMapsLink || "",

      bedCount: initialData?.bedCount || 1,
      maxPeople: initialData?.maxPeople || 2,
      basePrice: initialData?.basePrice || 0,
      cleaningFee: initialData?.cleaningFee || 0,

      wifiName: initialData?.wifiName || "",
      wifiPass: initialData?.wifiPass || "",

      keyLocation: (initialData as any)?.keyLocation || "",
      lockBoxCode: (initialData as any)?.lockBoxCode || "",

      meterLuz: (initialData as any)?.meterLuz || "",
      meterGas: (initialData as any)?.meterGas || "",
      meterAgua: (initialData as any)?.meterAgua || "",
      meterWifi: (initialData as any)?.meterWifi || "",

      ownerName: (initialData as any)?.ownerName || "",
      airbnbLink: (initialData as any)?.airbnbLink || "",
      bookingLink: (initialData as any)?.bookingLink || "",

      inventoryNotes: (initialData as any)?.inventoryNotes || "",

      color: initialData?.color || "#3b82f6",
      hasParking: initialData?.hasParking || false,
      isActive: initialData?.isActive ?? true,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
      const url = initialData
        ? `/api/departments/${initialData.id}`
        : "/api/departments";

      const method = initialData ? "PATCH" : "POST";

      const res = await fetch(url, {
        method: method,
        body: JSON.stringify({
          ...values,
          // Preserve existing images or send empty array since we removed the input
          images: initialImages ? initialImages.split("\n") : []
        }),
      });

      if (!res.ok) throw new Error(initialData ? "Error actualizando" : "Error creando");

      router.refresh();
      setOpen(false);
      form.reset();
    } catch (error) {
      console.error(error);
      alert("Error al guardar departamento");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-h-[70vh] overflow-y-auto px-1">

        {/* BASICS */}
        <div className="space-y-4">
          <h3 className="font-medium text-sm text-muted-foreground border-b pb-1">Información General</h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre Oficial</FormLabel>
                  <FormControl>
                    <Input placeholder="Depto 101" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="alias"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alias / Código</FormLabel>
                  <FormControl>
                    <Input placeholder="D1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dirección</FormLabel>
                <FormControl>
                  <Input placeholder="Calle Falsa 123" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="googleMapsLink"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Link Google Maps</FormLabel>
                <FormControl>
                  <Input placeholder="https://maps.app.goo.gl/..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* CAPACITY & PRICES */}
        <div className="space-y-4">
          <h3 className="font-medium text-sm text-muted-foreground border-b pb-1">Capacidad y Precios</h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="bedCount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Camas</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="maxPeople"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Personas</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="basePrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio Base</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cleaningFee"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tarifa Limpieza</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* OPERATIONS: Wifi, Access, Owner */}
        <div className="space-y-4">
          <h3 className="font-medium text-sm text-muted-foreground border-b pb-1">Operativa</h3>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="wifiName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>WiFi Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Fibertel Wifi 999" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="wifiPass"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>WiFi Clave</FormLabel>
                  <FormControl>
                    <Input placeholder="clave123" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="keyLocation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ubicación Llave/Locker</FormLabel>
                  <FormControl>
                    <Input placeholder="Locker entrada..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lockBoxCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código Locker</FormLabel>
                  <FormControl>
                    <Input placeholder="1234" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="ownerName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Propietario / Responsable</FormLabel>
                <FormControl>
                  <Input placeholder="Juan Perez" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="airbnbLink"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Airbnb Link</FormLabel>
                  <FormControl>
                    <Input placeholder="https://airbnb.com/..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bookingLink"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Booking Link</FormLabel>
                  <FormControl>
                    <Input placeholder="https://booking.com/..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* UTILITIES & INVENTORY */}
        <div className="space-y-4">
          <h3 className="font-medium text-sm text-muted-foreground border-b pb-1">Servicios e Inventario</h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="meterLuz"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>N° Cliente Luz</FormLabel>
                  <FormControl>
                    <Input placeholder="123456789" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="meterGas"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>N° Cliente Gas</FormLabel>
                  <FormControl>
                    <Input placeholder="GAS-123" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="meterAgua"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>N° Cliente Agua</FormLabel>
                  <FormControl>
                    <Input placeholder="AGUA-123" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="meterWifi"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>N° Cliente Internet</FormLabel>
                  <FormControl>
                    <Input placeholder="WIFI-123" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="inventoryNotes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Inventario Crítico</FormLabel>
                <FormControl>
                  <Textarea placeholder="3 juegos de sábanas, 6 toallas..." className="h-20" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* VISUAL & STATUS */}
        <div className="space-y-4">
          <h3 className="font-medium text-sm text-muted-foreground border-b pb-1">Configuración y Estado</h3>

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descripción Interna</FormLabel>
                <FormControl>
                  <Textarea placeholder="Estudio acogedor..." className="h-20" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="color"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Color Distintivo</FormLabel>
                <div className="flex gap-2 items-center">
                  <FormControl>
                    <Input type="color" className="w-12 h-10 p-1 cursor-pointer" {...field} />
                  </FormControl>
                  <span className="text-xs text-muted-foreground">{field.value}</span>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="hasParking"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Tiene Cochera
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Departamento Activo
                    </FormLabel>
                    <p className="text-[0.8rem] text-muted-foreground">
                      Si se desactiva, no aparecerá para nuevas reservas.
                    </p>
                  </div>
                </FormItem>
              )}
            />
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Guardando..." : (initialData ? "Actualizar" : "Crear Departamento")}
        </Button>
      </form>
    </Form>
  );
}
