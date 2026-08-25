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
  const sessionId = session?.user?.sessionId;

  const params = await searchParams;
  // Adjust for Argentina Time (UTC-3) to prevent "next day" issues at night
  const now = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const selectedMonth = params?.month ? parseInt(params.month) : currentMonth;
  const selectedYear = params?.year ? parseInt(params.year) : currentYear;

  const startDate = new Date(selectedYear, selectedMonth, 1);
  const endDate = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);

  const reservations = await prisma.reservation.findMany({
    where: {
      sessionId,
      status: { not: 'PENDING_APPROVAL' },
      checkIn: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: { department: true },
    orderBy: { checkIn: "asc" },
  });

  const groupIds = Array.from(new Set(reservations.filter(r => r.groupId).map(r => r.groupId as string)));
  
  let groupTotals: Record<string, { totalAmount: number, depositAmount: number, isMultiDept: boolean }> = {};
  if (groupIds.length > 0) {
    const groupParts = await prisma.reservation.findMany({
      where: { groupId: { in: groupIds }, status: { not: 'PENDING_APPROVAL' } },
      select: { groupId: true, totalAmount: true, depositAmount: true, departmentId: true }
    });
    
    groupTotals = groupParts.reduce((acc, curr) => {
      if (!acc[curr.groupId!]) {
        acc[curr.groupId!] = { totalAmount: 0, depositAmount: 0, isMultiDept: false, _deptIds: new Set() } as any;
      }
      acc[curr.groupId!].totalAmount += curr.totalAmount;
      acc[curr.groupId!].depositAmount += curr.depositAmount;
      (acc[curr.groupId!] as any)._deptIds.add(curr.departmentId);
      return acc;
    }, {} as Record<string, { totalAmount: number, depositAmount: number, isMultiDept: boolean, _deptIds?: Set<string> }>);

    // Mark groups with more than one distinct department
    for (const groupId in groupTotals) {
      const deptIds = (groupTotals[groupId] as any)._deptIds as Set<string>;
      groupTotals[groupId].isMultiDept = deptIds.size > 1;
      delete (groupTotals[groupId] as any)._deptIds;
    }
  }

  const enhancedReservations = reservations.map(r => {
    if (r.groupId && groupTotals[r.groupId]) {
      const group = groupTotals[r.groupId];
      // Only show group total for same-dept splits (month splits), not multi-dept combinations
      if (!group.isMultiDept) {
        return {
          ...r,
          groupTotalAmount: group.totalAmount,
          groupDepositAmount: group.depositAmount,
        };
      }
    }
    return r;
  });

  const departments = await prisma.department.findMany({
    where: { isActive: true, sessionId },
    orderBy: { name: "asc" }
  });

  const blacklistEntries = await prisma.blacklistEntry.findMany({
    where: { isActive: true, sessionId },
    select: { guestPhone: true, reason: true, guestName: true }
  });

  const blacklistedPhones = blacklistEntries.map(entry => entry.guestPhone);

  const dollarRate = await getDollarRate();

  // Fetch customizable year range
  const yearSettings = await prisma.systemSettings.findMany({
    where: {
      key: { in: ["RESERVATION_YEAR_START", "RESERVATION_YEAR_END"] },
      sessionId
    }
  });

  const startYearSetting = yearSettings.find(s => s.key === "RESERVATION_YEAR_START")?.value;
  const endYearSetting = yearSettings.find(s => s.key === "RESERVATION_YEAR_END")?.value;

  const configStartYear = startYearSetting ? parseInt(startYearSetting) : currentYear;
  const configEndYear = endYearSetting ? parseInt(endYearSetting) : currentYear + 10;

  return (
    <div className="flex-1 space-y-4">
      <ReservationsClient
        data={enhancedReservations as any}
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
