import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { calculateReservationSplits } from "@/lib/reservation-logic";

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
        return NextResponse.json(updated);
      }

      const reservation = await prisma.reservation.update({
        where: { id },
        data: {
          departmentId: body.departmentId,
          guestName: body.guestName,
          guestPhone: body.guestPhone,
          guestPeopleCount: body.guestPeopleCount !== undefined ? Number(body.guestPeopleCount) : undefined,
          checkIn: body.checkIn ? new Date(`${body.checkIn}T12:00:00`) : undefined,
          checkOut: body.checkOut ? new Date(`${body.checkOut}T12:00:00`) : undefined,
          totalAmount: body.totalAmount !== undefined ? Number(body.totalAmount) : undefined,
          depositAmount: body.depositAmount !== undefined ? Number(body.depositAmount) : undefined,
          cleaningFee: body.cleaningFee !== undefined ? Number(body.cleaningFee) : undefined,
          amenitiesFee: body.amenitiesFee !== undefined ? Number(body.amenitiesFee) : undefined,
          currency: body.currency,
          paymentStatus: body.paymentStatus,
          source: body.source,
          notes: body.notes,
          hasParking: body.hasParking !== undefined ? !!body.hasParking : undefined,
          status: body.status
        },
      });
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
      return NextResponse.json({ message: "Group deleted" });
    } else {
      const reservation = await prisma.reservation.delete({
        where: { id }
      });
      return NextResponse.json(reservation);
    }

  } catch (error) {
    console.log("[RESERVATION_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
