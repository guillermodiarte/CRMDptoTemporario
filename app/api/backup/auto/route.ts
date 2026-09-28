import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export function getDatabasePath(): string {
  const dbUrl = process.env.DATABASE_URL || "file:./prisma/dev.db";
  const raw = dbUrl.replace(/^file:/, "").trim();

  if (path.isAbsolute(raw)) {
    return raw;
  }

  const cwd = process.cwd();
  const candidates = [
    path.resolve(cwd, raw),
    path.resolve(cwd, "prisma", raw),
    path.resolve(cwd, "prisma", path.basename(raw)),
    path.resolve(cwd, ".next/standalone/prisma", path.basename(raw)),
    path.resolve(cwd, ".next/standalone", raw),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return path.resolve(cwd, "prisma", path.basename(raw));
}

export function getBackupDirectory(): string {
  if (process.env.BACKUP_DIR && fs.existsSync(process.env.BACKUP_DIR)) {
    return process.env.BACKUP_DIR;
  }
  if (fs.existsSync("/app/crm_backups")) {
    return "/app/crm_backups";
  }
  const localDir = path.resolve(process.cwd(), "crm_backups");
  if (!fs.existsSync(localDir)) {
    try {
      fs.mkdirSync(localDir, { recursive: true });
    } catch (e) {
      console.error("[BACKUP_AUTO] Error al crear directorio local de backups:", e);
    }
  }
  return localDir;
}

function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

// 7-day retention cleaner
function cleanOldBackups(backupDir: string) {
  try {
    const files = fs.readdirSync(backupDir);
    const now = Date.now();
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

    for (const file of files) {
      if (!file.endsWith(".db")) continue;
      const filePath = path.join(backupDir, file);
      try {
        const stats = fs.statSync(filePath);
        if (now - stats.mtimeMs > SEVEN_DAYS_MS) {
          console.log(`[BACKUP_AUTO] Eliminando backup de más de 7 días: ${file}`);
          fs.unlinkSync(filePath);
        }
      } catch (err) {
        console.warn(`[BACKUP_AUTO] Error al verificar antigüedad de ${file}:`, err);
      }
    }
  } catch (err) {
    console.error("[BACKUP_AUTO] Error en limpieza de retención:", err);
  }
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    const user = session?.user as any;

    if (user?.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const filename = searchParams.get("filename");
    const backupDir = getBackupDirectory();

    // 1. Download single backup file
    if (action === "download") {
      if (!filename || path.basename(filename) !== filename || !filename.endsWith(".db")) {
        return new NextResponse("Invalid filename", { status: 400 });
      }

      const filePath = path.join(backupDir, filename);
      if (!fs.existsSync(filePath)) {
        return new NextResponse("Backup file not found", { status: 404 });
      }

      const fileBuffer = fs.readFileSync(filePath);
      const stat = fs.statSync(filePath);

      return new NextResponse(fileBuffer, {
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
          "Content-Length": stat.size.toString(),
        },
      });
    }

    // 2. List all backups
    if (!fs.existsSync(backupDir)) {
      return NextResponse.json({ backups: [], backupDir });
    }

    // Run 7-day retention check
    cleanOldBackups(backupDir);

    const files = fs.readdirSync(backupDir);
    const backups = files
      .filter((file) => file.endsWith(".db"))
      .map((file) => {
        const filePath = path.join(backupDir, file);
        try {
          const stats = fs.statSync(filePath);
          return {
            filename: file,
            size: stats.size,
            formattedSize: formatBytes(stats.size),
            createdAt: stats.mtime.toISOString(),
            isSafetyBackup: file.startsWith("pre_restore_safety_"),
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b!.createdAt).getTime() - new Date(a!.createdAt).getTime());

    return NextResponse.json({ backups, backupDir });
  } catch (error) {
    console.error("[BACKUP_AUTO_GET_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    const user = session?.user as any;

    if (user?.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { action, filename } = body;
    const backupDir = getBackupDirectory();
    const activeDbPath = getDatabasePath();

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // --- Action: CREATE MANUAL SNAPSHOT ---
    if (action === "create") {
      if (!fs.existsSync(activeDbPath)) {
        return NextResponse.json(
          { error: `No se encontró la base de datos origen en: ${activeDbPath}` },
          { status: 404 }
        );
      }

      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
      const destName = `backup base de datos global ${timestamp}.db`;
      const destPath = path.join(backupDir, destName);

      // Try sqlite3 .backup if available, fallback to copyFileSync
      let backupSuccess = false;
      try {
        await execAsync(`sqlite3 "${activeDbPath}" ".backup '${destPath}'"`);
        backupSuccess = true;
      } catch {
        // Fallback to copyFileSync
        try {
          fs.copyFileSync(activeDbPath, destPath);
          backupSuccess = true;
        } catch (copyErr) {
          console.error("[BACKUP_AUTO_CREATE] Error en copia directa:", copyErr);
        }
      }

      if (!backupSuccess || !fs.existsSync(destPath)) {
        return NextResponse.json(
          { error: "No se pudo generar la copia de la base de datos." },
          { status: 500 }
        );
      }

      // Run retention cleanup
      cleanOldBackups(backupDir);

      return NextResponse.json({
        success: true,
        message: "Copia de seguridad creada correctamente.",
        filename: destName,
      });
    }

    // --- Action: RESTORE FROM BACKUP FILE ---
    if (action === "restore") {
      if (!filename || path.basename(filename) !== filename || !filename.endsWith(".db")) {
        return NextResponse.json({ error: "Nombre de archivo de backup inválido." }, { status: 400 });
      }

      const sourceBackupPath = path.join(backupDir, filename);
      if (!fs.existsSync(sourceBackupPath)) {
        return NextResponse.json({ error: "El archivo de backup seleccionado no existe." }, { status: 404 });
      }

      // Step 1: Disconnect Prisma to release handles
      try {
        await prisma.$disconnect();
      } catch (discErr) {
        console.warn("[BACKUP_AUTO_RESTORE] Aviso al desconectar Prisma:", discErr);
      }

      // Step 2: Brief pause to allow locks to release
      await new Promise((r) => setTimeout(r, 200));

      // Step 3: Emergency safety backup of current state before overwrite
      if (fs.existsSync(activeDbPath)) {
        try {
          const safetyName = `pre_restore_safety_${Date.now()}.db`;
          fs.copyFileSync(activeDbPath, path.join(backupDir, safetyName));
        } catch (safetyErr) {
          console.warn("[BACKUP_AUTO_RESTORE] Aviso al crear backup de seguridad preventivo:", safetyErr);
        }
      }

      // Step 4: Delete stale WAL & SHM files so SQLite doesn't replay old journal
      const walPath = `${activeDbPath}-wal`;
      const shmPath = `${activeDbPath}-shm`;
      if (fs.existsSync(walPath)) {
        try { fs.unlinkSync(walPath); } catch (e) { console.warn("No se pudo borrar WAL:", e); }
      }
      if (fs.existsSync(shmPath)) {
        try { fs.unlinkSync(shmPath); } catch (e) { console.warn("No se pudo borrar SHM:", e); }
      }

      // Step 5: Overwrite active DB
      try {
        fs.copyFileSync(sourceBackupPath, activeDbPath);
      } catch (err: any) {
        console.error("[BACKUP_AUTO_RESTORE] Error al sobrescribir la base de datos:", err);
        return NextResponse.json(
          { error: `Error al restaurar el archivo: ${err.message}` },
          { status: 500 }
        );
      }

      // Step 6: Reconnect Prisma
      try {
        await prisma.$connect();
      } catch (connErr) {
        console.warn("[BACKUP_AUTO_RESTORE] Aviso al reconectar Prisma:", connErr);
      }

      return NextResponse.json({
        success: true,
        message: "Base de datos restaurada correctamente. La página se recargará para aplicar los cambios.",
      });
    }

    // --- Action: DELETE BACKUP FILE ---
    if (action === "delete") {
      if (!filename || path.basename(filename) !== filename || !filename.endsWith(".db")) {
        return NextResponse.json({ error: "Nombre de archivo inválido." }, { status: 400 });
      }

      const targetPath = path.join(backupDir, filename);
      if (fs.existsSync(targetPath)) {
        fs.unlinkSync(targetPath);
      }

      return NextResponse.json({
        success: true,
        message: "Copia de seguridad eliminada.",
      });
    }

    return NextResponse.json({ error: "Acción no reconocida." }, { status: 400 });
  } catch (error: any) {
    console.error("[BACKUP_AUTO_POST_ERROR]", error);
    return NextResponse.json({ error: error?.message || "Error interno del servidor" }, { status: 500 });
  }
}
