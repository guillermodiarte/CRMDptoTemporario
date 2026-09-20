import fs from "fs";
import path from "path";
import prisma from "@/lib/prisma";

const IMAGE_EXTS = new Set([".webp", ".png", ".jpg", ".jpeg", ".avif", ".svg", ".gif"]);

export function normalizeDeptName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export function getDeptUploadsBaseDir(): string {
  const dir = path.join(process.cwd(), "public", "uploads", "departamentos");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Finds the folder name inside `public/uploads/departamentos/` that corresponds to a department.
 * If not found, creates and returns a clean canonical folder name.
 */
export function getDepartmentFolder(dept: { id?: string; name: string }): {
  folderName: string;
  folderPath: string;
  relativePublicUrl: string;
} {
  const baseDir = getDeptUploadsBaseDir();
  const diskFolders = fs
    .readdirSync(baseDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  const normTarget = normalizeDeptName(dept.name);

  // 1. Try normalized matching (e.g. 'departamento1' matches 'Departamento_1' or 'Departamento 1')
  let matched = diskFolders.find((f) => normalizeDeptName(f) === normTarget);

  // 2. Try dept id match
  if (!matched && dept.id) {
    matched = diskFolders.find((f) => f === dept.id);
  }

  // 3. Fallback to sanitized canonical name
  const folderName =
    matched ||
    dept.name
      .trim()
      .replace(/[/\\?%*:|"<>]/g, "_")
      .replace(/\s+/g, "_");

  const folderPath = path.join(baseDir, folderName);
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  return {
    folderName,
    folderPath,
    relativePublicUrl: `/uploads/departamentos/${folderName}`,
  };
}

/**
 * Scans disk folder for a department, merges new disk files with existing DB images,
 * cleans up removed files, and updates DB if needed.
 */
export async function syncDepartmentImages(dept: {
  id: string;
  name: string;
  images?: string | null;
}): Promise<string[]> {
  try {
    const { folderName, folderPath, relativePublicUrl } = getDepartmentFolder(dept);

    if (!fs.existsSync(folderPath)) {
      return [];
    }

    const diskFiles = fs
      .readdirSync(folderPath)
      .filter((file) => {
        const ext = path.extname(file).toLowerCase();
        return IMAGE_EXTS.has(ext) && !file.startsWith(".");
      })
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));

    const diskFileSet = new Set(diskFiles);
    const diskUrls = diskFiles.map((file) => `${relativePublicUrl}/${file}`);

    // Parse existing DB images
    let currentUrls: string[] = [];
    try {
      let parsed: any = dept.images || "[]";
      while (typeof parsed === "string") {
        try {
          const next = JSON.parse(parsed);
          if (typeof next === "string" || Array.isArray(next)) parsed = next;
          else break;
        } catch {
          break;
        }
      }
      if (Array.isArray(parsed)) {
        currentUrls = parsed
          .map((item) => (typeof item === "string" ? item : item?.url ?? ""))
          .filter(Boolean);
      }
    } catch {
      currentUrls = [];
    }

    // Build synchronized list:
    // 1. Keep existing URLs that still exist on disk (preserving user's custom ordering)
    const validExistingUrls: string[] = [];
    const seenFiles = new Set<string>();

    for (const url of currentUrls) {
      const fileName = path.basename(url);
      if (diskFileSet.has(fileName) && !seenFiles.has(fileName)) {
        // Normalize URL path to current folder name in case folder was renamed
        validExistingUrls.push(`${relativePublicUrl}/${fileName}`);
        seenFiles.add(fileName);
      }
    }

    // 2. Append any new files on disk not yet in DB
    const newDiskUrls: string[] = [];
    for (const file of diskFiles) {
      if (!seenFiles.has(file)) {
        newDiskUrls.push(`${relativePublicUrl}/${file}`);
        seenFiles.add(file);
      }
    }

    const finalUrls = [...validExistingUrls, ...newDiskUrls];

    // If finalUrls differs from current DB string, persist to database
    const currentJson = JSON.stringify(currentUrls);
    const finalJson = JSON.stringify(finalUrls);

    if (currentJson !== finalJson) {
      await prisma.department.update({
        where: { id: dept.id },
        data: { images: finalJson },
      });
    }

    return finalUrls;
  } catch (error) {
    console.error(`Error syncing images for department ${dept.name}:`, error);
    try {
      return JSON.parse(dept.images || "[]");
    } catch {
      return [];
    }
  }
}

/**
 * Synchronize images for all apartments in the database.
 */
export async function syncAllDepartmentsImages(): Promise<
  Array<{
    id: string;
    name: string;
    images: string;
    color: string;
  }>
> {
  const departments = await prisma.department.findMany({
    where: {
      type: "APARTMENT",
      isArchived: false,
    },
    select: {
      id: true,
      name: true,
      images: true,
      color: true,
    },
    orderBy: { name: "asc" },
  });

  const syncedDepartments = await Promise.all(
    departments.map(async (dept) => {
      const syncedUrls = await syncDepartmentImages(dept);
      return {
        ...dept,
        images: JSON.stringify(syncedUrls),
      };
    })
  );

  return syncedDepartments;
}
