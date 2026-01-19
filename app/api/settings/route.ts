import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const settings = await prisma.systemSettings.findMany({
      where: {
        key: { in: ["DEFAULT_CLEANING_FEE", "RESERVATION_YEAR_START", "RESERVATION_YEAR_END"] }
      },
    });

    const cleaningFee = settings.find(s => s.key === "DEFAULT_CLEANING_FEE")?.value || "5000";
    const startYear = settings.find(s => s.key === "RESERVATION_YEAR_START")?.value || "2026";
    const endYear = settings.find(s => s.key === "RESERVATION_YEAR_END")?.value || "2036";

    return NextResponse.json({
      cleaningFee: parseFloat(cleaningFee),
      startYear: parseInt(startYear),
      endYear: parseInt(endYear)
    });
  } catch (error) {
    console.error(error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  // Strict Role check: Only ADMIN can update
  // Cast to any to access role if typescript complains, assuming session pattern
  const role = (session.user as any)?.role;
  if (role !== "ADMIN") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const body = await req.json();
    const updates = [];

    if (body.cleaningFee !== undefined) {
      updates.push(prisma.systemSettings.upsert({
        where: { key: "DEFAULT_CLEANING_FEE" },
        update: { value: String(body.cleaningFee), updatedBy: session.user?.email || "unknown" },
        create: { key: "DEFAULT_CLEANING_FEE", value: String(body.cleaningFee), updatedBy: session.user?.email || "unknown" },
      }));
    }

    if (body.startYear !== undefined) {
      updates.push(prisma.systemSettings.upsert({
        where: { key: "RESERVATION_YEAR_START" },
        update: { value: String(body.startYear), updatedBy: session.user?.email || "unknown" },
        create: { key: "RESERVATION_YEAR_START", value: String(body.startYear), updatedBy: session.user?.email || "unknown" },
      }));
    }

    if (body.endYear !== undefined) {
      updates.push(prisma.systemSettings.upsert({
        where: { key: "RESERVATION_YEAR_END" },
        update: { value: String(body.endYear), updatedBy: session.user?.email || "unknown" },
        create: { key: "RESERVATION_YEAR_END", value: String(body.endYear), updatedBy: session.user?.email || "unknown" },
      }));
    }

    await prisma.$transaction(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
