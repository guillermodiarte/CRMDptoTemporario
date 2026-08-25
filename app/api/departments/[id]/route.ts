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
    const sessionId = await requireSessionId();

    const { id } = await params;
    const body = await req.json();
    const {
      type,
      name, description, address, bedCount, maxPeople, hasParking, images,
      wifiName, wifiPass, basePrice, cleaningFee, isActive, alias, color,
      googleMapsLink, keyLocation, lockBoxCode, ownerName, meterLuz, meterGas, meterAgua, meterWifi, inventoryNotes, airbnbLink, bookingLink, isArchived, prices, amenities
    } = body;

    const existing = await prisma.department.findUnique({ where: { id } });
    if (!existing || existing.sessionId !== sessionId) {
      return new NextResponse("Not Found or Access Denied", { status: 404 });
    }

    const department = await prisma.department.update({
      where: { id },
      data: {
        type: type, // Update type
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
        isActive: isActive !== undefined ? isActive : undefined,
        isArchived: typeof isArchived === 'boolean' ? isArchived : undefined,
        googleMapsLink, keyLocation, lockBoxCode, ownerName, meterLuz, meterGas, meterAgua, meterWifi, inventoryNotes, airbnbLink, bookingLink,
        images: JSON.stringify(images || []),
        prices: prices || "{}",
        ...(amenities !== undefined ? { amenities } : {}),
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
    const sessionId = await requireSessionId();

    const { id } = await params;

    const existing = await prisma.department.findUnique({ where: { id } });
    if (!existing || existing.sessionId !== sessionId) {
      return new NextResponse("Not Found or Access Denied", { status: 404 });
    }

    // Soft delete (Archive)
    const department = await prisma.department.update({
      where: { id },
      data: {
        isArchived: true,
        isActive: false // Also deactivate it for safety
      },
    });

    return NextResponse.json(department);
  } catch (error) {
    console.log("[DEPARTMENT_ARCHIVE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
