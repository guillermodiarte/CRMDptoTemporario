import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const setting = await prisma.systemSettings.findUnique({
      where: { key: "DEFAULT_CLEANING_FEE" },
    });
    return NextResponse.json({ value: setting?.value ? parseFloat(setting.value) : 5000 });
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
    const { value } = await req.json();
    const updated = await prisma.systemSettings.upsert({
      where: { key: "DEFAULT_CLEANING_FEE" },
      update: {
        value: String(value),
        updatedBy: session.user?.email || "unknown"
      },
      create: {
        key: "DEFAULT_CLEANING_FEE",
        value: String(value),
        updatedBy: session.user?.email || "unknown"
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
