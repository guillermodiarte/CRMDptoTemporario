import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import path from "path";
import { writeFile, mkdir } from "fs/promises";
import JSZip from "jszip";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

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

    const isSuperAdmin = (session.user as any).isSuperAdmin === true;
    const currentSessionId = (session.user as any).sessionId;

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const contextSection = (formData.get("section") as string) || "dept";
    const contextDeptId = formData.get("departmentId") as string | null;
    const contextFolder = formData.get("folder") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No se proporcionó ningún archivo ZIP" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    const cwd = process.cwd();
    const uploadsBase = path.join(cwd, "public", "uploads");

    // Fetch departments for current session (or all for SuperAdmin)
    const departments = await prisma.department.findMany({
      where: isSuperAdmin ? {} : { sessionId: currentSessionId },
      select: { id: true, name: true, images: true, sessionId: true },
    });

    const normalizeName = (s: string) =>
      s.toLowerCase().replace(/[/\\?%*:|"<>_-\s]/g, "").trim();

    const deptMap = new Map<string, typeof departments[0]>();
    departments.forEach((d) => {
      deptMap.set(normalizeName(d.name), d);
    });

    const validExts = new Set([".webp", ".jpg", ".jpeg", ".png", ".svg", ".gif", ".avif"]);

    interface ExtractedFile {
      buffer: Buffer;
      fileName: string;
      relDir: string; // e.g. "slides", "logos", "departamentos/Departamento_1"
      deptId?: string;
    }

    const extractedFiles: ExtractedFile[] = [];
    const deptUrlsMap = new Map<string, { seqName: string; url: string }[]>();

    const zipEntries: { path: string; entry: any }[] = [];
    zip.forEach((relPath, entry) => {
      if (!entry.dir && !relPath.includes("__MACOSX") && !relPath.includes(".DS_Store")) {
        const ext = path.extname(relPath).toLowerCase();
        if (validExts.has(ext)) {
          zipEntries.push({ path: relPath, entry });
        }
      }
    });

    if (zipEntries.length === 0) {
      return NextResponse.json({ error: "El archivo ZIP no contiene imágenes válidas" }, { status: 400 });
    }

    for (const item of zipEntries) {
      const parts = item.path.split("/").filter(Boolean);
      const originalFileName = parts[parts.length - 1];
      if (originalFileName.startsWith(".")) continue;

      const fileBuffer = await item.entry.async("nodebuffer");

      let targetDir = "";
      let matchedDept: typeof departments[0] | undefined;

      // 1. Check if path starts with "departamentos/[DeptName]/..."
      if (parts.length >= 3 && parts[0].toLowerCase() === "departamentos") {
        const rawDeptName = parts[1];
        matchedDept = deptMap.get(normalizeName(rawDeptName));
        const safeDeptName = (matchedDept?.name || rawDeptName).replace(/[/\\?%*:|"<>]/g, "_").replace(/\s+/g, "_");
        targetDir = path.join("departamentos", safeDeptName);
      }
      // 2. Check if path starts with "[DeptName]/..." where DeptName matches a known department
      else if (parts.length >= 2 && deptMap.has(normalizeName(parts[0]))) {
        matchedDept = deptMap.get(normalizeName(parts[0]));
        const safeDeptName = (matchedDept?.name || parts[0]).replace(/[/\\?%*:|"<>]/g, "_").replace(/\s+/g, "_");
        targetDir = path.join("departamentos", safeDeptName);
      }
      // 3. Check if path starts with standard or custom web folder (slides, logos, general, icons, etc.)
      else if (parts.length >= 2) {
        const folderName = parts[0].replace(/[^a-zA-Z0-9À-ÿ _\/-]/g, "").replace(/\s+/g, "_");
        targetDir = folderName;
      }
      // 4. Flat file (at ZIP root)
      else {
        if (contextSection === "dept" && contextDeptId) {
          matchedDept = departments.find((d) => d.id === contextDeptId);
          const safeDeptName = (matchedDept?.name || "departamento").replace(/[/\\?%*:|"<>]/g, "_").replace(/\s+/g, "_");
          targetDir = path.join("departamentos", safeDeptName);
        } else if (contextSection === "web" && contextFolder) {
          targetDir = contextFolder.replace(/[^a-zA-Z0-9À-ÿ _\/-]/g, "").replace(/\s+/g, "_");
        } else {
          targetDir = "general";
        }
      }

      // Write physical file, PRESERVING EXACT FILENAME so references never break!
      const diskDir = path.join(uploadsBase, targetDir);
      await mkdir(diskDir, { recursive: true });
      const diskFilePath = path.join(diskDir, originalFileName);
      await writeFile(diskFilePath, fileBuffer);

      const publicUrl = `/uploads/${targetDir.replace(/\\/g, "/")}/${originalFileName}`;

      if (matchedDept) {
        if (!deptUrlsMap.has(matchedDept.id)) {
          deptUrlsMap.set(matchedDept.id, []);
        }
        deptUrlsMap.get(matchedDept.id)!.push({ seqName: originalFileName, url: publicUrl });
      }

      extractedFiles.push({
        buffer: fileBuffer,
        fileName: originalFileName,
        relDir: targetDir,
        deptId: matchedDept?.id,
      });
    }

    // 5. Update Department images in database, sorting numerically/alphabetically
    let updatedDeptCount = 0;
    for (const [deptId, imageItems] of deptUrlsMap.entries()) {
      imageItems.sort((a, b) =>
        a.seqName.localeCompare(b.seqName, undefined, { numeric: true, sensitivity: "base" })
      );
      const sortedUrls = imageItems.map((item) => item.url);

      await prisma.department.update({
        where: { id: deptId },
        data: { images: JSON.stringify(sortedUrls) },
      });
      updatedDeptCount++;
    }

    return NextResponse.json({
      success: true,
      totalFiles: extractedFiles.length,
      updatedDepartments: updatedDeptCount,
    });
  } catch (error: any) {
    console.error("Error importing ZIP:", error);
    return NextResponse.json({ error: error?.message || "Error al importar ZIP" }, { status: 500 });
  }
}
