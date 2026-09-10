import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireSessionId } from "@/lib/auth-helper";

export async function GET() {
  try {
    const session = await auth();
    // @ts-ignore
    if (session?.user?.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const departments = await prisma.department.findMany({
      where: {
        type: 'APARTMENT',
        isActive: true,
        showOnPublic: true,
        isArchived: false,
        OR: [
          { sessionId: null },
          { session: { isActive: true } }
        ]
      },
      orderBy: [
        { order: "asc" },
        { createdAt: "desc" }
      ],
      include: {
        session: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return NextResponse.json(departments);
  } catch (error) {
    console.error("[DEPARTMENTS_REORDER_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    // @ts-ignore
    if (session?.user?.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }
    const sessionId = await requireSessionId();
    // @ts-ignore
    const userEmail = session?.user?.email?.toLowerCase().trim();
    // @ts-ignore
    const isSuperAdmin = userEmail === "guillermo.diarte@gmail.com" || (session?.user as any)?.isSuperAdmin === true;

    const body = await req.json();
    const { orderedIds } = body;

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return new NextResponse("Invalid payload", { status: 400 });
    }

    // Update order for each department
    await prisma.$transaction(
      orderedIds.map((id: string, index: number) =>
        prisma.department.updateMany({
          where: {
            id,
            ...(isSuperAdmin ? {} : { sessionId })
          },
          data: {
            order: index
          }
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DEPARTMENTS_REORDER]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

