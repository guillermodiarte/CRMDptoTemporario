import prisma from "@/lib/prisma";
import { ReservationsClient } from "@/components/reservations-client";
import { getDollarRate } from "@/lib/dollar";
import { auth } from "@/auth";

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string; year?: string }>;
}) {
  const session = await auth();
  const userRole = (session?.user as any)?.role;
  const params = await searchParams;
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const selectedMonth = params?.month ? parseInt(params.month) : currentMonth;
  const selectedYear = params?.year ? parseInt(params.year) : currentYear;

  const startDate = new Date(selectedYear, selectedMonth, 1);
  const endDate = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);

  const reservations = await prisma.reservation.findMany({
    where: {
      status: { not: "CANCELLED" },
      checkIn: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: { department: true },
    orderBy: { checkIn: "asc" },
  });

  const departments = await prisma.department.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" }
  });

  const blacklistEntries = await prisma.blacklistEntry.findMany({
    where: { isActive: true },
    select: { guestPhone: true, reason: true, guestName: true }
  });

  const blacklistedPhones = blacklistEntries.map(entry => entry.guestPhone);

  const dollarRate = await getDollarRate();

  // Fetch customizable year range
  const yearSettings = await prisma.systemSettings.findMany({
    where: {
      key: { in: ["RESERVATION_YEAR_START", "RESERVATION_YEAR_END"] }
    }
  });

  const startYearSetting = yearSettings.find(s => s.key === "RESERVATION_YEAR_START")?.value;
  const endYearSetting = yearSettings.find(s => s.key === "RESERVATION_YEAR_END")?.value;

  const configStartYear = startYearSetting ? parseInt(startYearSetting) : currentYear;
  const configEndYear = endYearSetting ? parseInt(endYearSetting) : currentYear + 10;

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <ReservationsClient
        data={reservations as any}
        departments={departments}
        dollarRate={dollarRate}
        role={userRole}
        blacklistedPhones={blacklistedPhones}
        blacklistEntries={blacklistEntries}
        startYear={configStartYear}
        endYear={configEndYear}
      />
    </div>
  );
}
