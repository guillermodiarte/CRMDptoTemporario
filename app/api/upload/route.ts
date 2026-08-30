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

    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    // Optional: department folder name (sanitized by caller)
    const departmentFolder = (formData.get("department") as string | null) ?? "";

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }

    const uploadedUrls: string[] = [];

    // Build target directory — if a department name was provided, create a subfolder
    const sanitized = departmentFolder
      .trim()
      .replace(/[^a-zA-Z0-9À-ÿ _-]/g, "")
      .replace(/\s+/g, "_")
      .slice(0, 60);

    const subDir = sanitized || "general";
    const uploadsDir = path.join(process.cwd(), "public", "uploads", subDir);

    // Create directory recursively if it doesn't exist
    await mkdir(uploadsDir, { recursive: true });

    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const rawBuffer = Buffer.from(bytes);

      // Auto-resize and compress to webp for ultra fast loading and low bandwidth
      const { buffer: optimizedBuffer, extension } = await optimizeImageBuffer(rawBuffer, {
        maxWidth: 1600,
        maxHeight: 1200,
        quality: 82,
        format: "webp",
      });

      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const baseNameWithoutExt = file.name
        .replace(/\.[^/.]+$/, "")
        .replace(/[^a-zA-Z0-9À-ÿ_-]/g, "_")
        .slice(0, 40);

      const filename = `${uniqueSuffix}-${baseNameWithoutExt}.${extension}`;
      const filepath = path.join(uploadsDir, filename);

      await writeFile(filepath, optimizedBuffer);

      uploadedUrls.push(`/uploads/${subDir}/${filename}`);
    }

    return NextResponse.json({ urls: uploadedUrls });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
