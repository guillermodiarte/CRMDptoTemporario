import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireSessionId } from "@/lib/auth-helper";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    // @ts-ignore
    if (session?.user?.role !== "ADMIN") return new NextResponse("Forbidden", { status: 403 });

    const { id } = await params;
    const body = await req.json();
    const { type, description, amount, departmentId, date, quantity, unitPrice } = body;

    const sessionId = await requireSessionId();
    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing || existing.sessionId !== sessionId) {
      return new NextResponse("Not Found or Access Denied", { status: 404 });
    }

    const expense = await prisma.expense.update({
      where: { id },
      data: {
        type,
        description,
        amount: Number(amount),
        quantity: quantity ? Number(quantity) : null,
        unitPrice: unitPrice ? Number(unitPrice) : null,
        departmentId: departmentId || null,
        date: date ? new Date(`${date}T12:00:00`) : undefined,
      },
    });

    return NextResponse.json(expense);
  } catch (error) {
    console.log("[EXPENSE_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    // @ts-ignore
    if (session?.user?.role !== "ADMIN") return new NextResponse("Forbidden", { status: 403 });

    const { id } = await params;

    const sessionId = await requireSessionId();
    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing || existing.sessionId !== sessionId) {
      return new NextResponse("Not Found or Access Denied", { status: 404 });
    }

    // Hard delete
    const expense = await prisma.expense.delete({
      where: { id },
    });

    return NextResponse.json(expense);
  } catch (error) {
    console.log("[EXPENSE_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
