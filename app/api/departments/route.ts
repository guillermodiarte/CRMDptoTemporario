import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireSessionId } from "@/lib/auth-helper";

export async function GET(req: Request) {
  try {
    const sessionId = await requireSessionId();

    const departments = await prisma.department.findMany({
      where: { isActive: true, sessionId },
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
    const sessionId = await requireSessionId();

    const body = await req.json();
    const {
      type, // Extract Type
      name, description, address, bedCount, maxPeople, hasParking, images,
      wifiName, wifiPass, basePrice, cleaningFee, alias, color,
      googleMapsLink, keyLocation, lockBoxCode, ownerName, meterLuz, meterGas, meterAgua, meterWifi, inventoryNotes, airbnbLink, bookingLink
    } = body;

    // ...

    const existingDept = await prisma.department.findFirst({
      where: { name, sessionId }
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
            isArchived: false,
            type: type || "APARTMENT", // Update type
            description,
            address,
            bedCount: Number(bedCount || 0), // Allow 0
            maxPeople: Number(maxPeople || 0), // Allow 0
            basePrice: Number(basePrice || 0),
            cleaningFee: Number(cleaningFee || 0),
            wifiName,
            wifiPass,
            alias,
            color: color || "#3b82f6",
            hasParking: !!hasParking,
            googleMapsLink, keyLocation, lockBoxCode, ownerName, meterLuz, meterGas, meterAgua, meterWifi, inventoryNotes, airbnbLink, bookingLink,
            images: JSON.stringify(images || []),
          },
        });
      }
    } else {
      department = await prisma.department.create({
        data: {
          type: type || "APARTMENT", // Create with type
          name,
          description,
          address,
          bedCount: Number(bedCount || 0),
          maxPeople: Number(maxPeople || 0),
          basePrice: Number(basePrice || 0),
          cleaningFee: Number(cleaningFee || 0),
          wifiName,
          wifiPass,
          alias,
          color: color || "#3b82f6",
          hasParking: !!hasParking,
          googleMapsLink, keyLocation, lockBoxCode, ownerName, meterLuz, meterGas, meterAgua, meterWifi, inventoryNotes, airbnbLink, bookingLink,
          images: JSON.stringify(images || []),
          sessionId,
        },
      });
    }

    return NextResponse.json(department);
  } catch (error) {
    console.log("[DEPARTMENTS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
