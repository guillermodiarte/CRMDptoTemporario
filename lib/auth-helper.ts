
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function getCurrentSessionId() {
  const session = await auth();
  return session?.user?.sessionId || null;
}

export async function requireSessionId() {
  const sessionId = await getCurrentSessionId();
  if (!sessionId) {
    throw new Error("Unauthorized: No active session");
  }
  return sessionId;
}

// Helper to handle API errors related to session
export function sessionError() {
  return new NextResponse("Unauthorized: No active session", { status: 401 });
}
