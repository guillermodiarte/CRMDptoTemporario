import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();
    if ((session?.user as any)?.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const [
      users,
      departments,
      reservations,
      supplies,
      expenses,
      notes,
      blacklistEntries,
      systemSettings
    ] = await Promise.all([
      prisma.user.findMany(),
      prisma.department.findMany(),
      prisma.reservation.findMany(),
      prisma.supply.findMany(),
      prisma.expense.findMany(),
      prisma.note.findMany(),
      prisma.blacklistEntry.findMany(),
      prisma.systemSettings.findMany(),
    ]);

    const backupData = {
      timestamp: new Date().toISOString(),
      version: 1,
      data: {
        users,
        departments,
        reservations,
        supplies,
        expenses,
        notes,
        blacklistEntries,
        systemSettings
      }
    };

    return NextResponse.json(backupData);
  } catch (error) {
    console.error("[BACKUP_EXPORT_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if ((session?.user as any)?.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { data } = body;

    if (!data || !data.users || !data.departments) {
      return new NextResponse("Invalid backup format", { status: 400 });
    }

    // Prepare date parsers
    const parseDate = (d: any) => (d ? new Date(d) : undefined);

    await prisma.$transaction(async (tx) => {
      // 1. Delete All (Order sensitive)
      await tx.note.deleteMany();
      await tx.blacklistEntry.deleteMany();
      await tx.expense.deleteMany();
      await tx.reservation.deleteMany();
      await tx.department.deleteMany();
      await tx.supply.deleteMany();
      await tx.user.deleteMany();
      await tx.systemSettings.deleteMany();

      // 2. Restore All (Order sensitive)
      // System Settings
      if (data.systemSettings?.length) {
        // createMany is supported on SQLite in newer Prisma, checking if it works.
        // If it throws, we might need a map. But let's try createMany first for speed.
        // Actually, for SQLite createMany only works if using `prisma-client-js` > 4.x.
        // Assuming we have it. 
        // Note: SQLite doesn't support `skipDuplicates` in createMany easily.
        await tx.systemSettings.createMany({
          data: data.systemSettings.map((item: any) => ({
            ...item,
            updatedAt: parseDate(item.updatedAt)
          }))
        });
      }

      // Users
      if (data.users?.length) {
        await tx.user.createMany({
          data: data.users.map((item: any) => ({
            ...item,
            createdAt: parseDate(item.createdAt),
            updatedAt: parseDate(item.updatedAt)
          }))
        });
      }

      // Supplies
      if (data.supplies?.length) {
        await tx.supply.createMany({
          data: data.supplies.map((item: any) => ({
            ...item,
            createdAt: parseDate(item.createdAt),
            updatedAt: parseDate(item.updatedAt)
          }))
        });
      }

      // Departments
      if (data.departments?.length) {
        await tx.department.createMany({
          data: data.departments.map((item: any) => ({
            ...item,
            createdAt: parseDate(item.createdAt),
            updatedAt: parseDate(item.updatedAt)
          }))
        });
      }

      // Reservations
      if (data.reservations?.length) {
        await tx.reservation.createMany({
          data: data.reservations.map((item: any) => ({
            ...item,
            checkIn: parseDate(item.checkIn),
            checkOut: parseDate(item.checkOut),
            createdAt: parseDate(item.createdAt),
            updatedAt: parseDate(item.updatedAt)
          }))
        });
      }

      // Expenses
      if (data.expenses?.length) {
        await tx.expense.createMany({
          data: data.expenses.map((item: any) => ({
            ...item,
            date: parseDate(item.date),
            createdAt: parseDate(item.createdAt),
            updatedAt: parseDate(item.updatedAt)
          }))
        });
      }

      // BlacklistEntries
      if (data.blacklistEntries?.length) {
        await tx.blacklistEntry.createMany({
          data: data.blacklistEntries.map((item: any) => ({
            ...item,
            checkIn: parseDate(item.checkIn),
            checkOut: parseDate(item.checkOut),
            createdAt: parseDate(item.createdAt),
            updatedAt: parseDate(item.updatedAt)
          }))
        });
      }

      // Notes
      if (data.notes?.length) {
        await tx.note.createMany({
          data: data.notes.map((item: any) => ({
            ...item,
            createdAt: parseDate(item.createdAt),
            updatedAt: parseDate(item.updatedAt)
          }))
        });
      }
    });

    return NextResponse.json({ success: true, message: "Restoration complete" });
  } catch (error) {
    console.error("[BACKUP_IMPORT_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
