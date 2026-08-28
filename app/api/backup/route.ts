import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();
    const user = session?.user as any;

    if (user?.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const sessionId = user.sessionId;
    if (!sessionId) {
      return new NextResponse("No session active", { status: 400 });
    }

    const [
      users,
      sessions,
      userSessions,
      departments,
      reservations,
      supplies,
      expenses,
      notes,
      blacklistEntries,
      systemSettings
    ] = await Promise.all([
      prisma.user.findMany(),
      prisma.session.findMany(),
      prisma.userSession.findMany(),
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
      version: 3, // V3 is Global Backup
      sourceSessionId: sessionId,
      data: {
        users,
        sessions,
        userSessions,
        departments: departments.map(d => ({ ...d, images: "[]" })),
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
    const user = session?.user as any;

    if (user?.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const sessionId = user.sessionId;
    if (!sessionId) {
      return new NextResponse("No session active", { status: 400 });
    }

    const body = await req.json();
    const { data, version } = body;

    if (!data) {
      return new NextResponse("Invalid backup format", { status: 400 });
    }

    // Prepare date parsers
    const parseDate = (d: any) => (d ? new Date(d) : undefined);

    await prisma.$transaction(async (tx) => {
      if (version >= 3) {
        // GLOBAL RESTORE (Version 3)
        // Delete all data across ALL sessions
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

        // Restore everything with EXACT IDs
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
              updatedAt: parseDate(item.updatedAt)
            }))
          });
        }

        if (data.sessions?.length) {
          await tx.session.createMany({
            data: data.sessions.map((item: any) => ({
              id: item.id,
              name: item.name,
              isActive: item.isActive,
              createdAt: parseDate(item.createdAt),
              updatedAt: parseDate(item.updatedAt)
            }))
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
              updatedAt: parseDate(item.updatedAt)
            }))
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
              prices: typeof item.prices === "string" ? item.prices : JSON.stringify(item.prices || {}),
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
              images: "[]",
              amenities: typeof item.amenities === "string" ? item.amenities : JSON.stringify(item.amenities || []),
              bedCount: item.bedCount,
              maxPeople: item.maxPeople,
              hasParking: item.hasParking,
              isActive: item.isActive,
              showOnPublic: item.showOnPublic !== false,
              isArchived: item.isArchived,
              createdAt: parseDate(item.createdAt),
              updatedAt: parseDate(item.updatedAt),
              sessionId: item.sessionId
            }))
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
              sessionId: item.sessionId
            }))
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
              guestDni: item.guestDni ?? null,
              guestNationality: item.guestNationality ?? null,
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
              sessionId: item.sessionId
            }))
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
              sessionId: item.sessionId
            }))
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
              sessionId: item.sessionId
            }))
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
              sessionId: item.sessionId
            }))
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
              sessionId: item.sessionId
            }))
          });
        }

      } else {
        // LEGACY RESTORE (Version < 3)
        // 1. Delete All Data for THIS Session (Order sensitive)

        await tx.userSession.deleteMany({ where: { sessionId } });
        await tx.note.deleteMany({ where: { sessionId } });
        await tx.blacklistEntry.deleteMany({ where: { sessionId } });
        await tx.expense.deleteMany({ where: { sessionId } });
        await tx.reservation.deleteMany({ where: { sessionId } });
        await tx.department.deleteMany({ where: { sessionId } });
        await tx.supply.deleteMany({ where: { sessionId } });
        await tx.systemSettings.deleteMany({ where: { sessionId } });

        // 2. Restore All with ID Remapping to ensure isolation

        const userIdMap = new Map<string, string>(); // Old User ID -> New/Existing User ID
        const deptIdMap = new Map<string, string>(); // Old Dept ID -> New Dept ID

        if (data.systemSettings?.length) {
          await tx.systemSettings.createMany({
            data: data.systemSettings.map((item: any) => ({
              key: item.key,
              value: item.value,
              updatedBy: item.updatedBy,
              updatedAt: parseDate(item.updatedAt),
              sessionId
            }))
          });
        }

        if (data.users?.length) {
          for (const userItem of data.users) {
            const upsertedUser = await tx.user.upsert({
              where: { email: userItem.email },
              update: {
                name: userItem.name,
                phone: userItem.phone,
                image: userItem.image,
              },
              create: {
                email: userItem.email,
                password: userItem.password || "temp1234",
                name: userItem.name,
                phone: userItem.phone,
                image: userItem.image,
                isActive: userItem.isActive ?? true,
              }
            });

            if (userItem.id) {
              userIdMap.set(userItem.id, upsertedUser.id);
            }

            const backupRole = userItem.sessions?.[0]?.role || "VISUALIZER";

            await tx.userSession.create({
              data: {
                userId: upsertedUser.id,
                sessionId,
                role: backupRole
              }
            });
          }
        }

        if (data.supplies?.length) {
          await tx.supply.createMany({
            data: data.supplies.map((item: any) => ({
              name: item.name,
              cost: item.cost,
              isActive: item.isActive,
              createdAt: parseDate(item.createdAt),
              updatedAt: parseDate(item.updatedAt),
              sessionId
            }))
          });
        }

        if (data.departments?.length) {
          for (const dept of data.departments) {
            const newDept = await tx.department.create({
              data: {
                type: dept.type,
                name: dept.name,
                description: dept.description,
                address: dept.address,
                wifiName: dept.wifiName,
                wifiPass: dept.wifiPass,
                alias: dept.alias,
                basePrice: dept.basePrice,
                prices: typeof dept.prices === "string" ? dept.prices : JSON.stringify(dept.prices || {}),
                cleaningFee: dept.cleaningFee,
                color: dept.color,
                googleMapsLink: dept.googleMapsLink,
                keyLocation: dept.keyLocation,
                lockBoxCode: dept.lockBoxCode,
                ownerName: dept.ownerName,
                meterLuz: dept.meterLuz,
                meterGas: dept.meterGas,
                meterAgua: dept.meterAgua,
                meterWifi: dept.meterWifi,
                inventoryNotes: dept.inventoryNotes,
                airbnbLink: dept.airbnbLink,
                bookingLink: dept.bookingLink,
                images: "[]",
                amenities: typeof dept.amenities === "string" ? dept.amenities : JSON.stringify(dept.amenities || []),
                bedCount: dept.bedCount,
                maxPeople: dept.maxPeople,
                hasParking: dept.hasParking,
                isActive: dept.isActive,
                showOnPublic: dept.showOnPublic !== false,
                isArchived: dept.isArchived,
                createdAt: parseDate(dept.createdAt),
                updatedAt: parseDate(dept.updatedAt),
                sessionId
              }
            });

            if (dept.id) {
              deptIdMap.set(dept.id, newDept.id);
            }
          }
        }

        if (data.reservations?.length) {
          for (const res of data.reservations) {
            const newDeptId = deptIdMap.get(res.departmentId);
            if (newDeptId) {
              await tx.reservation.create({
                data: {
                  departmentId: newDeptId,
                  source: res.source,
                  status: res.status,
                  guestName: res.guestName,
                  guestPhone: res.guestPhone,
                  guestDni: res.guestDni ?? null,
                  guestNationality: res.guestNationality ?? null,
                  guestPeopleCount: res.guestPeopleCount,
                  bedsRequired: res.bedsRequired,
                  checkIn: parseDate(res.checkIn)!,
                  checkOut: parseDate(res.checkOut)!,
                  totalAmount: res.totalAmount,
                  depositAmount: res.depositAmount,
                  cleaningFee: res.cleaningFee,
                  amenitiesFee: res.amenitiesFee,
                  currency: res.currency,
                  exchangeRate: res.exchangeRate,
                  paymentStatus: res.paymentStatus,
                  hasParking: res.hasParking,
                  notes: res.notes,
                  createdAt: parseDate(res.createdAt),
                  updatedAt: parseDate(res.updatedAt),
                  sessionId
                }
              });
            }
          }
        }

        if (data.expenses?.length) {
          for (const exp of data.expenses) {
            const newDeptId = exp.departmentId ? deptIdMap.get(exp.departmentId) : undefined;
            if (!exp.departmentId || newDeptId) {
              await tx.expense.create({
                data: {
                  type: exp.type,
                  description: exp.description,
                  amount: exp.amount,
                  quantity: exp.quantity,
                  unitPrice: exp.unitPrice,
                  date: parseDate(exp.date)!,
                  departmentId: newDeptId,
                  isDeleted: exp.isDeleted,
                  createdAt: parseDate(exp.createdAt),
                  updatedAt: parseDate(exp.updatedAt),
                  sessionId
                }
              });
            }
          }
        }

        if (data.blacklistEntries?.length) {
          for (const entry of data.blacklistEntries) {
            const newReporterId = entry.reportedById ? userIdMap.get(entry.reportedById) : null;
            await tx.blacklistEntry.create({
              data: {
                guestName: entry.guestName,
                guestPhone: entry.guestPhone,
                reason: entry.reason,
                reportedById: newReporterId,
                departmentName: entry.departmentName,
                checkIn: parseDate(entry.checkIn),
                checkOut: parseDate(entry.checkOut),
                totalAmount: entry.totalAmount,
                isActive: entry.isActive,
                createdAt: parseDate(entry.createdAt),
                updatedAt: parseDate(entry.updatedAt),
                sessionId
              }
            });
          }
        }

        if (data.notes?.length) {
          for (const note of data.notes) {
            const newUserId = userIdMap.get(note.userId);
            if (newUserId) {
              await tx.note.create({
                data: {
                  content: note.content,
                  userId: newUserId,
                  type: note.type,
                  createdAt: parseDate(note.createdAt),
                  updatedAt: parseDate(note.updatedAt),
                  sessionId
                }
              });
            }
          }
        }
      }
    });

    return NextResponse.json({ success: true, message: "Restoration complete" });

  } catch (error) {
    console.error("[BACKUP_IMPORT_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
