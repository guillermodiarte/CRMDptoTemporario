import { NextRequest, NextResponse } from "next/server";
import { unlink } from "fs/promises";
import path from "path";
import { auth } from "@/auth";

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { url } = await req.json() as { url: string };
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Missing url" }, { status: 400 });
    }

    // Only allow deleting files under /uploads/ to prevent path traversal
    if (!url.startsWith("/uploads/")) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    // Resolve absolute path on disk
    const relativePath = url.replace(/^\/uploads\//, "");
    const absPath = path.join(process.cwd(), "public", "uploads", relativePath);

    // Safety check: must remain inside public/uploads
    const uploadsRoot = path.join(process.cwd(), "public", "uploads");
    if (!absPath.startsWith(uploadsRoot)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    try {
      await unlink(absPath);
    } catch (e: any) {
      if (e.code !== "ENOENT") {
        // If the file doesn't exist, silently succeed
        console.warn("[FILE_DELETE] File not found:", absPath);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[FILE_DELETE]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
