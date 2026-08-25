import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { requireSessionId } from "@/lib/auth-helper";

export async function POST(req: Request) {
  try {
    const session = await auth();
    // @ts-ignore
    if (session?.user?.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }
    const sessionId = await requireSessionId();

    const body = await req.json();
    if (!Array.isArray(body)) {
      return new NextResponse("Expected an array of departments", { status: 400 });
    }

    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const item of body) {
      try {
        const existing = await prisma.department.findFirst({
          where: { name: item.name, sessionId },
        });

        const data = {
          type: item.type || "APARTMENT",
          name: item.name,
          description: item.description ?? null,
          address: item.address ?? null,
          bedCount: Number(item.bedCount ?? 0),
          maxPeople: Number(item.maxPeople ?? 0),
          basePrice: Number(item.basePrice ?? 0),
          cleaningFee: Number(item.cleaningFee ?? 0),
          wifiName: item.wifiName ?? null,
          wifiPass: item.wifiPass ?? null,
          alias: item.alias ?? null,
          color: item.color ?? "#3b82f6",
          hasParking: !!item.hasParking,
          isActive: item.isActive !== false,
          isArchived: !!item.isArchived,
          googleMapsLink: item.googleMapsLink ?? null,
          keyLocation: item.keyLocation ?? null,
          lockBoxCode: item.lockBoxCode ?? null,
          ownerName: item.ownerName ?? null,
          meterLuz: item.meterLuz ?? null,
          meterGas: item.meterGas ?? null,
          meterAgua: item.meterAgua ?? null,
          meterWifi: item.meterWifi ?? null,
          inventoryNotes: item.inventoryNotes ?? null,
          airbnbLink: item.airbnbLink ?? null,
          bookingLink: item.bookingLink ?? null,
          images: typeof item.images === "string" ? item.images : JSON.stringify(item.images ?? []),
          prices: typeof item.prices === "string" ? item.prices : JSON.stringify(item.prices ?? {}),
          amenities: typeof item.amenities === "string" ? item.amenities : JSON.stringify(item.amenities ?? []),
        };

        if (existing) {
          await prisma.department.update({ where: { id: existing.id }, data });
          updated++;
        } else {
          await prisma.department.create({ data: { ...data, sessionId } });
          created++;
        }
      } catch (e: any) {
        errors.push(`${item.name ?? "?"}: ${e.message}`);
      }
    }

    return NextResponse.json({ created, updated, errors });
  } catch (error) {
    console.error("[DEPARTMENTS_IMPORT]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
