import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { auth } from "@/auth";

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
      const buffer = Buffer.from(bytes);

      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const safeName = file.name.replace(/[^a-zA-Z0-9À-ÿ._-]/g, "_");
      const filename = `${uniqueSuffix}-${safeName}`;
      const filepath = path.join(uploadsDir, filename);

      await writeFile(filepath, buffer);

      uploadedUrls.push(`/uploads/${subDir}/${filename}`);
    }

    return NextResponse.json({ urls: uploadedUrls });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
