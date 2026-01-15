
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { ReservationsClient } from "@/components/reservations-client";
import { redirect } from "next/navigation";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    redirect("/dashboard");
  }

  // Fetch config for currency rates
  const settings = await prisma.systemSettings.findMany();
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

  const reservations = await prisma.reservation.findMany({
    where: {
      OR: [
        { guestName: { contains: query } }, // Case insensitive usually depends on DB collation
        { guestPhone: { contains: query } }
      ]
    },
    include: {
      department: true,
    },
    orderBy: {
      checkIn: "desc",
    },
  });

  const departments = await prisma.department.findMany({
    where: { isActive: true },
  });

  // Fetch blacklist for client-side checking
  const blacklist = await prisma.blacklistEntry.findMany({
    where: { isActive: true },
    select: { guestPhone: true }
  });
  const blacklistedPhones = blacklist.map(b => b.guestPhone);


  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Resultados de búsqueda: "{query}"</h1>
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
