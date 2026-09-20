import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

// PATCH: update a payment receiver (ADMIN only)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const role = session.user?.role;
    if (role !== "ADMIN") return new NextResponse("Forbidden", { status: 403 });

    const sessionId = session.user?.sessionId;
    const { id } = await params;

    const existing = await prisma.paymentReceiver.findUnique({ where: { id } });
    if (!existing || existing.sessionId !== sessionId) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const body = await req.json();
    const { name, accountInfo, isDefault, order, isActive } = body;

    // If setting as default, clear other defaults
    if (isDefault) {
      await prisma.paymentReceiver.updateMany({
        where: { sessionId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const receiver = await prisma.paymentReceiver.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(accountInfo !== undefined && { accountInfo: accountInfo?.trim() || null }),
        ...(isDefault !== undefined && { isDefault: !!isDefault }),
        ...(order !== undefined && { order: Number(order) }),
        ...(isActive !== undefined && { isActive: !!isActive }),
      },
    });

    revalidatePath("/dashboard/balance");
    return NextResponse.json(receiver);
  } catch (error) {
    console.error("[PAYMENT_RECEIVERS_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// DELETE: soft-delete a payment receiver (ADMIN only)
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const role = session.user?.role;
    if (role !== "ADMIN") return new NextResponse("Forbidden", { status: 403 });

    const sessionId = session.user?.sessionId;
    const { id } = await params;

    const existing = await prisma.paymentReceiver.findUnique({ where: { id } });
    if (!existing || existing.sessionId !== sessionId) {
      return new NextResponse("Not Found", { status: 404 });
    }

    // Soft delete
    const receiver = await prisma.paymentReceiver.update({
      where: { id },
      data: { isActive: false },
    });

    revalidatePath("/dashboard/balance");
    return NextResponse.json(receiver);
  } catch (error) {
    console.error("[PAYMENT_RECEIVERS_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
