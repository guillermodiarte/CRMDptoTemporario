import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Role } from "@prisma/client";

const userSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  email: z.string().email("Email inválido"),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^a-zA-Z0-9]).{8,}$/,
      "La contraseña debe tener: 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial"
    ),
  role: z.enum(["ADMIN", "VISUALIZER"]),
  phone: z.string().optional(),
  image: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(req: Request) {
  const session = await auth();
  const userRole = (session?.user as any)?.role;

  if (!session || userRole !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const users = await prisma.user.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        isActive: true,
        createdAt: true,
      }
    });
    return NextResponse.json(users);
  } catch (error) {
    console.error("[USERS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  const userRole = (session?.user as any)?.role;

  if (!session || userRole !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json();

    // Determine validation restrictiveness based on user
    const userEmail = (session?.user as any)?.email;
    const isSuperAdmin = userEmail === "guillermo.diarte@gmail.com";

    const passwordSchema = isSuperAdmin
      ? z.string().min(1, "La contraseña es obligatoria")
      : z.string()
        .min(8, "La contraseña debe tener al menos 8 caracteres")
        .regex(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^a-zA-Z0-9]).{8,}$/,
          "La contraseña debe tener: 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial"
        );

    const dynamicSchema = z.object({
      name: z.string().min(1, "El nombre es obligatorio"),
      email: z.string().email("Email inválido"),
      password: passwordSchema,
      role: z.enum(["ADMIN", "VISUALIZER"]),
      phone: z.string().optional(),
      image: z.string().optional(),
      isActive: z.boolean().optional(),
    });

    const result = dynamicSchema.safeParse(body);

    if (!result.success) {
      const errorMessage = result.error.issues[0]?.message || "Invalid data";
      return new NextResponse(errorMessage, { status: 400 });
    }

    const { name, email, password, role, phone, isActive, image } = result.data;

    // Check duplicate
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return new NextResponse("El email ya está registrado", { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role as Role,
        image,
        phone,
        isActive: isActive ?? true,
      },
    });

    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json(userWithoutPassword);
  } catch (error) {
    console.error("[USERS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
