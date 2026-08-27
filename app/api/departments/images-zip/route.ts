import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { requireSessionId } from "@/lib/auth-helper";
import path from "path";
import { readFile } from "fs/promises";
import JSZip from "jszip";

/**
 * GET /api/departments/images-zip
 *   ?departmentId=xxx  → ZIP of a single department
 *   (no param)         → ZIP of ALL departments (with subfolder per dept)
 *
 * The server reads files directly from the filesystem (public/uploads),
 * avoiding the client-side infinite fetch loop problem.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const sessionId = await requireSessionId();
    const { searchParams } = new URL(req.url);
    const departmentId = searchParams.get("departmentId");

    // Fetch departments from DB
    const where: any = { sessionId };
    if (departmentId) where.id = departmentId;

    const departments = await prisma.department.findMany({
      where,
      select: { id: true, name: true, images: true },
      orderBy: { name: "asc" },
    });

    const zip = new JSZip();
    const cwd = process.cwd();

    for (const dept of departments) {
      let urls: string[] = [];
      try { urls = JSON.parse(dept.images || "[]"); } catch {}
      if (!urls.length) continue;

      // If exporting all, create a subfolder per department
      const folder =
        departmentId
          ? zip // flat — images at root
          : zip.folder((dept.name || dept.id).replace(/[/\\?%*:|"<>]/g, "-"))!;

      for (let i = 0; i < urls.length; i++) {
        const url = urls[i]; // e.g. "/uploads/Dpto_1/12345-foto.jpg"
        try {
          if (url.startsWith("/uploads/")) {
            // Local file — read from filesystem (fast, no HTTP)
            const filePath = path.join(cwd, "public", url);
            const buffer = await readFile(filePath);
            const ext = path.extname(url).slice(1) || "jpg";
            const name = `foto_${i + 1}.${ext}`;
            folder.file(name, buffer);
          } else {
            // External URL (Airbnb CDN, etc.) — fetch over HTTP
            const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
            if (res.ok) {
              const ab = await res.arrayBuffer();
              const ext = url.split(".").pop()?.split("?")[0] || "jpg";
              folder.file(`foto_${i + 1}.${ext}`, ab);
            }
          }
        } catch (e) {
          console.warn("[IMAGES_ZIP] Could not add", url, e);
        }
      }
    }

    const content = await zip.generateAsync({ type: "nodebuffer", compression: "STORE" });

    const deptName = departmentId
      ? (departments[0]?.name ?? "departamento").replace(/[/\\?%*:|"<>]/g, "-")
      : "todos_los_departamentos";
    const filename = `${deptName}_imagenes.zip`;

    return new NextResponse(new Uint8Array(content), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": content.length.toString(),
      },
    });
  } catch (error) {
    console.error("[IMAGES_ZIP_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
