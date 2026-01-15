import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const departments = await prisma.department.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(departments);
  } catch (error) {
    console.log("[DEPARTMENTS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    // @ts-ignore
    if (!session || session.user?.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const body = await req.json();
    const { name, description, address, bedCount, maxPeople, hasParking, images } = body;

    if (!name || !bedCount || !maxPeople) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const existingDept = await prisma.department.findFirst({
      where: { name }
    });

    let department;

    if (existingDept) {
      if (existingDept.isActive) {
        return new NextResponse("Department already exists", { status: 409 });
      } else {
        // Restore
        department = await prisma.department.update({
          where: { id: existingDept.id },
          data: {
            isActive: true,
            description,
            address,
            bedCount: Number(bedCount),
            maxPeople: Number(maxPeople),
            hasParking: !!hasParking,
            images: JSON.stringify(images || []),
          },
        });
      }
    } else {
      department = await prisma.department.create({
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
    }

    return NextResponse.json(department);
  } catch (error) {
    console.log("[DEPARTMENTS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
