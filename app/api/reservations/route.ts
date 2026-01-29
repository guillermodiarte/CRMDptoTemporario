import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { calculateReservationSplits } from "@/lib/reservation-logic";
import { revalidatePath } from "next/cache";

// Using native crypto for UUID
const generateUUID = () => crypto.randomUUID();

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const { searchParams } = new URL(req.url);
    const fromStr = searchParams.get("from");
    const toStr = searchParams.get("to");
    const departmentId = searchParams.get("departmentId");

    const whereClause: any = {
      status: { not: "CANCELLED" }
    };

    if (departmentId) {
      whereClause.departmentId = departmentId;
    }

    if (fromStr && toStr) {
      whereClause.OR = [
        {
          checkIn: {
            lte: new Date(toStr),
          },
          checkOut: {
            gte: new Date(fromStr),
          },
        },
      ];
    }

    const reservations = await prisma.reservation.findMany({
      where: whereClause,
      include: {
        department: {
          select: { name: true }
        }
      },
      orderBy: { checkIn: 'asc' }
    });

    return NextResponse.json(reservations);
  } catch (error) {
    console.log("[RESERVATIONS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const body = await req.json();
    const {
      departmentId, guestName, guestPhone, guestPeopleCount, bedsRequired,
      checkIn, checkOut, totalAmount, depositAmount, cleaningFee,
      currency, paymentStatus, source, notes, force, hasParking
    } = body;

    if (!departmentId || !guestName || !checkIn || !checkOut || totalAmount === undefined) {
      return new NextResponse("Missing fields", { status: 400 });
    }

    const start = new Date(`${checkIn}T12:00:00Z`);
    const end = new Date(`${checkOut}T12:00:00Z`);

    if (start >= end) {
      return new NextResponse("Check-out must be after check-in", { status: 400 });
    }

    // Overlap Check
    const overlaps = await prisma.reservation.findMany({
      where: {
        departmentId,
        status: { not: "CANCELLED" },
        OR: [
          {
            checkIn: { lt: end },
            checkOut: { gt: start }
          }
        ]
      }
    });

    if (overlaps.length > 0 && !force) {
      return new NextResponse("Overlap detected", { status: 409 });
    }

    // Fetch active supplies for snapshot
    const supplies = await prisma.supply.findMany({ where: { isActive: true } });
    const amenitiesFee = supplies.reduce((acc, curr) => acc + curr.cost, 0);

    // SPLITTING LOGIC
    const splits = calculateReservationSplits(
      start, end,
      Number(totalAmount),
      Number(cleaningFee || 0),
      Number(depositAmount || 0),
      amenitiesFee
    );

    const groupId = splits.length > 1 ? generateUUID() : null;

    // Transaction to create all parts
    const reservations = await prisma.$transaction(async (prisma) => {
      const createdReservations = await Promise.all(
        splits.map(split => prisma.reservation.create({
          data: {
            departmentId,
            guestName,
            guestPhone,
            guestPeopleCount: Number(guestPeopleCount),
            bedsRequired: bedsRequired !== undefined ? Number(bedsRequired) : 1, // Default to 1 if missing (allow 0 for parking)
            checkIn: split.checkIn,
            checkOut: split.checkOut,
            totalAmount: split.totalAmount,
            depositAmount: split.depositAmount, // Logic handled in utility
            cleaningFee: split.cleaningFee,     // Logic handled in utility
            amenitiesFee: split.amenitiesFee,   // Logic handled in utility
            currency: currency || "ARS",
            paymentStatus: paymentStatus || "UNPAID",
            source: source || "DIRECT",
            notes,
            hasParking: !!hasParking,
            status: "CONFIRMED",
            groupId: groupId
          }
        }))
      );

      // If parking is requested, create a ParkingRental entry
      return createdReservations;
    });

    revalidatePath("/dashboard/reservations");
    revalidatePath("/dashboard/calendar");
    revalidatePath("/dashboard/finance");

    return NextResponse.json(reservations[0]);

  } catch (error) {
    console.log("[RESERVATIONS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
