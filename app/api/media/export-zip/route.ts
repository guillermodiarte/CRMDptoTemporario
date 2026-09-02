import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import path from "path";
import { readFile, readdir, stat } from "fs/promises";
import JSZip from "jszip";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const isSuperAdmin = (session.user as any).isSuperAdmin === true;
    const sessionId = (session.user as any).sessionId;

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category"); // 'slides', 'logos', 'guia', 'general', 'departments', 'all', or custom folder name
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

      const pad = String(urls.length || 1).length;
      for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        const seq = String(i + 1).padStart(pad, "0");
        try {
          if (url.startsWith("/uploads/")) {
            const filePath = path.join(cwd, "public", url);
            const buffer = await readFile(filePath);
            const ext = path.extname(url).slice(1) || "webp";
            zip.file(`foto_${seq}.${ext}`, buffer);
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
    // 2. All Departments Export
    else if (category === "departments") {
      const where: any = isSuperAdmin ? {} : { sessionId };
      const departments = await prisma.department.findMany({
        where,
        select: { id: true, name: true, images: true },
        orderBy: { name: "asc" },
      });

      downloadFilename = "Departamentos_fotos.zip";

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
          .filter((u: string) => u.startsWith("/") || u.startsWith("http"));

        if (!urls.length) continue;
        const deptFolder = zip.folder((dept.name || dept.id).replace(/[/\\?%*:|"<>]/g, "_"))!;
        const pad = String(urls.length).length;

        for (let i = 0; i < urls.length; i++) {
          const url = urls[i];
          const seq = String(i + 1).padStart(pad, "0");
          try {
            if (url.startsWith("/uploads/")) {
              const filePath = path.join(cwd, "public", url);
              const buffer = await readFile(filePath);
              const ext = path.extname(url).slice(1) || "webp";
              deptFolder.file(`foto_${seq}.${ext}`, buffer);
            } else if (url.startsWith("http")) {
              const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
              if (res.ok) {
                const ab = await res.arrayBuffer();
                const ext = url.split(".").pop()?.split("?")[0] || "jpg";
                deptFolder.file(`foto_${seq}.${ext}`, Buffer.from(ab));
              }
            }
          } catch {}
        }
      }
    }
    // 3. Specific Web Media Folder Export (e.g. 'slides', 'logos', 'guia', etc.)
    else if (category && category !== "all") {
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
    // 4. Export All Multimedia (Root Level)
    else {
      downloadFilename = "Multimedia_Completo.zip";

      // A. Export all departments into "departamentos/" folder
      const departments = await prisma.department.findMany({
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
        const urls: string[] = rawUrls
          .filter(Boolean)
          .map((item: any) => typeof item === "string" ? item : (item?.url ?? ""))
          .filter((u: string) => typeof u === "string" && u.startsWith("/uploads/"));

        if (!urls.length) continue;
        const subFolder = deptsZipFolder.folder((dept.name || dept.id).replace(/[/\\?%*:|"<>]/g, "_"))!;
        for (let i = 0; i < urls.length; i++) {
          const url = urls[i];
          try {
            const filePath = path.join(cwd, "public", url);
            const buffer = await readFile(filePath).catch(() => null);
            if (buffer) {
              subFolder.file(path.basename(url), buffer);
            }
          } catch {}
        }
      }

      // B. Scan all other folders in public/uploads/
      try {
        const topEntries = await readdir(uploadsBase, { withFileTypes: true });
        for (const entry of topEntries) {
          if (entry.isDirectory() && !entry.name.startsWith("dept_") && entry.name !== "temp") {
            const folderZip = zip.folder(entry.name)!;
            const subDir = path.join(uploadsBase, entry.name);
            const subEntries = await readdir(subDir, { withFileTypes: true }).catch(() => []);
            for (const sub of subEntries) {
              if (sub.isFile()) {
                const buffer = await readFile(path.join(subDir, sub.name)).catch(() => null);
                if (buffer) folderZip.file(sub.name, buffer);
              }
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
    console.error("Error generating multimedia ZIP:", error);
    return new NextResponse("Error al generar archivo ZIP", { status: 500 });
  }
}
