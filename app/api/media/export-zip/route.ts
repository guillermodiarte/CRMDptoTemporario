import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import path from "path";
import { readFile, readdir } from "fs/promises";
import JSZip from "jszip";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const isSuperAdmin = (session.user as any).isSuperAdmin === true;
    const sessionId = (session.user as any).sessionId;

    const body = await req.json();
    const {
      categories = [], // e.g. ['slides', 'logos', 'guia', 'avatars', 'general', 'departamentos']
      departmentIds = [], // e.g. ['id1', 'id2']
      urls = [], // e.g. ['/uploads/...']
      filename = "multimedia.zip",
    } = body;

    const zip = new JSZip();
    const cwd = process.cwd();
    const uploadsBase = path.join(cwd, "public", "uploads");

    // 1. Export Specific Image URLs
    if (urls && urls.length > 0) {
      const pad = String(urls.length).length;
      for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        const seq = String(i + 1).padStart(pad, "0");
        try {
          if (url.startsWith("/uploads/")) {
            const filePath = path.join(cwd, "public", url);
            const buffer = await readFile(filePath).catch(() => null);
            if (buffer) {
              const ext = path.extname(url).slice(1) || "webp";
              zip.file(`foto_${seq}_${path.basename(url)}`, buffer);
            }
          } else if (url.startsWith("http")) {
            const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
            if (res.ok) {
              const ab = await res.arrayBuffer();
              const ext = url.split(".").pop()?.split("?")[0] || "jpg";
              zip.file(`foto_${seq}.${ext}`, Buffer.from(ab));
            }
          }
        } catch {}
      }
    } else {
      // 2. Export Selected Department(s) or All Departments
      const includeAllDepts = categories.includes("departamentos") || categories.includes("departments");
      const deptsToFetch = includeAllDepts
        ? isSuperAdmin ? {} : { sessionId }
        : departmentIds.length > 0
        ? { id: { in: departmentIds }, ...(isSuperAdmin ? {} : { sessionId }) }
        : null;

      if (deptsToFetch) {
        const departments = await prisma.department.findMany({
          where: deptsToFetch,
          select: { id: true, name: true, images: true },
          orderBy: { name: "asc" },
        });

        const deptsZipFolder = zip.folder("departamentos")!;

        for (const dept of departments) {
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
          const uList: string[] = rawUrls
            .filter(Boolean)
            .map((item: any) => typeof item === "string" ? item : (item?.url ?? ""))
            .filter((u: string) => typeof u === "string" && (u.startsWith("/") || u.startsWith("http")));

          if (!uList.length) continue;
          const subFolder = deptsZipFolder.folder((dept.name || dept.id).replace(/[/\\?%*:|"<>]/g, "_"))!;
          const pad = String(uList.length).length;

          for (let i = 0; i < uList.length; i++) {
            const url = uList[i];
            const seq = String(i + 1).padStart(pad, "0");
            try {
              if (url.startsWith("/uploads/")) {
                const filePath = path.join(cwd, "public", url);
                const buffer = await readFile(filePath).catch(() => null);
                if (buffer) {
                  const ext = path.extname(url).slice(1) || "webp";
                  subFolder.file(`foto_${seq}.${ext}`, buffer);
                }
              } else if (url.startsWith("http")) {
                const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
                if (res.ok) {
                  const ab = await res.arrayBuffer();
                  const ext = url.split(".").pop()?.split("?")[0] || "jpg";
                  subFolder.file(`foto_${seq}.${ext}`, Buffer.from(ab));
                }
              }
            } catch {}
          }
        }
      }

      // 3. Export Selected Web Asset Categories
      for (const cat of categories) {
        if (cat === "departamentos" || cat === "departments" || cat === "all") continue;
        const sanitizedCat = cat.trim().replace(/[^a-zA-Z0-9À-ÿ _\/-]/g, "").replace(/\s+/g, "_");
        const folderDir = path.join(uploadsBase, sanitizedCat);

        try {
          const entries = await readdir(folderDir, { withFileTypes: true });
          const catZipFolder = zip.folder(sanitizedCat)!;

          for (const entry of entries) {
            if (entry.isFile()) {
              const filePath = path.join(folderDir, entry.name);
              const buffer = await readFile(filePath).catch(() => null);
              if (buffer) {
                catZipFolder.file(entry.name, buffer);
              }
            }
          }
        } catch {}
      }
    }

    const zipBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    return new NextResponse(zipBuffer as any, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(zipBuffer.length),
      },
    });
  } catch (error) {
    console.error("Error creating custom ZIP:", error);
    return new NextResponse("Error al generar archivo ZIP", { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const isSuperAdmin = (session.user as any).isSuperAdmin === true;
    const sessionId = (session.user as any).sessionId;

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const departmentId = searchParams.get("departmentId");

    const zip = new JSZip();
    const cwd = process.cwd();
    const uploadsBase = path.join(cwd, "public", "uploads");

    let downloadFilename = "multimedia.zip";

    // 1. Single Department Export
    if (departmentId) {
      const dept = await prisma.department.findUnique({
        where: { id: departmentId },
        select: { id: true, name: true, images: true, sessionId: true },
      });

      if (!dept || (!isSuperAdmin && dept.sessionId !== sessionId)) {
        return new NextResponse("Departamento no encontrado", { status: 404 });
      }

      downloadFilename = `${(dept.name || "depto").replace(/[/\\?%*:|"<>]/g, "_")}_fotos.zip`;

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
        .map((item: any) => typeof item === "string" ? item : (item?.url ?? ""))
        .filter((u: string) => typeof u === "string" && (u.startsWith("/") || u.startsWith("http")));

      const pad = String(urls.length || 1).length;
      for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        const seq = String(i + 1).padStart(pad, "0");
        try {
          if (url.startsWith("/uploads/")) {
            const filePath = path.join(cwd, "public", url);
            const buffer = await readFile(filePath).catch(() => null);
            if (buffer) {
              const ext = path.extname(url).slice(1) || "webp";
              zip.file(`foto_${seq}.${ext}`, buffer);
            }
          } else if (url.startsWith("http")) {
            const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
            if (res.ok) {
              const ab = await res.arrayBuffer();
              const ext = url.split(".").pop()?.split("?")[0] || "jpg";
              zip.file(`foto_${seq}.${ext}`, Buffer.from(ab));
            }
          }
        } catch {}
      }
    }
    // 2. Web Media Category Folder Export
    else if (category) {
      const sanitizedFolder = category
        .trim()
        .replace(/[^a-zA-Z0-9À-ÿ _\/-]/g, "")
        .replace(/\s+/g, "_")
        .slice(0, 80);

      downloadFilename = `${sanitizedFolder}_imagenes.zip`;
      const targetDir = path.join(uploadsBase, sanitizedFolder);

      try {
        const entries = await readdir(targetDir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isFile()) {
            const filePath = path.join(targetDir, entry.name);
            const buffer = await readFile(filePath).catch(() => null);
            if (buffer) {
              zip.file(entry.name, buffer);
            }
          }
        }
      } catch {}
    }

    const zipBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    return new NextResponse(zipBuffer as any, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${downloadFilename}"`,
        "Content-Length": String(zipBuffer.length),
      },
    });
  } catch (error) {
    console.error("Error generating ZIP:", error);
    return new NextResponse("Error al generar archivo ZIP", { status: 500 });
  }
}
