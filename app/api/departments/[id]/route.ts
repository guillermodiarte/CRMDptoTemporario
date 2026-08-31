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
      googleMapsLink, keyLocation, lockBoxCode, ownerName, meterLuz, meterGas, meterAgua, meterWifi, inventoryNotes, airbnbLink, bookingLink, isArchived, prices, amenities, showOnPublic
    } = body;

    const existing = await prisma.department.findUnique({ where: { id } });
    // @ts-ignore
    const isSuperAdmin = session?.user?.email === "guillermo.diarte@gmail.com";
    if (!existing || (!isSuperAdmin && existing.sessionId !== sessionId)) {
      return new NextResponse("Not Found or Access Denied", { status: 404 });
    }

    const department = await prisma.department.update({
      where: { id },
      data: {
        ...(type !== undefined && { type }),
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(address !== undefined && { address }),
        ...(bedCount !== undefined && { bedCount: Number(bedCount) }),
        ...(maxPeople !== undefined && { maxPeople: Number(maxPeople) }),
        ...(basePrice !== undefined && { basePrice: Number(basePrice) }),
        ...(cleaningFee !== undefined && { cleaningFee: Number(cleaningFee) }),
        ...(wifiName !== undefined && { wifiName }),
        ...(wifiPass !== undefined && { wifiPass }),
        ...(alias !== undefined && { alias }),
        ...(color !== undefined && { color }),
        ...(hasParking !== undefined && { hasParking: !!hasParking }),
        ...(isActive !== undefined && { isActive }),
        ...(showOnPublic !== undefined && { showOnPublic }),
        ...(isArchived !== undefined && { isArchived }),
        ...(googleMapsLink !== undefined && { googleMapsLink }),
        ...(keyLocation !== undefined && { keyLocation }),
        ...(lockBoxCode !== undefined && { lockBoxCode }),
        ...(ownerName !== undefined && { ownerName }),
        ...(meterLuz !== undefined && { meterLuz }),
        ...(meterGas !== undefined && { meterGas }),
        ...(meterAgua !== undefined && { meterAgua }),
        ...(meterWifi !== undefined && { meterWifi }),
        ...(inventoryNotes !== undefined && { inventoryNotes }),
        ...(airbnbLink !== undefined && { airbnbLink }),
        ...(bookingLink !== undefined && { bookingLink }),
        ...(images !== undefined ? {
          images: Array.isArray(images) ? JSON.stringify(images) : (typeof images === 'string' ? images : "[]")
        } : {}),
        ...(prices !== undefined && { prices: prices || "{}" }),
        ...(amenities !== undefined && { amenities }),
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
    // @ts-ignore
    const isSuperAdmin = session?.user?.email === "guillermo.diarte@gmail.com";
    if (!existing || (!isSuperAdmin && existing.sessionId !== sessionId)) {
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
