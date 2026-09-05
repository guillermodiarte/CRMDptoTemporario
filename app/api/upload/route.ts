import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { auth } from "@/auth";
import { optimizeImageBuffer } from "@/lib/image-optimizer";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    const deptParam = formData.get("department") as string | null;
    const folderParam = formData.get("folder") as string | null;

    let targetFolder = folderParam || "general";
    if (deptParam) {
      targetFolder = `departamentos/${deptParam}`;
    }

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No se subieron archivos" }, { status: 400 });
    }

    const uploadedUrls: string[] = [];

    // Sanitize folder path (e.g. 'slides', 'logos', 'guia', 'general', 'avatars', or 'departamentos/...')
    const sanitized = targetFolder
      .trim()
      .replace(/[^a-zA-Z0-9À-ÿ _\/-]/g, "")
      .replace(/\s+/g, "_")
      .slice(0, 80);

    const subDir = sanitized || "general";
    const uploadsDir = path.join(process.cwd(), "public", "uploads", subDir);

    // Create directory recursively if it doesn't exist
    await mkdir(uploadsDir, { recursive: true });

    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const rawBuffer = Buffer.from(bytes);
      const isSvg = file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");

      let bufferToWrite = rawBuffer;
      let extension = isSvg ? "svg" : "webp";

      if (!isSvg) {
        // For icons folder, preserve original format (especially PNG with alpha channel for PWA icons)
        const isIconFolder = subDir === "icons";
        const isPng = file.type === "image/png" || file.name.toLowerCase().endsWith(".png");
        const format = (isIconFolder && isPng) ? "original" : "webp";

        // Auto-resize and compress for optimal performance
        const { buffer: optimizedBuffer, extension: optExt } = await optimizeImageBuffer(rawBuffer, {
          maxWidth: isIconFolder ? 1024 : 1600,
          maxHeight: isIconFolder ? 1024 : 1200,
          quality: isIconFolder ? 92 : 82,
          format,
        });
        bufferToWrite = optimizedBuffer;
        extension = optExt;
      }

      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const baseNameWithoutExt = file.name
        .replace(/\.[^/.]+$/, "")
        .replace(/[^a-zA-Z0-9À-ÿ_-]/g, "_")
        .slice(0, 40);

      const filename = `${uniqueSuffix}-${baseNameWithoutExt}.${extension}`;
      const filepath = path.join(uploadsDir, filename);

      await writeFile(filepath, bufferToWrite);

      uploadedUrls.push(`/uploads/${subDir}/${filename}`);
    }

    return NextResponse.json({ urls: uploadedUrls });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
