import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { normalizePhone } from "@/lib/phone-utils";
import { requireSessionId } from "@/lib/auth-helper";

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";

  // If query is provided, we can search by name (contains) or phone (exact normalized)
  // But wait, user said "Búsqueda ... coincidencias parciales y exactas".
  // For phone, exact matching on normalized is usually best, but partial on raw string is okay for UI search.

  try {
    const sessionId = await requireSessionId();
    const entries = await prisma.blacklistEntry.findMany({
      where: {
        isActive: true,
        sessionId,
        OR: q ? [
          { guestName: { contains: q } }, // Case insensitive usually in SQLite/Postgres depends
          { guestPhone: { contains: normalizePhone(q) } },
          { reason: { contains: q } }
        ] : undefined
      },
      orderBy: { createdAt: "desc" },
      include: { reportedBy: { select: { name: true, email: true } } }
    });

    return NextResponse.json(entries);
  } catch (error) {
    console.error("[BLACKLIST_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  const userRole = (session?.user as any)?.role;

  if (!session || userRole !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const sessionId = await requireSessionId();

  try {
    const body = await req.json();
    const {
      guestName,
      guestPhone,
      reason,
      // Optional context
      departmentName,
      checkIn,
      checkOut,
      totalAmount
    } = body;

    if (!guestName || !guestPhone || !reason) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const normalized = normalizePhone(guestPhone);

    // Check duplicate? User said "Avoid duplicates... using normalized phone".
    const existing = await prisma.blacklistEntry.findFirst({
      where: {
        guestPhone: normalized,
        isActive: true,
        sessionId
      }
    });

    if (existing) {
      return new NextResponse("El huésped ya existe en la lista negra", { status: 409 });
    }

    const entry = await prisma.blacklistEntry.create({
      data: {
        guestName,
        guestPhone: normalized,
        reason,
        reportedById: session.user?.id,
        departmentName,
        checkIn: checkIn ? new Date(checkIn) : null,
        checkOut: checkOut ? new Date(checkOut) : null,
        checkIn: checkIn ? new Date(checkIn) : null,
        checkOut: checkOut ? new Date(checkOut) : null,
        totalAmount: totalAmount ? Number(totalAmount) : null,
        sessionId
      }
    });

    return NextResponse.json(entry);
  } catch (error) {
    console.error("[BLACKLIST_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
