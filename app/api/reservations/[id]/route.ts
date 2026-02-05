import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { calculateReservationSplits } from "@/lib/reservation-logic";
import { revalidatePath } from "next/cache";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const { id } = await params;
    const body = await req.json();

    // Fetch current reservation to check groupId
    const currentRes = await prisma.reservation.findUnique({ where: { id } });
    if (!currentRes) return new NextResponse("Not Found", { status: 404 });

    const isGroupUpdate = !!currentRes.groupId && (
      body.checkIn || body.checkOut || body.totalAmount !== undefined
    );

    if (isGroupUpdate) {
      const parts = await prisma.reservation.findMany({ where: { groupId: currentRes.groupId } });
      const primaryPart = parts.find(p => p.cleaningFee > 0) || parts[0];

      parts.sort((a, b) => a.checkIn.getTime() - b.checkIn.getTime());
      const firstPart = parts[0];

      // Prepare merged data
      const newStart = body.checkIn ? new Date(`${body.checkIn}T12:00:00`) : parts[0].checkIn;

      const existingEnd = parts[parts.length - 1].checkOut;
      const newEnd = body.checkOut ? new Date(`${body.checkOut}T12:00:00`) : existingEnd;

      const mergedTotal = body.totalAmount !== undefined
        ? Number(body.totalAmount)
        : parts.reduce((acc, p) => acc + p.totalAmount, 0);

      const mergedCleaning = body.cleaningFee !== undefined
        ? Number(body.cleaningFee)
        : parts.reduce((acc, p) => acc + p.cleaningFee, 0);

      const mergedDeposit = body.depositAmount !== undefined
        ? Number(body.depositAmount)
        : parts.reduce((acc, p) => acc + p.depositAmount, 0);

      const mergedAmenities = body.amenitiesFee !== undefined
        ? Number(body.amenitiesFee)
        : parts.reduce((acc, p) => acc + (p.amenitiesFee || 0), 0);


      const splits = calculateReservationSplits(
        newStart, newEnd, mergedTotal, mergedCleaning, mergedDeposit, mergedAmenities
      );

      const groupId = currentRes.groupId;

      await prisma.$transaction(async (tx) => {
        await tx.reservation.deleteMany({ where: { groupId } });
        await Promise.all(splits.map(split => tx.reservation.create({
          data: {
            departmentId: body.departmentId || firstPart.departmentId,
            guestName: body.guestName || firstPart.guestName,
            guestPhone: body.guestPhone || firstPart.guestPhone,
            guestPeopleCount: body.guestPeopleCount !== undefined ? Number(body.guestPeopleCount) : firstPart.guestPeopleCount,
            bedsRequired: body.bedsRequired !== undefined ? Number(body.bedsRequired) : (firstPart.bedsRequired || 1),
            checkIn: split.checkIn,
            checkOut: split.checkOut,
            totalAmount: split.totalAmount,
            depositAmount: split.depositAmount,
            cleaningFee: split.cleaningFee,
            amenitiesFee: split.amenitiesFee,
            currency: body.currency || firstPart.currency,
            paymentStatus: body.paymentStatus || firstPart.paymentStatus,
            source: body.source || firstPart.source,
            notes: body.notes || firstPart.notes,
            hasParking: body.hasParking !== undefined ? !!body.hasParking : firstPart.hasParking,
            status: (body.status || firstPart.status) as any,
            groupId: groupId
          }
        })));
      });

      revalidatePath("/dashboard/reservations");
      revalidatePath("/dashboard/calendar");
      revalidatePath("/dashboard/finance");

      return NextResponse.json({ message: "Group updated", groupId });

    } else {
      // STANDARD SINGLE UPDATE OR SPECIAL PROPAGATION
      if (currentRes.groupId && body.paymentStatus === 'PAID') {
        // Propagate PAID status to all siblings and clear debt
        const siblings = await prisma.reservation.findMany({ where: { groupId: currentRes.groupId } });

        await prisma.$transaction(
          siblings.map(sib => prisma.reservation.update({
            where: { id: sib.id },
            data: {
              paymentStatus: 'PAID',
              depositAmount: sib.totalAmount // Clear debt for each part
            }
          }))
        );

        const updated = await prisma.reservation.findUnique({ where: { id } });

        revalidatePath("/dashboard/reservations");
        revalidatePath("/dashboard/calendar");
        revalidatePath("/dashboard/finance");

        return NextResponse.json(updated);
      }

      const {
        departmentId,
        guestName,
        guestPhone,
        guestPeopleCount,
        bedsRequired,
        checkIn,
        checkOut,
        totalAmount,
        depositAmount,
        cleaningFee,
        amenitiesFee,
        currency,
        paymentStatus,
        source,
        hasParking,
        notes,
        status,
        force
      } = body;

      const start = checkIn ? new Date(`${checkIn}T12:00:00Z`) : undefined;
      const end = checkOut ? new Date(`${checkOut}T12:00:00Z`) : undefined;

      // Check current dates if not provided
      const effectiveStart = start || currentRes.checkIn;
      const effectiveEnd = end || currentRes.checkOut;

      if (effectiveStart >= effectiveEnd) {
        return new NextResponse("Check-out must be after check-in", { status: 400 });
      }

      // Check overlaps if dates or department changed
      if ((start || end || departmentId) && !force) {
        const targetDept = departmentId || currentRes.departmentId;
        const overlaps = await prisma.reservation.findMany({
          where: {
            departmentId: targetDept,
            id: { not: id }, // Exclude self
            status: { not: "CANCELLED" },
            paymentStatus: { not: "CANCELLED" },
            OR: [
              {
                checkIn: { lt: effectiveEnd },
                checkOut: { gt: effectiveStart }
              }
            ]
          }
        });

        if (overlaps.length > 0) {
          return new NextResponse("Overlap detected", { status: 409 });
        }
      }

      const reservation = await prisma.reservation.update({
        where: { id },
        data: {
          departmentId,
          guestName,
          guestPhone,
          guestPeopleCount: guestPeopleCount ? Number(guestPeopleCount) : undefined,
          bedsRequired: bedsRequired ? Number(bedsRequired) : undefined,
          checkIn: start,
          checkOut: end,
          totalAmount: totalAmount !== undefined ? Number(totalAmount) : undefined,
          depositAmount: depositAmount !== undefined ? Number(depositAmount) : undefined,
          cleaningFee: cleaningFee !== undefined ? Number(cleaningFee) : undefined,
          amenitiesFee: amenitiesFee !== undefined ? Number(amenitiesFee) : undefined,
          currency,
          paymentStatus,
          source,
          notes,
          hasParking,
          status: status as any
        },
      });

      revalidatePath("/dashboard/reservations");
      revalidatePath("/dashboard/calendar");
      revalidatePath("/dashboard/finance");

      return NextResponse.json(reservation);
    }

  } catch (error) {
    console.log("[RESERVATION_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const { id } = await params;

    // Check for groupId
    const res = await prisma.reservation.findUnique({ where: { id } });

    if (res && res.groupId) {
      // Delete entire group
      await prisma.reservation.deleteMany({
        where: { groupId: res.groupId }
      });

      revalidatePath("/dashboard/reservations");
      revalidatePath("/dashboard/calendar");
      revalidatePath("/dashboard/finance");

      return NextResponse.json({ message: "Group deleted" });
    } else {
      const reservation = await prisma.reservation.delete({
        where: { id }
      });

      revalidatePath("/dashboard/reservations");
      revalidatePath("/dashboard/calendar");
      revalidatePath("/dashboard/finance");

      return NextResponse.json(reservation);
    }

  } catch (error) {
    console.log("[RESERVATION_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
