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
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Department } from "@prisma/client";

const formSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
  description: z.string().optional(),
  address: z.string().optional(),
  bedCount: z.coerce.number().min(1),
  maxPeople: z.coerce.number().min(1),
  hasParking: z.boolean().default(false),
  imageUrls: z.string().optional(),
});

interface DepartmentFormProps {
  setOpen: (open: boolean) => void;
  initialData?: Department | null;
}

export function DepartmentForm({ setOpen, initialData }: DepartmentFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Parse images if editing
  const initialImages = initialData?.images ? JSON.parse(initialData.images as string).join("\n") : "";

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      address: initialData?.address || "",
      bedCount: initialData?.bedCount || 1,
      maxPeople: initialData?.maxPeople || 2,
      hasParking: initialData?.hasParking || false,
      imageUrls: initialImages,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
      const images = values.imageUrls
        ? values.imageUrls.split("\n").map((url) => url.trim()).filter((url) => url !== "")
        : [];

      const url = initialData
        ? `/api/departments/${initialData.id}`
        : "/api/departments";

      const method = initialData ? "PATCH" : "POST";

      const res = await fetch(url, {
        method: method,
        body: JSON.stringify({
          ...values,
          images,
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <Input placeholder="Depto 101" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="bedCount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Camas</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    onKeyDown={(e) => ["-", "e", "E"].includes(e.key) && e.preventDefault()}
                    {...field}
                  />
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
                  <Input
                    type="number"
                    min={0}
                    onKeyDown={(e) => ["-", "e", "E"].includes(e.key) && e.preventDefault()}
                    {...field}
                  />
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
                <Input placeholder="Av. Siempre Viva 123" {...field} />
              </FormControl>
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
                <Textarea placeholder="Estudio acogedor..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="imageUrls"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URLs de Imágenes (una por línea)</FormLabel>
              <FormControl>
                <Textarea placeholder="https://..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Guardando..." : (initialData ? "Actualizar" : "Crear Departamento")}
        </Button>
      </form>
    </Form>
  );
}
