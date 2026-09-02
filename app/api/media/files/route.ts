import { NextRequest, NextResponse } from "next/server";
import { readdir, stat } from "fs/promises";
import path from "path";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const folder = searchParams.get("folder") || "slides";

    // Sanitize folder path
    const sanitizedFolder = folder
      .trim()
      .replace(/[^a-zA-Z0-9À-ÿ _\/-]/g, "")
      .replace(/\s+/g, "_")
      .slice(0, 80);

    const targetDir = path.join(process.cwd(), "public", "uploads", sanitizedFolder);

    try {
      const entries = await readdir(targetDir, { withFileTypes: true });
      const imageExtensions = [".webp", ".png", ".jpg", ".jpeg", ".svg", ".gif", ".avif"];

      const files = await Promise.all(
        entries
          .filter((e) => e.isFile() && imageExtensions.some((ext) => e.name.toLowerCase().endsWith(ext)))
          .map(async (e) => {
            const filePath = path.join(targetDir, e.name);
            const fileStat = await stat(filePath).catch(() => null);
            const url = `/uploads/${sanitizedFolder}/${e.name}`;

            // Generate clean readable display name from filename
            const cleanName = e.name
              .replace(/^\d+-\d+-/, "") // remove timestamp prefix
              .replace(/\.[^/.]+$/, "") // remove extension
              .replace(/_/g, " ");

            return {
              name: cleanName || e.name,
              fileName: e.name,
              url,
              size: fileStat?.size || 0,
              createdAt: fileStat?.birthtime || new Date(),
            };
          })
      );

      // Sort newest first
      files.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return NextResponse.json({ files, folder: sanitizedFolder });
    } catch (e: any) {
      // If folder doesn't exist yet, return empty array
      if (e.code === "ENOENT") {
        return NextResponse.json({ files: [], folder: sanitizedFolder });
      }
      throw e;
    }
  } catch (error) {
    console.error("Error listing media files:", error);
    return NextResponse.json({ error: "Error al listar archivos" }, { status: 500 });
  }
}
