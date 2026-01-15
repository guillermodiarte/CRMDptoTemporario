import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { normalizePhone } from "@/lib/phone-utils";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const userRole = (session?.user as any)?.role;

  if (!session || userRole !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { guestName, guestPhone, reason } = body;

    const data: any = {};
    if (guestName) data.guestName = guestName;
    if (reason) data.reason = reason;
    if (guestPhone) data.guestPhone = normalizePhone(guestPhone);

    const entry = await prisma.blacklistEntry.update({
      where: { id },
      data
    });

    return NextResponse.json(entry);
  } catch (error) {
    console.error("[BLACKLIST_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const userRole = (session?.user as any)?.role;

  if (!session || userRole !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { id } = await params;

    // Soft DELETE
    const entry = await prisma.blacklistEntry.update({
      where: { id },
      data: { isActive: false }
    });

    return NextResponse.json(entry);
  } catch (error) {
    console.error("[BLACKLIST_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
