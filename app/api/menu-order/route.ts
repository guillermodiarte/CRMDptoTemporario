import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { requireSessionId } from "@/lib/auth-helper";
import { revalidatePath } from "next/cache";

export const MENU_ORDER_SETTING_KEY = "ADMIN_MENU_ORDER";

export async function GET() {
  const session = await auth();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const sessionId = await requireSessionId();
    const setting = await prisma.systemSettings.findUnique({
      where: { sessionId_key: { sessionId, key: MENU_ORDER_SETTING_KEY } },
    });

    if (!setting?.value) {
      return NextResponse.json({ order: null });
    }

    const order = JSON.parse(setting.value);
    return NextResponse.json({ order: Array.isArray(order) ? order : null });
  } catch (error) {
    console.error("[MENU_ORDER_GET]", error);
    return NextResponse.json({ order: null });
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

  try {
    const sessionId = await requireSessionId();
    const body = await req.json();
    const { order } = body;

    if (!Array.isArray(order)) {
      return new NextResponse("Invalid order payload", { status: 400 });
    }

    const value = JSON.stringify(order);

    await prisma.systemSettings.upsert({
      where: { sessionId_key: { sessionId, key: MENU_ORDER_SETTING_KEY } },
      update: {
        value,
        updatedBy: session.user?.email || "unknown",
      },
      create: {
        key: MENU_ORDER_SETTING_KEY,
        value,
        updatedBy: session.user?.email || "unknown",
        sessionId,
      },
    });

    revalidatePath("/dashboard", "layout");
    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error("[MENU_ORDER_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE() {
  const session = await auth();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const role = (session.user as any)?.role;
  const isSuperAdmin = (session.user as any)?.isSuperAdmin;
  if (role !== "ADMIN" && !isSuperAdmin) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const sessionId = await requireSessionId();

    await prisma.systemSettings.deleteMany({
      where: {
        sessionId,
        key: MENU_ORDER_SETTING_KEY,
      },
    });

    revalidatePath("/dashboard", "layout");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[MENU_ORDER_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

