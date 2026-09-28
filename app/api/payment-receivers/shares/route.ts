import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

// PUT: Bulk update profit share percentages for payment receivers
export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const role = session.user?.role;
    if (role !== "ADMIN") return new NextResponse("Forbidden", { status: 403 });

    const sessionId = session.user?.sessionId;
    if (!sessionId) return new NextResponse("No session", { status: 400 });

    const body = await req.json();
    const { shares } = body as { shares: { id: string; profitSharePercent: number }[] };

    if (!Array.isArray(shares) || shares.length === 0) {
      return new NextResponse("Invalid shares list", { status: 400 });
    }

    // Verify all receivers belong to this session
    const receiverIds = shares.map((s) => s.id);
    const existing = await prisma.paymentReceiver.findMany({
      where: { id: { in: receiverIds }, sessionId, isActive: true },
    });

    if (existing.length !== shares.length) {
      return new NextResponse("Some receivers not found or unauthorized", { status: 404 });
    }

    // Validate that sum equals 100% (with small tolerance for rounding like 33.3 + 33.3 + 33.4 = 100)
    const total = shares.reduce((acc, curr) => acc + (Number(curr.profitSharePercent) || 0), 0);
    if (Math.abs(total - 100) > 0.5 && total !== 0) {
      return new NextResponse(`Total percentage must equal 100% (currently ${total.toFixed(1)}%)`, {
        status: 400,
      });
    }

    // Update in transaction
    await prisma.$transaction(
      shares.map((share) =>
        prisma.paymentReceiver.update({
          where: { id: share.id },
          data: {
            profitSharePercent: Math.min(100, Math.max(0, Number(share.profitSharePercent) || 0)),
          },
        })
      )
    );

    revalidatePath("/dashboard/balance");
    revalidatePath("/dashboard/balance/config");

    const updated = await prisma.paymentReceiver.findMany({
      where: { sessionId, isActive: true },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PAYMENT_RECEIVERS_SHARES_PUT]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
