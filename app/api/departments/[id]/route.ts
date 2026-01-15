import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

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
    const { name, description, address, bedCount, maxPeople, hasParking, images } = body;

    const department = await prisma.department.update({
      where: { id },
      data: {
        name,
        description,
        address,
        bedCount: Number(bedCount),
        maxPeople: Number(maxPeople),
        hasParking: !!hasParking,
        images: JSON.stringify(images || []),
      },
    });

    return NextResponse.json(department);
  } catch (error) {
    console.log("[DEPARTMENT_PATCH]", error);
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

    // Soft delete
    const department = await prisma.department.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json(department);
  } catch (error) {
    console.log("[DEPARTMENT_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
