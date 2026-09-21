import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

// GET: list payment receivers for the current session
export async function GET() {
  try {
    const session = await auth();
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const sessionId = session.user?.sessionId;
    if (!sessionId) return new NextResponse("No session", { status: 400 });

    const receivers = await prisma.paymentReceiver.findMany({
      where: { sessionId, isActive: true },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json(receivers);
  } catch (error) {
    console.error("[PAYMENT_RECEIVERS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// POST: create a new payment receiver (ADMIN only)
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const role = session.user?.role;
    if (role !== "ADMIN") return new NextResponse("Forbidden", { status: 403 });

    const sessionId = session.user?.sessionId;
    if (!sessionId) return new NextResponse("No session", { status: 400 });

    const body = await req.json();
    const { name, accountInfo, isDefault, order, profitSharePercent } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return new NextResponse("Name is required", { status: 400 });
    }

    // If this is set as default, clear other defaults first
    if (isDefault) {
      await prisma.paymentReceiver.updateMany({
        where: { sessionId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const receiver = await prisma.paymentReceiver.create({
      data: {
        name: name.trim(),
        accountInfo: accountInfo?.trim() || null,
        isDefault: !!isDefault,
        order: order !== undefined ? Number(order) : 0,
        profitSharePercent: profitSharePercent !== undefined ? Math.min(100, Math.max(0, Number(profitSharePercent))) : 0,
        sessionId,
      },
    });

    revalidatePath("/dashboard/balance");
    return NextResponse.json(receiver);
  } catch (error) {
    console.error("[PAYMENT_RECEIVERS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
