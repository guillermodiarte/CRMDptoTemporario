import { NextRequest, NextResponse } from "next/server";
import { mkdir, rm, readdir } from "fs/promises";
import path from "path";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const STANDARD_FOLDERS = [
  { id: "slides", name: "Slides de Portada", isCustom: false, icon: "Images" },
  { id: "logos", name: "Logos & Marcas", isCustom: false, icon: "Tag" },
  { id: "guia", name: "Guía y Turismo", isCustom: false, icon: "MapPin" },
  { id: "general", name: "General / Login", isCustom: false, icon: "Folder" },
];

const CUSTOM_FOLDERS_KEY = "custom_media_folders";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isSuperAdmin = (session.user as any).isSuperAdmin === true;
    if (!isSuperAdmin) {
      return NextResponse.json({ folders: [] });
    }

    // Load custom folders from DB
    const setting = await prisma.systemSettings.findFirst({
      where: { key: CUSTOM_FOLDERS_KEY, sessionId: null },
    });

    let customFolders: { id: string; name: string; isCustom: boolean }[] = [];
    if (setting?.value) {
      try {
        customFolders = JSON.parse(setting.value);
      } catch {}
    }

    // Also scan public/uploads directory for any folders not in list (excluding depts)
    try {
      const uploadsDir = path.join(process.cwd(), "public", "uploads");
      const dirEntries = await readdir(uploadsDir, { withFileTypes: true });
      const existingFolderNames = dirEntries.filter(e => e.isDirectory()).map(e => e.name);

      const knownIds = new Set([...STANDARD_FOLDERS.map(f => f.id), ...customFolders.map(f => f.id)]);
      for (const name of existingFolderNames) {
        if (!knownIds.has(name) && !name.startsWith("dept_") && name !== "temp") {
          customFolders.push({ id: name, name: name.replace(/_/g, " "), isCustom: true });
          knownIds.add(name);
        }
      }
    } catch {}

    const allFolders = [...STANDARD_FOLDERS, ...customFolders];
    return NextResponse.json({ folders: allFolders });
  } catch (error) {
    console.error("Error fetching media folders:", error);
    return NextResponse.json({ error: "Error al obtener carpetas" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const isSuperAdmin = (session?.user as any)?.isSuperAdmin === true;

    if (!isSuperAdmin) {
      return NextResponse.json({ error: "Solo el SuperAdmin puede crear carpetas" }, { status: 403 });
    }

    const { name } = await req.json();
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Nombre de carpeta inválido" }, { status: 400 });
    }

    const sanitizedId = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "_")
      .slice(0, 40);

    if (!sanitizedId) {
      return NextResponse.json({ error: "Nombre inválido" }, { status: 400 });
    }

    // Create physical directory
    const dirPath = path.join(process.cwd(), "public", "uploads", sanitizedId);
    await mkdir(dirPath, { recursive: true });

    // Save in custom folders list
    const setting = await prisma.systemSettings.findFirst({
      where: { key: CUSTOM_FOLDERS_KEY, sessionId: null },
    });

    let customFolders: { id: string; name: string; isCustom: boolean }[] = [];
    if (setting?.value) {
      try {
        customFolders = JSON.parse(setting.value);
      } catch {}
    }

    if (!customFolders.some(f => f.id === sanitizedId)) {
      customFolders.push({ id: sanitizedId, name: name.trim(), isCustom: true });
      await prisma.systemSettings.upsert({
        where: { key_sessionId: { key: CUSTOM_FOLDERS_KEY, sessionId: "" } },
        update: { value: JSON.stringify(customFolders) },
        create: { key: CUSTOM_FOLDERS_KEY, value: JSON.stringify(customFolders), sessionId: null },
      });
    }

    return NextResponse.json({ success: true, folder: { id: sanitizedId, name: name.trim(), isCustom: true } });
  } catch (error) {
    console.error("Error creating folder:", error);
    return NextResponse.json({ error: "Error al crear carpeta" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    const isSuperAdmin = (session?.user as any)?.isSuperAdmin === true;

    if (!isSuperAdmin) {
      return NextResponse.json({ error: "Solo el SuperAdmin puede borrar carpetas" }, { status: 403 });
    }

    const { folderId } = await req.json();
    if (!folderId || STANDARD_FOLDERS.some(f => f.id === folderId)) {
      return NextResponse.json({ error: "No se puede eliminar una carpeta del sistema" }, { status: 400 });
    }

    // Remove from DB setting
    const setting = await prisma.systemSettings.findFirst({
      where: { key: CUSTOM_FOLDERS_KEY, sessionId: null },
    });

    let customFolders: { id: string; name: string; isCustom: boolean }[] = [];
    if (setting?.value) {
      try {
        customFolders = JSON.parse(setting.value);
      } catch {}
    }

    const updated = customFolders.filter(f => f.id !== folderId);
    await prisma.systemSettings.upsert({
      where: { key_sessionId: { key: CUSTOM_FOLDERS_KEY, sessionId: "" } },
      update: { value: JSON.stringify(updated) },
      create: { key: CUSTOM_FOLDERS_KEY, value: JSON.stringify(updated), sessionId: null },
    });

    // Remove physical folder if exists
    const dirPath = path.join(process.cwd(), "public", "uploads", folderId);
    await rm(dirPath, { recursive: true, force: true }).catch(() => null);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting folder:", error);
    return NextResponse.json({ error: "Error al eliminar carpeta" }, { status: 500 });
  }
}
