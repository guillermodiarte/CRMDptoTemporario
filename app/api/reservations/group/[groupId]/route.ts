import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const session = await auth();
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const { groupId } = await params;

    const parts = await prisma.reservation.findMany({
      where: { groupId },
      orderBy: { checkIn: 'asc' },
      include: {
        department: true
      }
    });

    if (parts.length === 0) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const firstPart = parts[0];
    const lastPart = parts[parts.length - 1];

    const mergedTotal = parts.reduce((acc, p) => acc + p.totalAmount, 0);
    const mergedCleaning = parts.reduce((acc, p) => acc + p.cleaningFee, 0);
    const mergedDeposit = parts.reduce((acc, p) => acc + p.depositAmount, 0);
    const mergedAmenities = parts.reduce((acc, p) => acc + (p.amenitiesFee || 0), 0);

    const reconstructed = {
      ...firstPart,
      checkIn: firstPart.checkIn,
      checkOut: lastPart.checkOut,
      totalAmount: mergedTotal,
      cleaningFee: mergedCleaning,
      depositAmount: mergedDeposit,
      amenitiesFee: mergedAmenities,
    };

    return NextResponse.json(reconstructed);

  } catch (error) {
    console.log("[RESERVATION_GROUP_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
