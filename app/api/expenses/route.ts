import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireSessionId } from "@/lib/auth-helper";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const sessionId = await requireSessionId();
    const expenses = await prisma.expense.findMany({
      where: { sessionId },

      orderBy: { date: 'desc' },
      include: { department: { select: { name: true } } }
    });

    return NextResponse.json(expenses);
  } catch (error) {
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    // @ts-ignore
    if (session?.user?.role !== "ADMIN") return new NextResponse("Forbidden", { status: 403 });

    const body = await req.json();
    const sessionId = await requireSessionId();
    const { type, description, amount, departmentId, date, quantity, unitPrice } = body;

    const expense = await prisma.expense.create({
      data: {
        type,
        description,
        amount: Number(amount),
        quantity: quantity ? Number(quantity) : 1,
        unitPrice: unitPrice ? Number(unitPrice) : null,
        departmentId: departmentId || null,
        date: date ? new Date(`${date}T12:00:00`) : new Date(),
        sessionId
      }
    });

    return NextResponse.json(expense);
  } catch (error) {
    console.log("[EXPENSE_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
