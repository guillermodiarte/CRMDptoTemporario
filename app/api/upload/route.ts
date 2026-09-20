import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, readdir } from "fs/promises";
import path from "path";
import { auth } from "@/auth";
import { optimizeImageBuffer } from "@/lib/image-optimizer";

/**
 * Returns a short prefix for filenames based on the target folder.
 * Examples: "logos" → "logo", "slides" → "slide", "departamentos/X" → "foto", etc.
 */
function getFolderPrefix(subDir: string): string {
  const base = subDir.includes("/") ? subDir.split("/").pop() || subDir : subDir;
  const map: Record<string, string> = {
    logos: "logo",
    slides: "slide",
    general: "imagen",
    icons: "icon",
    avatars: "avatar",
    guia: "guia",
  };
  return map[base.toLowerCase()] || "foto";
}

/**
 * Returns the next available sequential number for a given prefix+extension in a folder.
 * E.g. if "slide-1.webp" and "slide-2.webp" exist, returns 3.
 */
async function getNextSequentialNumber(dir: string, prefix: string, extension: string): Promise<number> {
  try {
    const entries = await readdir(dir);
    const regex = new RegExp(`^${prefix}-(\\d+)\\.${extension}$`, "i");
    let max = 0;
    for (const name of entries) {
      const m = name.match(regex);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > max) max = n;
      }
    }
    return max + 1;
  } catch {
    return 1;
  }
}

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
      const safeName = deptParam.trim().replace(/[/\\?%*:|"<>]/g, "_").replace(/\s+/g, "_");
      targetFolder = `departamentos/${safeName}`;
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

    const prefix = getFolderPrefix(subDir);
    // Track sequential counter across multiple files uploaded at once
    let nextNum = await getNextSequentialNumber(uploadsDir, prefix, "webp");

    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const rawBuffer = Buffer.from(bytes);
      const isSvg = file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");

      let bufferToWrite: Buffer | any = rawBuffer;
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

      // Use sequential naming: prefix-N.ext (e.g. slide-1.webp, logo-3.webp)
      const currentNum = await getNextSequentialNumber(uploadsDir, prefix, extension);
      const seqNum = Math.max(nextNum, currentNum);
      const filename = `${prefix}-${seqNum}.${extension}`;
      const filepath = path.join(uploadsDir, filename);

      await writeFile(filepath, bufferToWrite);

      uploadedUrls.push(`/uploads/${subDir}/${filename}`);
      nextNum = seqNum + 1;
    }

    return NextResponse.json({ urls: uploadedUrls });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
