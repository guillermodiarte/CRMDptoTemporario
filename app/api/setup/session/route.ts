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

    // Ensure the current user exists in the DB.
    // After a full restore the DB may have been wiped and re-populated with different users,
    // so the JWT's user.id might not match any DB record. We upsert by email to be safe.
    const dbUser = await prisma.user.upsert({
      where: { email: user.email },
      update: { isSuperAdmin: true },
      create: {
        id: user.id,
        email: user.email,
        name: user.name ?? "SuperAdmin",
        password: "", // will be unusable — user must sign in via OAuth or reset
        isSuperAdmin: true,
        isActive: true,
      },
    });

    // Create session
    const newSession = await prisma.session.create({
      data: {
        name: name.trim(),
        isActive: true,
      },
    });

    // Add the SuperAdmin as ADMIN in the new session
    // Use upsert to avoid duplicate key if somehow the relation already exists
    await prisma.userSession.upsert({
      where: { userId_sessionId: { userId: dbUser.id, sessionId: newSession.id } },
      update: { role: "ADMIN" },
      create: {
        userId: dbUser.id,
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

