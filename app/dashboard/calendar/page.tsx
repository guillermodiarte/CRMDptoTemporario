import prisma from "@/lib/prisma";
import { GlobalCalendar } from "@/components/global-calendar";
import { addMonths, startOfMonth, endOfMonth, subMonths } from "date-fns";

export default async function CalendarPage({ searchParams }: { searchParams: { date?: string } }) {
  // Default to current month window
  const departments = await prisma.department.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      images: true,
      address: true,
      bedCount: true,
      isActive: true,
      color: true
    }
  });

  // Fetch reservations server-side or let client fetch?
  // Server fetching is better.
  // Window: Fetch enough for Month view navigation buffering
  const today = new Date();
  const start = startOfMonth(subMonths(today, 1));
  const end = endOfMonth(addMonths(today, 2));

  const reservations = await prisma.reservation.findMany({
    where: {
      status: { not: "CANCELLED" },
      OR: [
        {
          checkIn: { lte: end },
          checkOut: { gte: start },
        }
      ]
    },
    select: {
      id: true,
      departmentId: true,
      checkIn: true,
      checkOut: true,
      guestName: true,
      guestPhone: true,
      status: true,
      paymentStatus: true,
      totalAmount: true,
      depositAmount: true,
      currency: true,
      department: {
        select: {
          name: true
        }
      }
    }
  });

  const blacklistEntries = await prisma.blacklistEntry.findMany({
    where: { isActive: true },
    select: { guestName: true, guestPhone: true }
  });

  const processedReservations = reservations.map(res => {
    const isBlacklisted = blacklistEntries.some(entry => {
      const normalize = (s: string) => s.toLowerCase().trim();
      const resName = normalize(res.guestName);
      const entryName = normalize(entry.guestName);
      // Simple name match or inclusion? strict match is safer for now to avoid false positives on 'Juan'
      // But 'Juan Perez' vs 'Juan Perez ' should match.
      return resName === entryName || (entry.guestPhone && res.guestPhone === entry.guestPhone); // Phone is usually safer
    });

    return { ...res, isBlacklisted, departmentName: res.department.name };
  });

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] space-y-2">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Calendario</h2>
      </div>
      <div className="flex-1 border rounded-md overflow-hidden bg-card min-h-0">
        <GlobalCalendar departments={departments} reservations={processedReservations} />
      </div>
    </div>
  );
}
