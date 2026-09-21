import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { requireSessionId } from "@/lib/auth-helper";
import { revalidatePath } from "next/cache";

function makeKey(year: number, month: number) {
  return `BALANCE_MANUAL_TRANSFERS_${year}_${month}`;
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  const sessionId = await requireSessionId();

  const { searchParams } = new URL(req.url);
  const year = Number(searchParams.get("year"));
  const month = Number(searchParams.get("month"));

  if (isNaN(year) || isNaN(month)) {
    return new NextResponse("Missing year/month", { status: 400 });
  }

  const key = makeKey(year, month);
  const setting = await prisma.systemSettings.findUnique({
    where: { sessionId_key: { sessionId, key } },
  });

  if (!setting) {
    return NextResponse.json({ data: null });
  }

  try {
    const parsed = JSON.parse(setting.value);
    return NextResponse.json({ data: parsed });
  } catch {
    return NextResponse.json({ data: null });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const role = (session.user as any)?.role;
  const isSuperAdmin = (session.user as any)?.isSuperAdmin;
  if (role !== "ADMIN" && !isSuperAdmin) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const sessionId = await requireSessionId();
  const body = await req.json();
  const { year, month, receivers } = body;

  if (isNaN(Number(year)) || isNaN(Number(month)) || !receivers) {
    return new NextResponse("Missing required fields", { status: 400 });
  }

  const key = makeKey(Number(year), Number(month));
  const payload = {
    year: Number(year),
    month: Number(month),
    editedAt: new Date().toISOString(),
    editedBy: session.user?.email || "unknown",
    receivers,
  };

  await prisma.systemSettings.upsert({
    where: { sessionId_key: { sessionId, key } },
    update: {
      value: JSON.stringify(payload),
      updatedBy: session.user?.email || "unknown",
    },
    create: {
      key,
      value: JSON.stringify(payload),
      updatedBy: session.user?.email || "unknown",
      sessionId,
    },
  });

  revalidatePath("/dashboard/balance");

  return NextResponse.json({ success: true, data: payload });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const role = (session.user as any)?.role;
  const isSuperAdmin = (session.user as any)?.isSuperAdmin;
  if (role !== "ADMIN" && !isSuperAdmin) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const sessionId = await requireSessionId();
  const { searchParams } = new URL(req.url);
  const year = Number(searchParams.get("year"));
  const month = Number(searchParams.get("month"));

  if (isNaN(year) || isNaN(month)) {
    return new NextResponse("Missing year/month", { status: 400 });
  }

  const key = makeKey(year, month);

  try {
    await prisma.systemSettings.delete({
      where: { sessionId_key: { sessionId, key } },
    });
  } catch {
    // Might not exist, that's fine
  }

  revalidatePath("/dashboard/balance");
  return NextResponse.json({ success: true });
}
