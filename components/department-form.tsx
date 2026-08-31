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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Department } from "@prisma/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Trash2, UploadCloud, Building, Settings, Wifi, DollarSign } from "lucide-react";
import { AVAILABLE_AMENITIES } from "./shared-ui";

const formSchema = z.object({
  type: z.enum(["APARTMENT", "PARKING"]).default("APARTMENT"),
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
  alias: z.string().optional(),
  description: z.string().optional(),
  address: z.string().optional(),
  googleMapsLink: z.string().url("Debe ser una URL válida").optional().or(z.literal("")),

  bedCount: z.coerce.number().min(0),
  maxPeople: z.coerce.number().min(0),
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

  color: z.string().optional(),
  hasParking: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

interface DepartmentFormProps {
  setOpen: (open: boolean) => void;
  initialData?: Department | null;
  forcedType?: "APARTMENT" | "PARKING";
}

export function DepartmentForm({ setOpen, initialData, forcedType }: DepartmentFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [imageToDelete, setImageToDelete] = useState<number | null>(null);

  const [pricesObj, setPricesObj] = useState<Record<string, number>>(() => {
    if (!(initialData as any)?.prices) return {};
    try { return JSON.parse((initialData as any).prices as string); }
    catch { return {}; }
  });

  const [imageUrls, setImageUrls] = useState<string[]>(() => {
    if (!initialData?.images) return [];
    try {
      let parsed: any = initialData.images;
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
      const arr = Array.isArray(parsed) ? parsed : [];
      return arr
        .filter(Boolean)
        .map(item => {
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
        .filter(u => u.length > 0);
    } catch { return []; }
  });

  const [activeAmenities, setActiveAmenities] = useState<string[]>(() => {
    if (!(initialData as any)?.amenities) return [];
    try {
      const parsed = JSON.parse((initialData as any).amenities as string);
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  });

  const toggleAmenity = (id: string) => {
    setActiveAmenities(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const autoSaveImages = async (newUrls: string[]) => {
    if (!initialData?.id) return;
    try {
      await fetch(`/api/departments/${initialData.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...initialData,
          images: newUrls,
          // Always send current pricesObj so we don't overwrite person-count pricing
          prices: JSON.stringify(pricesObj),
          amenities: JSON.stringify(activeAmenities),
        }),
      });
      router.refresh();
    } catch (e) {
      console.error("Error auto-saving images", e);
    }
  };


  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingImages(true);
    const formData = new FormData();
    Array.from(files).forEach(file => formData.append("files", file));
    // Pass the current department name so files are stored in a subfolder
    const deptName = form.getValues("name") || initialData?.name;
    if (deptName) formData.append("department", deptName);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Error al subir imagen");
      const data = await res.json();
      if (data.urls) {
        const newUrls = [...imageUrls, ...data.urls];
        setImageUrls(newUrls);
        await autoSaveImages(newUrls);
      }
    } catch (error) {
      console.error(error);
      alert("No se pudieron subir las imágenes.");
    } finally {
      setUploadingImages(false);
    }
  };


  const confirmRemoveImage = async () => {
    if (imageToDelete === null) return;
    const indexToRemove = imageToDelete;
    setImageToDelete(null);

    const urlToRemove = imageUrls[indexToRemove];
    const newUrls = imageUrls.filter((_, i) => i !== indexToRemove);
    setImageUrls(newUrls);

    if (urlToRemove?.startsWith("/uploads/")) {
      try {
        await fetch("/api/upload/delete", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: urlToRemove }),
        });
      } catch {
        console.warn("No se pudo eliminar el archivo físico:", urlToRemove);
      }
    }
    await autoSaveImages(newUrls);
  };

  const handleDragStart = (idx: number) => setDraggedIdx(idx);
  const handleDragEnd = () => {
    setDraggedIdx(null);
    autoSaveImages(imageUrls);
  };
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDragEnter = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === targetIdx) return;
    setImageUrls(prev => {
      const newUrls = [...prev];
      const draggedItem = newUrls[draggedIdx];
      newUrls.splice(draggedIdx, 1);
      newUrls.splice(targetIdx, 0, draggedItem);
      return newUrls;
    });
    setDraggedIdx(targetIdx);
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      type: forcedType || (initialData as any)?.type || "APARTMENT",
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

  const selectedType = form.watch("type");
  const maxPeopleWatch = form.watch("maxPeople");
  const isParking = selectedType === "PARKING";

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
      const url = initialData ? `/api/departments/${initialData.id}` : "/api/departments";
      const method = initialData ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        body: JSON.stringify({
          ...values,
          bedCount: isParking ? 0 : values.bedCount,
          maxPeople: isParking ? 0 : values.maxPeople,
          images: imageUrls,
          prices: JSON.stringify(pricesObj),
          amenities: JSON.stringify(activeAmenities),
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

        {/* TYPE SELECTOR */}
        {!forcedType && (
          <FormField control={form.control} name="type" render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Unidad</FormLabel>
              <FormControl>
                <Tabs onValueChange={field.onChange} defaultValue={field.value} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="APARTMENT">Departamento</TabsTrigger>
                    <TabsTrigger value="PARKING">Cochera</TabsTrigger>
                  </TabsList>
                </Tabs>
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        )}

        <Tabs defaultValue="general" className="w-full">
          <TabsList className={`grid w-full mb-2 ${isParking ? 'grid-cols-3' : 'grid-cols-4'}`}>
            <TabsTrigger value="general" className="flex items-center gap-1.5 text-xs">
              <Building className="w-3.5 h-3.5" /> General
            </TabsTrigger>
            <TabsTrigger value="prices" className="flex items-center gap-1.5 text-xs">
              <DollarSign className="w-3.5 h-3.5" /> Precios
            </TabsTrigger>
            <TabsTrigger value="operations" className="flex items-center gap-1.5 text-xs">
              <Settings className="w-3.5 h-3.5" /> Operativa
            </TabsTrigger>
            {!isParking && (
              <TabsTrigger value="amenities" className="flex items-center gap-1.5 text-xs">
                <Wifi className="w-3.5 h-3.5" /> Servicios y Fotos
              </TabsTrigger>
            )}
          </TabsList>

          {/* ── TAB GENERAL ── */}
          <TabsContent value="general" className="space-y-4 pt-1">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre Oficial</FormLabel>
                  <FormControl><Input placeholder={isParking ? "Cochera 1" : "Departamento 1"} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="alias" render={({ field }) => (
                <FormItem>
                  <FormLabel>Alias / Código</FormLabel>
                  <FormControl><Input placeholder={isParking ? "C1" : "D1"} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="address" render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección</FormLabel>
                  <FormControl><Input placeholder="Calle Falsa 123" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="ownerName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Propietario</FormLabel>
                  <FormControl><Input placeholder="Juan Pérez" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="googleMapsLink" render={({ field }) => (
              <FormItem>
                <FormLabel>Link Google Maps</FormLabel>
                <FormControl><Input placeholder="https://maps.app.goo.gl/..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Descripción</FormLabel>
                <FormControl><Textarea placeholder="Detalles del departamento..." className="h-24" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-3 gap-4 items-end">
              <FormField control={form.control} name="color" render={({ field }) => (
                <FormItem>
                  <FormLabel>Color Distintivo</FormLabel>
                  <div className="flex gap-2 items-center">
                    <FormControl><Input type="color" className="w-12 h-10 p-1 cursor-pointer" {...field} /></FormControl>
                    <span className="text-xs text-muted-foreground">{field.value}</span>
                  </div>
                  <FormMessage />
                </FormItem>
              )} />
              {!isParking && (
                <FormField control={form.control} name="hasParking" render={({ field }) => (
                  <FormItem className="flex items-center space-x-3 space-y-0 rounded-md border p-3 h-10">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <FormLabel className="cursor-pointer font-normal">Tiene Cochera</FormLabel>
                  </FormItem>
                )} />
              )}
              <FormField control={form.control} name="isActive" render={({ field }) => (
                <FormItem className="flex items-center space-x-3 space-y-0 rounded-md border p-3 h-10">
                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <FormLabel className="cursor-pointer font-normal">
                    {isParking ? "Cochera Activa" : "Depto. Activo"}
                  </FormLabel>
                </FormItem>
              )} />
            </div>
          </TabsContent>

          {/* ── TAB PRECIOS ── */}
          <TabsContent value="prices" className="space-y-4 pt-1">
            {!isParking && (
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="bedCount" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cantidad de Camas</FormLabel>
                    <FormControl><Input type="number" min={0} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="maxPeople" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacidad Máxima (personas)</FormLabel>
                    <FormControl><Input type="number" min={0} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="basePrice" render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio Base</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} step="0.01" {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        setPricesObj(prev => ({ ...prev, ["2"]: Number(e.target.value) }));
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="cleaningFee" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tarifa Limpieza</FormLabel>
                  <FormControl><Input type="number" min={0} step="0.01" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {!isParking && (
              <div className="space-y-3 pt-2 border-t">
                <h4 className="font-semibold text-sm text-slate-700">Precios por Cantidad de Personas</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {Array.from({ length: maxPeopleWatch || 0 }).map((_, i) => {
                    const count = i + 1;
                    return (
                      <div key={count} className="space-y-1">
                        <label className="text-xs text-slate-600 font-medium">Para {count} {count === 1 ? 'persona' : 'personas'}</label>
                        <Input
                          type="number" min={0} step="0.01"
                          value={pricesObj[count] || ''}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setPricesObj(prev => ({ ...prev, [count]: val }));
                            if (count === 2) form.setValue("basePrice", val);
                          }}
                          placeholder="$ 0.00"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── TAB OPERATIVA ── */}
          <TabsContent value="operations" className="space-y-4 pt-1">
            {!isParking && (
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="wifiName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>WiFi – Nombre</FormLabel>
                    <FormControl><Input placeholder="Fibertel Wifi 999" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="wifiPass" render={({ field }) => (
                  <FormItem>
                    <FormLabel>WiFi – Clave</FormLabel>
                    <FormControl><Input placeholder="clave123" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="keyLocation" render={({ field }) => (
                <FormItem>
                  <FormLabel>Ubicación Llave / Locker</FormLabel>
                  <FormControl><Input placeholder="Locker entrada..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="lockBoxCode" render={({ field }) => (
                <FormItem>
                  <FormLabel>Código Locker</FormLabel>
                  <FormControl><Input placeholder="1234" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="airbnbLink" render={({ field }) => (
                <FormItem>
                  <FormLabel>Link Airbnb</FormLabel>
                  <FormControl><Input placeholder="https://airbnb.com/..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="bookingLink" render={({ field }) => (
                <FormItem>
                  <FormLabel>Link Booking</FormLabel>
                  <FormControl><Input placeholder="https://booking.com/..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {!isParking && (
              <>
                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                  <FormField control={form.control} name="meterLuz" render={({ field }) => (
                    <FormItem>
                      <FormLabel>N° Cliente Luz</FormLabel>
                      <FormControl><Input placeholder="123456789" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="meterGas" render={({ field }) => (
                    <FormItem>
                      <FormLabel>N° Cliente Gas</FormLabel>
                      <FormControl><Input placeholder="GAS-123" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="meterAgua" render={({ field }) => (
                    <FormItem>
                      <FormLabel>N° Cliente Agua</FormLabel>
                      <FormControl><Input placeholder="AGUA-123" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="meterWifi" render={({ field }) => (
                    <FormItem>
                      <FormLabel>N° Cliente Internet</FormLabel>
                      <FormControl><Input placeholder="WIFI-123" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="inventoryNotes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Inventario Crítico</FormLabel>
                    <FormControl><Textarea placeholder="3 juegos de sábanas, 6 toallas..." className="h-20" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </>
            )}
          </TabsContent>

          {/* ── TAB SERVICIOS Y FOTOS ── */}
          {!isParking && (
            <TabsContent value="amenities" className="space-y-5 pt-1">
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-slate-700 border-b pb-2">Servicios Incluidos (Visibles en la web)</h4>
                <div className="grid grid-cols-2 gap-2">
                  {AVAILABLE_AMENITIES.map((am) => (
                    <label
                      key={am.id}
                      htmlFor={`amenity-${am.id}`}
                      className="flex items-center space-x-3 p-3 rounded-lg border hover:border-sky-200 hover:bg-sky-50/50 transition-colors cursor-pointer"
                    >
                      <Checkbox
                        id={`amenity-${am.id}`}
                        checked={activeAmenities.includes(am.id)}
                        onCheckedChange={() => toggleAmenity(am.id)}
                      />
                      <span className="text-sm font-medium flex items-center gap-2 w-full">
                        <span className="text-sky-600">{am.icon}</span>
                        <span className="text-slate-700">{am.label}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-3 border-t pt-4">
                <h4 className="font-semibold text-sm text-slate-700">Fotografías</h4>
                <div className="flex items-center gap-3">
                  <Button type="button" variant="outline" size="sm" disabled={uploadingImages}
                    onClick={() => document.getElementById('image-upload')?.click()}>
                    <UploadCloud className="w-4 h-4 mr-2" />
                    {uploadingImages ? "Subiendo..." : "Subir Fotos"}
                  </Button>
                  <span className="text-xs text-muted-foreground">Arrastrá para reordenar. La primera foto es la portada.</span>
                  <input id="image-upload" type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} />
                </div>
                {imageUrls.length > 0 && (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-2">
                    {imageUrls.map((url, i) => (
                      <div
                        key={i}
                        className={`relative group rounded-lg overflow-hidden border-2 cursor-move transition-all ${draggedIdx === i ? 'opacity-50 scale-95 border-sky-400' : 'border-transparent hover:border-slate-300'}`}
                        draggable
                        onDragStart={() => handleDragStart(i)}
                        onDragEnter={(e) => handleDragEnter(e, i)}
                        onDragEnd={handleDragEnd}
                        onDragOver={handleDragOver}
                      >
                        <img src={url} alt={`Foto ${i + 1}`} className="object-cover w-full h-16 pointer-events-none" />
                        {i === 0 && (
                          <div className="absolute bottom-0 left-0 right-0 bg-sky-500/90 text-white text-[8px] font-bold text-center py-0.5">
                            PORTADA
                          </div>
                        )}
                        <button type="button" onClick={() => setImageToDelete(i)}
                          className="absolute top-0.5 right-0.5 bg-black/60 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500 transition-all">
                          <Trash2 className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          )}
        </Tabs>

        <div className="pt-4 border-t">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Guardando..." : (initialData ? "Actualizar Departamento" : "Crear Unidad")}
          </Button>
        </div>
      </form>

      {/* Modal de confirmación para eliminar imagen */}
      <AlertDialog open={imageToDelete !== null} onOpenChange={(isOpen) => !isOpen && setImageToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta foto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará la foto seleccionada y no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveImage} className="bg-red-600 hover:bg-red-700">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Form>
  );
}
