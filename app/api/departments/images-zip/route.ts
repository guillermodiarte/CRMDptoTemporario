import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { requireSessionId } from "@/lib/auth-helper";
import path from "path";
import { readFile } from "fs/promises";
import JSZip from "jszip";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

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
      // Robustly unwrap and parse image URLs
      let parsed: any = dept.images || "[]";
      while (typeof parsed === "string") {
        try {
          const next = JSON.parse(parsed);
          if (typeof next === "string" || Array.isArray(next)) {
            parsed = next;
          } else {
            break;
          }
        } catch {
          break;
        }
      }
      const rawUrls = Array.isArray(parsed) ? parsed : [];
      const urls: string[] = rawUrls
        .filter(Boolean)
        .map((item: any) => {
          let clean = typeof item === "string" ? item : (item?.url ?? "");
          while (
            typeof clean === "string" &&
            ((clean.startsWith('"') && clean.endsWith('"')) ||
              (clean.startsWith("'") && clean.endsWith("'")))
          ) {
            clean = clean.slice(1, -1);
          }
          return clean.trim();
        })
        .filter((u: string) => u.startsWith("/") || u.startsWith("http://") || u.startsWith("https://"));

      if (!urls.length) continue;

      // If exporting all, create a subfolder per department
      const folder =
        departmentId
          ? zip // flat — images at root
          : zip.folder((dept.name || dept.id).replace(/[/\\?%*:|"<>]/g, "-"))!;

      // Pad digits so alphabetical sort == gallery order (e.g. foto_001 → foto_024)
      const pad = String(urls.length).length; // e.g. 24 photos → pad to 2 digits

      for (let i = 0; i < urls.length; i++) {
        const url = urls[i]; // e.g. "/uploads/Dpto_1/12345-foto.jpg"
        const seq = String(i + 1).padStart(pad, "0"); // e.g. "01", "02"...
        try {
          if (url.startsWith("/uploads/")) {
            // Local file — read from filesystem (fast, no HTTP)
            const filePath = path.join(cwd, "public", url);
            const buffer = await readFile(filePath);
            const ext = path.extname(url).slice(1) || "jpg";
            folder.file(`foto_${seq}.${ext}`, buffer);
          } else if (url.startsWith("http://") || url.startsWith("https://")) {
            // External URL (Airbnb CDN, etc.) — fetch over HTTP
            const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
            if (res.ok) {
              const ab = await res.arrayBuffer();
              const ext = url.split(".").pop()?.split("?")[0] || "jpg";
              folder.file(`foto_${seq}.${ext}`, ab);
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
