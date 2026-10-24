import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireSessionId } from "@/lib/auth-helper";

export async function GET(req: Request) {
  try {
    const sessionId = await requireSessionId();
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim();

    if (!query || query.length < 1) {
      return NextResponse.json([]);
    }

    const queryLower = query.toLowerCase();

    // SQLite does NOT support mode:"insensitive", so we fetch recent records
    // and filter in-memory with toLowerCase for case-insensitive matching.
    const reservations = await prisma.reservation.findMany({
      where: {
        sessionId,
        status: { not: "CANCELLED" },
      },
      select: {
        guestName: true,
        guestPhone: true,
        guestDni: true,
        checkIn: true,
      },
      orderBy: { checkIn: "desc" },
      take: 500, // get enough to filter from
    });

    // Filter case-insensitively in JS
    const filtered = reservations.filter((r) =>
      r.guestName.toLowerCase().includes(queryLower)
    );

    // Deduplicate by name (case-insensitive), merging phone/dni from different reservations
    const seen = new Map<string, { guestName: string; guestPhone: string | null; guestDni: string | null }>();
    for (const r of filtered) {
      const key = r.guestName.toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, {
          guestName: r.guestName,
          guestPhone: r.guestPhone || null,
          guestDni: r.guestDni || null,
        });
      } else {
        const existing = seen.get(key)!;
        if (!existing.guestPhone && r.guestPhone) existing.guestPhone = r.guestPhone;
        if (!existing.guestDni && r.guestDni) existing.guestDni = r.guestDni;
      }
    }

    const results = Array.from(seen.values()).slice(0, 20);
    return NextResponse.json(results);
  } catch (error) {
    console.error("[GUESTS_SEARCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
