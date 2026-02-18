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
      departments,
      reservations,
      supplies,
      expenses,
      notes,
      blacklistEntries,
      systemSettings
    ] = await Promise.all([
      // Only users active in this session
      prisma.user.findMany({
        where: { sessions: { some: { sessionId } } },
        include: { sessions: { where: { sessionId } } } // Include the specific session role
      }),
      prisma.department.findMany({ where: { sessionId } }),
      prisma.reservation.findMany({ where: { sessionId } }),
      prisma.supply.findMany({ where: { sessionId } }),
      prisma.expense.findMany({ where: { sessionId } }),
      prisma.note.findMany({ where: { sessionId } }),
      prisma.blacklistEntry.findMany({ where: { sessionId } }),
      prisma.systemSettings.findMany({ where: { sessionId } }),
    ]);

    const backupData = {
      timestamp: new Date().toISOString(),
      version: 2,
      sourceSessionId: sessionId,
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
    const user = session?.user as any;

    if (user?.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const sessionId = user.sessionId;
    if (!sessionId) {
      return new NextResponse("No session active", { status: 400 });
    }

    const body = await req.json();
    const { data } = body;

    if (!data) {
      return new NextResponse("Invalid backup format", { status: 400 });
    }

    // Prepare date parsers
    const parseDate = (d: any) => (d ? new Date(d) : undefined);

    await prisma.$transaction(async (tx) => {
      // 1. Delete All Data for THIS Session (Order sensitive)

      // Delete relational data first to avoid FK constraints (Cascade might handle some)
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

      // A. System Settings (No dependencies)
      if (data.systemSettings?.length) {
        await tx.systemSettings.createMany({
          data: data.systemSettings.map((item: any) => ({
            key: item.key,
            value: item.value,
            updatedBy: item.updatedBy,
            updatedAt: parseDate(item.updatedAt),
            sessionId // Enforce current session
          }))
        });
      }

      // B. Users (Global - Dependencies for Allocations)
      // We must UPSERT users based on EMAIL.
      if (data.users?.length) {
        for (const userItem of data.users) {

          const upsertedUser = await tx.user.upsert({
            where: { email: userItem.email },
            update: {
              // Update basic info if needed
              name: userItem.name,
              phone: userItem.phone,
              image: userItem.image,
            },
            create: {
              // Let Prisma generate ID if new
              email: userItem.email,
              password: userItem.password || "temp1234",
              name: userItem.name,
              phone: userItem.phone,
              image: userItem.image,
              isActive: userItem.isActive ?? true,
            }
          });

          // Map the OLD ID (from backup) to the REAL ID (in DB)
          if (userItem.id) {
            userIdMap.set(userItem.id, upsertedUser.id);
          }

          // Create UserSession link
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

      // C. Supplies (No dependencies)
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

      // D. Departments (Generate NEW IDs)
      if (data.departments?.length) {
        for (const dept of data.departments) {
          // Create without specifying ID -> Prisma generates new CUID
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
              cleaningFee: dept.cleaningFee,
              color: dept.color,
              // Extended fields
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

              images: dept.images,
              bedCount: dept.bedCount,
              maxPeople: dept.maxPeople,
              hasParking: dept.hasParking,
              isActive: dept.isActive,
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

      // E. Reservations (Depends on Departments)
      if (data.reservations?.length) {
        for (const res of data.reservations) {
          const newDeptId = deptIdMap.get(res.departmentId);
          // Only import if dependency exists (skip if dept filtered/missing)
          if (newDeptId) {
            await tx.reservation.create({
              data: {
                departmentId: newDeptId, // Remapped
                source: res.source,
                status: res.status,
                guestName: res.guestName,
                guestPhone: res.guestPhone,
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

      // F. Expenses (Depends on Departments optionally)
      if (data.expenses?.length) {
        for (const exp of data.expenses) {
          const newDeptId = exp.departmentId ? deptIdMap.get(exp.departmentId) : undefined;

          // If expense had a dept but we lost it -> create unassigned expense OR skip? 
          // Better to create as unassigned if dept missing, or ensure integrity.
          // However, if dept was deleted in source session but expense remained (soft link?), 
          // here we assume deptId must be valid if present.

          if (!exp.departmentId || newDeptId) {
            await tx.expense.create({
              data: {
                type: exp.type,
                description: exp.description,
                amount: exp.amount,
                quantity: exp.quantity,
                unitPrice: exp.unitPrice,
                date: parseDate(exp.date)!,
                departmentId: newDeptId, // Remapped or undefined
                isDeleted: exp.isDeleted,
                createdAt: parseDate(exp.createdAt),
                updatedAt: parseDate(exp.updatedAt),
                sessionId
              }
            });
          }
        }
      }

      // G. Blacklist (Depends on Users for Reporter)
      if (data.blacklistEntries?.length) {
        for (const entry of data.blacklistEntries) {
          const newReporterId = entry.reportedById ? userIdMap.get(entry.reportedById) : null;
          // If reporter doesn't exist in imported user set, maybe it was a user deleted/inactive?
          // We set to null or keep raw ID if we trust it exists globally? 
          // Safer to rely on mapping or nullify securely.

          await tx.blacklistEntry.create({
            data: {
              guestName: entry.guestName,
              guestPhone: entry.guestPhone,
              reason: entry.reason,
              reportedById: newReporterId, // Remapped
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

      // H. Notes (Depends on Users)
      if (data.notes?.length) {
        for (const note of data.notes) {
          const newUserId = userIdMap.get(note.userId);
          if (newUserId) {
            await tx.note.create({
              data: {
                content: note.content,
                userId: newUserId, // Remapped
                type: note.type,
                createdAt: parseDate(note.createdAt),
                updatedAt: parseDate(note.updatedAt),
                sessionId
              }
            });
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
