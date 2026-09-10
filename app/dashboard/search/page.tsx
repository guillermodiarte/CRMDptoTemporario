import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { ReservationsClient } from "@/components/reservations-client";
import { redirect } from "next/navigation";
import { normalizePhone } from "@/lib/phone-utils";

export const dynamic = 'force-dynamic';

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await auth();
  const user = session?.user;
  const sessionId = user?.sessionId;

  if (!user) {
    redirect("/dashboard");
  }

  // Fetch config for currency rates
  const settings = await prisma.systemSettings.findMany({
    where: { sessionId }
  });
  const dollarRate = Number(settings.find((s) => s.key === "DOLLAR_RATE")?.value || 1200);

  const { q } = await searchParams;
  const query = q || "";

  if (!query) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Búsqueda Global</h1>
        <p className="text-muted-foreground">Ingresa un término para buscar.</p>
      </div>
    )
  }

  // Normalize the search query to handle phone number variations
  const normalizedQuery = normalizePhone(query);
  const isLikelyPhone = /[\d\s\-+()]{4,}/.test(query);

  // Fetch all reservations for this session, then filter in-memory
  // so we can apply normalized phone matching regardless of stored format.
  // For performance, we pre-filter by name in DB when the query doesn't look like a phone.
  let reservations;

  if (isLikelyPhone && normalizedQuery.length >= 4) {
    // Query looks like a phone number: fetch all and filter by phone normalization
    const allReservations = await prisma.reservation.findMany({
      where: { sessionId },
      include: { department: true },
      orderBy: { checkIn: "desc" },
    });

    reservations = allReservations.filter((res) => {
      const normalizedStored = normalizePhone(res.guestPhone);
      // Match if query digits appear in normalized stored number
      const phoneMatch = normalizedStored.includes(normalizedQuery) ||
        (res.guestPhone || "").toLowerCase().includes(query.toLowerCase());
      // Also allow name search in case query happens to match a name
      const nameMatch = (res.guestName || "").toLowerCase().includes(query.toLowerCase());
      return phoneMatch || nameMatch;
    });
  } else {
    // Regular text search: name or raw phone contains the query
    const dbResults = await prisma.reservation.findMany({
      where: {
        sessionId,
        OR: [
          { guestName: { contains: query } },
          { guestPhone: { contains: query } },
        ],
      },
      include: { department: true },
      orderBy: { checkIn: "desc" },
    });
    reservations = dbResults;
  }

  const departments = await prisma.department.findMany({
    where: { isActive: true, sessionId },
  });

  // Fetch blacklist for client-side checking
  const blacklist = await prisma.blacklistEntry.findMany({
    where: { isActive: true, sessionId },
    select: { guestPhone: true }
  });
  const blacklistedPhones = blacklist.map(b => b.guestPhone);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Resultados de búsqueda: &quot;{query}&quot;</h1>
      </div>

      <ReservationsClient
        data={reservations}
        departments={departments}
        dollarRate={dollarRate}
        role={(user as any).role}
        blacklistedPhones={blacklistedPhones}
        hideMonthSelector={true}
      />
    </div>
  );
}
