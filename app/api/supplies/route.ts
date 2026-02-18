import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { requireSessionId } from "@/lib/auth-helper";

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const sessionId = await requireSessionId();
    const supplies = await prisma.supply.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      // Return ALL supplies so admin can reactivate them
    });

    // Calculate total cost (Only Active)
    const totalCost = supplies
      .filter(s => s.isActive)
      .reduce((acc, curr) => acc + curr.cost, 0);

    return NextResponse.json({ supplies, totalCost });
  } catch (error) {
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return new NextResponse("Unauthorized", { status: 401 });

  try {
    const { name, cost } = await req.json();

    const supply = await prisma.supply.create({
      data: {
        name,
        cost: parseFloat(cost),
        cost: parseFloat(cost),
        isActive: true,
        sessionId
      }
    });

    return NextResponse.json(supply);
  } catch (error) {
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return new NextResponse("Unauthorized", { status: 401 });

  try {
    const { id, name, cost, isActive } = await req.json();

    const sessionId = await requireSessionId();
    const existing = await prisma.supply.findUnique({ where: { id } });
    if (!existing || existing.sessionId !== sessionId) {
      return new NextResponse("Not Found or Access Denied", { status: 404 });
    }

    const supply = await prisma.supply.update({
      where: { id },
      data: {
        name,
        cost: parseFloat(cost),
        isActive
      }
    });

    return NextResponse.json(supply);
  } catch (error) {
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return new NextResponse("Unauthorized", { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return new NextResponse("ID required", { status: 400 });

    // Hard delete or Soft delete? Plan said soft/hard. User said "eliminar". 
    // Safest is soft delete (isActive=false) but user might want to remove mistakes.
    // Let's do HARD delete for now as it's separate from historical costs (snapshots).

    const sessionId = await requireSessionId();
    const existing = await prisma.supply.findUnique({ where: { id } });
    if (!existing || existing.sessionId !== sessionId) {
      return new NextResponse("Not Found or Access Denied", { status: 404 });
    }

    await prisma.supply.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return new NextResponse("Internal Error", { status: 500 });
  }
}
