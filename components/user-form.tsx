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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Role } from "@prisma/client";
import Resizer from "react-image-file-resizer";

const formSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  email: z.string().email("Email inválido"),
  password: z.string().optional(),
  role: z.enum(["ADMIN", "VISUALIZER"]),
  phone: z.string().optional(),
  image: z.string().optional(),
  isActive: z.boolean(),
});

interface UserFormProps {
  initialData?: Partial<User> | null;
  setOpen: (open: boolean) => void;
  currentUserId?: string;
}

export function UserForm({ initialData, setOpen, currentUserId }: UserFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isCurrentUser = initialData?.id === currentUserId;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || "",
      email: initialData?.email || "",
      password: "",
      role: initialData?.role || "VISUALIZER",
      phone: initialData?.phone || "",
      image: initialData?.image || "",
      isActive: isCurrentUser ? true : (initialData?.isActive ?? true),
    },
  });

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      Resizer.imageFileResizer(
        file,
        300,
        300,
        "JPEG",
        80,
        0,
        (uri) => {
          form.setValue("image", uri as string);
        },
        "base64"
      );
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    // Validation: Strong Password Check
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^a-zA-Z0-9]).{8,}$/;

    if (initialData && values.password && values.password.length > 0) {
      if (!passwordRegex.test(values.password)) {
        form.setError("password", {
          message: "La contraseña debe tener: min 8 caracteres, 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial."
        });
        return;
      }
    }

    if (!initialData) {
      if (!values.password || !passwordRegex.test(values.password)) {
        form.setError("password", {
          message: "La contraseña debe tener: min 8 caracteres, 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial."
        });
        return;
      }
    }

    setLoading(true);
    setError("");

    try {
      const url = initialData ? `/api/users/${initialData.id}` : "/api/users";
      const method = initialData ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }

      router.refresh();
      setOpen(false);
    } catch (err: any) {
      setError(err.message || "Error al guardar usuario");
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
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <Input placeholder="Juan Perez" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="juan@ejemplo.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rol</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione un rol" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="ADMIN">Administrador</SelectItem>
                    <SelectItem value="VISUALIZER">Visualizador</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Teléfono</FormLabel>
                <FormControl>
                  <Input
                    placeholder="+54..."
                    {...field}
                    value={field.value || ""}
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
          name="image"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Foto de Perfil</FormLabel>
              <FormControl>
                <div className="flex items-center gap-4">
                  {field.value ? (
                    <img src={field.value} alt="Preview" className="w-12 h-12 rounded-full object-cover border" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-200 border flex items-center justify-center text-gray-400">?</div>
                  )}
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={onFileChange}
                    className="w-full"
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contraseña {initialData ? "(Dejar en blanco para no cambiar)" : "*"}</FormLabel>
              <FormControl>
                <Input type="password" placeholder="******" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 border rounded-md">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isCurrentUser}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Usuario Activo</FormLabel>
                <FormDescription>
                  {isCurrentUser
                    ? "No puedes desactivar tu propio usuario."
                    : "Si se desactiva, el usuario no podrá iniciar sesión."}
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Guardando..." : (initialData ? "Actualizar" : "Crear Usuario")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
