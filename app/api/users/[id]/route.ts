import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const userRole = (session?.user as any)?.role;

  if (!session || userRole !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { name, email, password, role, phone, isActive, image } = body;

    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    // role is handled separately via UserSession
    if (phone !== undefined) updateData.phone = phone;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (image !== undefined) updateData.image = image;

    if (password && password.length > 0) {
      const isSuperAdmin = session.user?.email?.toLowerCase()?.trim() === "guillermo.diarte@gmail.com";
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^a-zA-Z0-9]).{8,}$/;

      if (!isSuperAdmin && !passwordRegex.test(password)) {
        return new NextResponse("La contraseña debe tener: 8 caracteres, mayúscula, minúscula, número y especial", { status: 400 });
      }

      updateData.password = await bcrypt.hash(password, 10);
    }

    // Check email collision
    if (email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing && existing.id !== id) {
        return new NextResponse("El email ya está en uso por otro usuario", { status: 409 });
      }
    }

    // Protection: Ensure Super Admin cannot be downgraded or deactivated
    const targetUser = await prisma.user.findUnique({ where: { id } });

    if (targetUser && targetUser.email.toLowerCase().trim() === "guillermo.diarte@gmail.com") {
      // If trying to deactivate
      if (isActive === false) {
        return new NextResponse("No puedes bloquear al Super Admin", { status: 403 });
      }
      // If trying to change role to anything other than ADMIN
      if (role && role !== "ADMIN") {
        return new NextResponse("No puedes cambiar el rol del Super Admin", { status: 403 });
      }
    }

    const maxRetries = 3;
    let retries = 0;
    let user;

    while (retries < maxRetries) {
      try {
        user = await prisma.user.update({
          where: { id },
          data: updateData,
        });
        break;
      } catch (error: any) {
        if (error.code === 'P2002') {
          throw error; // Email collision handled above, but just in case
        }
        retries++;
        if (retries === maxRetries) throw error;
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    if (!user) throw new Error("Failed to update user");

    // Handle Role Update (UserSession)
    // We assume the admin is updating the role within the CONTEXT of their current session.
    const currentSessionId = (session.user as any).sessionId;

    if (role && currentSessionId) {
      // Update or Create the UserSession for this user and this session
      await prisma.userSession.upsert({
        where: {
          userId_sessionId: {
            userId: id,
            sessionId: currentSessionId
          }
        },
        update: { role: role as Role },
        create: {
          userId: id,
          sessionId: currentSessionId,
          role: role as Role
        }
      });
    }

    const { password: _, ...cleaned } = user;
    return NextResponse.json(cleaned);
  } catch (error) {
    console.error("[USER_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const userRole = (session?.user as any)?.role;

  if (!session || userRole !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { id } = await params;

    // Check if target is Super Admin
    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (targetUser?.email.toLowerCase().trim() === "guillermo.diarte@gmail.com") {
      return new NextResponse("No puedes eliminar al Super Admin", { status: 403 });
    }

    // Prevent deleting self (extra safety)
    if (session.user?.id === id) {
      return new NextResponse("Cannot delete yourself", { status: 403 });
    }

    const user = await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("[USER_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
