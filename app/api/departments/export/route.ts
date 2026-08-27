import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireSessionId } from "@/lib/auth-helper";

export async function GET() {
  try {
    const sessionId = await requireSessionId();

    const departments = await prisma.department.findMany({
      where: { sessionId },
      orderBy: { createdAt: "desc" },
    });

    const cleaned = departments.map(d => ({
      ...d,
      images: "[]",
    }));

    return NextResponse.json(cleaned);
  } catch (error) {
    console.error("[DEPARTMENTS_EXPORT]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
