import { NextRequest, NextResponse } from "next/server";
import { unlink } from "fs/promises";
import path from "path";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    if (role === "VISUALIZER") {
      return NextResponse.json({ error: "Permiso denegado" }, { status: 403 });
    }

    const body = await req.json();
    const urls: string[] = Array.isArray(body.urls)
      ? body.urls
      : body.url
      ? [body.url]
      : [];

    if (urls.length === 0) {
      return NextResponse.json({ error: "No se enviaron URLs para eliminar" }, { status: 400 });
    }

    let deletedCount = 0;

    for (const rawUrl of urls) {
      if (typeof rawUrl !== "string" || !rawUrl.startsWith("/uploads/")) continue;

      // Prevent path traversal
      const safeRelative = rawUrl.replace(/^\/uploads\//, "").replace(/\.\./g, "");
      const fullPath = path.join(process.cwd(), "public", "uploads", safeRelative);

      try {
        await unlink(fullPath);
        deletedCount++;
      } catch (err: any) {
        // If file already deleted or doesn't exist, ignore
        if (err.code !== "ENOENT") {
          console.warn("Could not delete file:", fullPath, err);
        }
      }
    }

    return NextResponse.json({ success: true, deletedCount });
  } catch (error) {
    console.error("Error deleting media files:", error);
    return NextResponse.json({ error: "Error al eliminar archivos" }, { status: 500 });
  }
}
