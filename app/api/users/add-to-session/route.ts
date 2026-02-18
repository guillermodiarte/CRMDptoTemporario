import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  userId: z.string().min(1),
  role: z.enum(["ADMIN", "VISUALIZER"]),
});

// POST /api/users/add-to-session
// Adds an existing user to the current session with a given role.
export async function POST(req: Request) {
  const session = await auth();
  const sessionId = session?.user?.sessionId;
  const role = session?.user?.role;

  if (!session?.user?.id || !sessionId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const { userId, role: newRole } = parsed.data;

  // Check user exists
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Check not already in session
  const existing = await (prisma as any).userSession.findUnique({
    where: { userId_sessionId: { userId, sessionId } },
  });
  if (existing) {
    return NextResponse.json({ error: "User already in session" }, { status: 409 });
  }

  // Add to session
  await (prisma as any).userSession.create({
    data: { userId, sessionId, role: newRole },
  });

  return NextResponse.json({ success: true });
}
