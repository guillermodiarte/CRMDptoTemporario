import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const authSession = await auth();
    const user = authSession?.user as any;

    if (!user?.isSuperAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "El nombre de la sesión es obligatorio" }, { status: 400 });
    }

    // Create session
    const newSession = await prisma.session.create({
      data: {
        name: name.trim(),
        isActive: true,
      },
    });

    // Add the SuperAdmin as ADMIN in the new session
    await prisma.userSession.create({
      data: {
        userId: user.id!,
        sessionId: newSession.id,
        role: "ADMIN",
      },
    });

    return NextResponse.json({ success: true, session: newSession });
  } catch (error) {
    console.error("[SETUP_SESSION_ERROR]", error);
    return NextResponse.json({ error: "Error interno al crear la sesión" }, { status: 500 });
  }
}
