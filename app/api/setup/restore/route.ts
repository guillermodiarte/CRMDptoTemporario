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
    const { data, version } = body;

    if (!data) {
      return NextResponse.json({ error: "Formato de backup inválido" }, { status: 400 });
    }

    const parseDate = (d: any) => (d ? new Date(d) : undefined);

    await prisma.$transaction(async (tx) => {
      // Full global restore (same as V3 in /api/backup)
      await tx.userSession.deleteMany();
      await tx.note.deleteMany();
      await tx.blacklistEntry.deleteMany();
      await tx.expense.deleteMany();
      await tx.reservation.deleteMany();
      await tx.department.deleteMany();
      await tx.supply.deleteMany();
      await tx.systemSettings.deleteMany();
      await tx.session.deleteMany();
      await tx.user.deleteMany();

      if (data.users?.length) {
        await tx.user.createMany({
          data: data.users.map((item: any) => ({
            id: item.id,
            email: item.email,
            password: item.password,
            name: item.name,
            phone: item.phone,
            image: item.image,
            isActive: item.isActive,
            isSuperAdmin: item.isSuperAdmin,
            createdAt: parseDate(item.createdAt),
            updatedAt: parseDate(item.updatedAt),
          })),
        });
      }

      if (data.sessions?.length) {
        await tx.session.createMany({
          data: data.sessions.map((item: any) => ({
            id: item.id,
            name: item.name,
            isActive: item.isActive,
            createdAt: parseDate(item.createdAt),
            updatedAt: parseDate(item.updatedAt),
          })),
        });
      }

      if (data.userSessions?.length) {
        await tx.userSession.createMany({
          data: data.userSessions.map((item: any) => ({
            id: item.id,
            userId: item.userId,
            sessionId: item.sessionId,
            role: item.role,
            createdAt: parseDate(item.createdAt),
            updatedAt: parseDate(item.updatedAt),
          })),
        });
      }

      if (data.departments?.length) {
        await tx.department.createMany({
          data: data.departments.map((item: any) => ({
            id: item.id,
            type: item.type,
            name: item.name,
            description: item.description,
            address: item.address,
            wifiName: item.wifiName,
            wifiPass: item.wifiPass,
            alias: item.alias,
            basePrice: item.basePrice,
            cleaningFee: item.cleaningFee,
            color: item.color,
            googleMapsLink: item.googleMapsLink,
            keyLocation: item.keyLocation,
            lockBoxCode: item.lockBoxCode,
            ownerName: item.ownerName,
            meterLuz: item.meterLuz,
            meterGas: item.meterGas,
            meterAgua: item.meterAgua,
            meterWifi: item.meterWifi,
            inventoryNotes: item.inventoryNotes,
            airbnbLink: item.airbnbLink,
            bookingLink: item.bookingLink,
            images: item.images,
            bedCount: item.bedCount,
            maxPeople: item.maxPeople,
            hasParking: item.hasParking,
            isActive: item.isActive,
            isArchived: item.isArchived,
            createdAt: parseDate(item.createdAt),
            updatedAt: parseDate(item.updatedAt),
            sessionId: item.sessionId,
          })),
        });
      }

      if (data.supplies?.length) {
        await tx.supply.createMany({
          data: data.supplies.map((item: any) => ({
            id: item.id,
            name: item.name,
            cost: item.cost,
            isActive: item.isActive,
            createdAt: parseDate(item.createdAt),
            updatedAt: parseDate(item.updatedAt),
            sessionId: item.sessionId,
          })),
        });
      }

      if (data.reservations?.length) {
        await tx.reservation.createMany({
          data: data.reservations.map((item: any) => ({
            id: item.id,
            departmentId: item.departmentId,
            source: item.source,
            status: item.status,
            guestName: item.guestName,
            guestPhone: item.guestPhone,
            guestPeopleCount: item.guestPeopleCount,
            bedsRequired: item.bedsRequired,
            checkIn: parseDate(item.checkIn)!,
            checkOut: parseDate(item.checkOut)!,
            totalAmount: item.totalAmount,
            depositAmount: item.depositAmount,
            cleaningFee: item.cleaningFee,
            amenitiesFee: item.amenitiesFee,
            groupId: item.groupId,
            currency: item.currency,
            exchangeRate: item.exchangeRate,
            paymentStatus: item.paymentStatus,
            hasParking: item.hasParking,
            notes: item.notes,
            createdAt: parseDate(item.createdAt),
            updatedAt: parseDate(item.updatedAt),
            sessionId: item.sessionId,
          })),
        });
      }

      if (data.expenses?.length) {
        await tx.expense.createMany({
          data: data.expenses.map((item: any) => ({
            id: item.id,
            type: item.type,
            description: item.description,
            amount: item.amount,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            date: parseDate(item.date)!,
            departmentId: item.departmentId,
            isDeleted: item.isDeleted,
            createdAt: parseDate(item.createdAt),
            updatedAt: parseDate(item.updatedAt),
            sessionId: item.sessionId,
          })),
        });
      }

      if (data.blacklistEntries?.length) {
        await tx.blacklistEntry.createMany({
          data: data.blacklistEntries.map((item: any) => ({
            id: item.id,
            guestName: item.guestName,
            guestPhone: item.guestPhone,
            reason: item.reason,
            reportedById: item.reportedById,
            departmentName: item.departmentName,
            checkIn: parseDate(item.checkIn),
            checkOut: parseDate(item.checkOut),
            totalAmount: item.totalAmount,
            isActive: item.isActive,
            createdAt: parseDate(item.createdAt),
            updatedAt: parseDate(item.updatedAt),
            sessionId: item.sessionId,
          })),
        });
      }

      if (data.notes?.length) {
        await tx.note.createMany({
          data: data.notes.map((item: any) => ({
            id: item.id,
            content: item.content,
            userId: item.userId,
            type: item.type,
            createdAt: parseDate(item.createdAt),
            updatedAt: parseDate(item.updatedAt),
            sessionId: item.sessionId,
          })),
        });
      }

      if (data.systemSettings?.length) {
        await tx.systemSettings.createMany({
          data: data.systemSettings.map((item: any) => ({
            id: item.id,
            key: item.key,
            value: item.value,
            updatedAt: parseDate(item.updatedAt),
            updatedBy: item.updatedBy,
            sessionId: item.sessionId,
          })),
        });
      }
    });

    return NextResponse.json({ success: true, message: "Base de datos restaurada correctamente" });
  } catch (error) {
    console.error("[SETUP_RESTORE_ERROR]", error);
    return NextResponse.json({ error: "Error interno al restaurar la base de datos" }, { status: 500 });
  }
}
