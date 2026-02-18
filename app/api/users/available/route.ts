import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// GET /api/users/available
// Returns users that exist in the system but are NOT in the current session.
// Supports ?search=query for filtering by name or email.
export async function GET(req: Request) {
  const session = await auth();
  const sessionId = session?.user?.sessionId;
  const role = session?.user?.role;

  if (!session?.user?.id || !sessionId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const search = (searchParams.get("search") || "").toLowerCase().trim();

  // Get IDs of users already in this session
  const existingMemberships = await (prisma as any).userSession.findMany({
    where: { sessionId },
    select: { userId: true },
  });
  const existingUserIds: string[] = existingMemberships.map((m: { userId: string }) => m.userId);

  // Find users NOT in this session
  const allUsers = await prisma.user.findMany({
    where: {
      id: { notIn: existingUserIds },
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      phone: true,
    },
    orderBy: { name: "asc" },
  });

  // Filter in JS (avoids SQLite mode issues)
  const users = search
    ? allUsers
      .filter(
        (u) =>
          (u.name?.toLowerCase() || "").includes(search) ||
          u.email.toLowerCase().includes(search)
      )
      .slice(0, 20)
    : allUsers.slice(0, 20);

  return NextResponse.json({ users });
}
