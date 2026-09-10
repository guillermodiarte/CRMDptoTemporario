import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { normalizePhone, phoneMatchesQuery } from "@/lib/phone-utils";
import { requireSessionId } from "@/lib/auth-helper";

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";

  try {
    const sessionId = await requireSessionId();

    // Fetch all active entries for this session, then filter in-memory
    // so we can apply normalized phone matching regardless of how the
    // number was stored or how the query was typed.
    const entries = await prisma.blacklistEntry.findMany({
      where: { isActive: true, sessionId },
      orderBy: { createdAt: "desc" },
      include: { reportedBy: { select: { name: true, email: true } } },
    });

    if (!q) return NextResponse.json(entries);

    const ql = q.toLowerCase();
    const filtered = entries.filter((entry) => {
      // Name or reason: plain text search
      if (
        entry.guestName.toLowerCase().includes(ql) ||
        entry.reason.toLowerCase().includes(ql)
      ) {
        return true;
      }
      // Phone: fuzzy normalized match (partial allowed for search bar)
      if (phoneMatchesQuery(entry.guestPhone, q)) return true;
      // Also allow matching against raw stored value (fallback)
      if (entry.guestPhone.includes(q)) return true;
      return false;
    });

    return NextResponse.json(filtered);
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
      departmentName,
      checkIn,
      checkOut,
      totalAmount,
      isActive,
    } = body;

    if (!guestName || !guestPhone || !reason) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const normalized = normalizePhone(guestPhone);

    // Prevent duplicates using normalized phone
    const existing = await prisma.blacklistEntry.findFirst({
      where: { isActive: true, sessionId },
    });

    // Check all active entries for this session against the new normalized number
    const allActive = await prisma.blacklistEntry.findMany({
      where: { isActive: true, sessionId },
      select: { guestPhone: true },
    });

    const isDuplicate = allActive.some(
      (e) => normalizePhone(e.guestPhone) === normalized
    );

    if (isDuplicate) {
      return new NextResponse("El huésped ya existe en la lista negra", {
        status: 409,
      });
    }

    const entry = await prisma.blacklistEntry.create({
      data: {
        guestName,
        guestPhone: normalized, // always store normalized
        reason,
        reportedById: session.user?.id,
        departmentName,
        checkIn: checkIn ? new Date(checkIn) : null,
        checkOut: checkOut ? new Date(checkOut) : null,
        totalAmount: totalAmount ? Number(totalAmount) : null,
        isActive: isActive !== undefined ? isActive : true,
        sessionId,
      },
    });

    return NextResponse.json(entry);
  } catch (error) {
    console.error("[BLACKLIST_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
