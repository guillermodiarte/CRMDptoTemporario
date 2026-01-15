import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "PERSONAL";

  if (type === "GLOBAL") {
    const note = await prisma.note.findFirst({
      where: { type: "GLOBAL" },
    });
    return NextResponse.json(note || { content: "" });
  } else {
    const note = await prisma.note.findFirst({
      where: { userId: session.user.id, type: "PERSONAL" },
    });
    return NextResponse.json(note || { content: "" });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  const { content, type = "PERSONAL" } = await req.json();

  if (type === "GLOBAL") {
    // For Global notes, we act on the single global note or create one
    // We don't really care who created it, just that it exists
    const existing = await prisma.note.findFirst({
      where: { type: "GLOBAL" },
    });

    if (existing) {
      const updated = await prisma.note.update({
        where: { id: existing.id },
        data: { content, userId: session.user.id }, // Update last editor
      });
      return NextResponse.json(updated);
    } else {
      const created = await prisma.note.create({
        data: {
          content,
          userId: session.user.id!,
          type: "GLOBAL",
        },
      });
      return NextResponse.json(created);
    }
  } else {
    const existing = await prisma.note.findFirst({
      where: { userId: session.user.id, type: "PERSONAL" },
    });

    if (existing) {
      const updated = await prisma.note.update({
        where: { id: existing.id },
        data: { content },
      });
      return NextResponse.json(updated);
    } else {
      const created = await prisma.note.create({
        data: {
          content,
          userId: session.user.id!,
          type: "PERSONAL",
        },
      });
      return NextResponse.json(created);
    }
  }
}
