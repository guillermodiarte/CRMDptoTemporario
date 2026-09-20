/**
 * Migration script: Rename upload files to short sequential names
 * and clean up non-webp files.
 *
 * Run with: npx tsx scripts/rename-uploads.ts
 */

import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const uploadsRoot = path.join(process.cwd(), "public", "uploads");

const PREFIX_MAP: Record<string, string> = {
  logos: "logo",
  slides: "slide",
  general: "imagen",
  icons: "icon",
  avatars: "avatar",
  guia: "guia",
};

function getPrefix(folderName: string): string {
  return PREFIX_MAP[folderName.toLowerCase()] || "foto";
}

const IMAGE_EXTS = new Set([".webp", ".jpg", ".jpeg", ".png", ".gif", ".avif"]);

function listWebpFiles(dir: string): string[] {
  try {
    return fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".webp")).sort();
  } catch {
    return [];
  }
}

function listNonWebpImages(dir: string): string[] {
  try {
    return fs.readdirSync(dir).filter((f) => {
      const ext = path.extname(f).toLowerCase();
      return IMAGE_EXTS.has(ext) && ext !== ".webp";
    });
  } catch {
    return [];
  }
}

type RenameMap = Map<string, string>;

async function processFolder(
  folderPath: string,
  folderName: string,
  prefix: string,
  relPath: string
): Promise<RenameMap> {
  const renameMap: RenameMap = new Map();
  const webpFiles = listWebpFiles(folderPath);

  console.log(`\n📁 ${relPath} — ${webpFiles.length} webp files`);

  let seq = 1;
  for (const oldName of webpFiles) {
    const newName = `${prefix}-${seq}.webp`;
    seq++;

    const oldPath = path.join(folderPath, oldName);
    const newPath = path.join(folderPath, newName);

    if (oldName === newName) {
      console.log(`  ✓ already correct: ${oldName}`);
      continue;
    }

    if (fs.existsSync(newPath) && newPath !== oldPath) {
      console.warn(`  ⚠️  SKIP ${oldName} → ${newName} (target already exists)`);
      continue;
    }

    fs.renameSync(oldPath, newPath);
    console.log(`  ✅ ${oldName} → ${newName}`);

    const oldUrl = `/uploads/${relPath}/${oldName}`;
    const newUrl = `/uploads/${relPath}/${newName}`;
    renameMap.set(oldUrl, newUrl);
  }

  const nonWebp = listNonWebpImages(folderPath);
  for (const f of nonWebp) {
    const ext = path.extname(f).toLowerCase();
    if (folderName === "icons" && ext === ".png") {
      console.log(`  🔒 keep (PWA icon): ${f}`);
      continue;
    }
    fs.unlinkSync(path.join(folderPath, f));
    console.log(`  🗑️  deleted ${ext}: ${f}`);
  }

  return renameMap;
}

async function updateDatabase(globalRenameMap: RenameMap) {
  console.log("\n\n📋 Updating database references...");

  const settings = await prisma.systemSettings.findMany();
  for (const setting of settings) {
    if (!setting.value) continue;
    let updated = setting.value;
    for (const [oldUrl, newUrl] of globalRenameMap) {
      updated = updated.replaceAll(oldUrl, newUrl);
    }
    if (updated !== setting.value) {
      await prisma.systemSettings.update({ where: { id: setting.id }, data: { value: updated } });
      console.log(`  ✅ systemSettings[${setting.key}] updated`);
    }
  }

  const departments = await prisma.department.findMany();
  for (const dept of departments) {
    if (!dept.images) continue;
    let imagesStr = dept.images as string;
    let updated = imagesStr;
    for (const [oldUrl, newUrl] of globalRenameMap) {
      updated = updated.replaceAll(oldUrl, newUrl);
    }
    if (updated !== imagesStr) {
      await prisma.department.update({ where: { id: dept.id }, data: { images: updated } });
      console.log(`  ✅ Department[${dept.name}] images updated`);
    }
  }

  console.log("  📋 Database update complete.");
}

async function updateSourceCodeRefs(globalRenameMap: RenameMap) {
  const filesToCheck = [
    "components/public-guide-client.tsx",
    "components/public-info-client.tsx",
    "lib/site.config.ts",
  ];

  console.log("\n📝 Updating source code references...");
  for (const relFile of filesToCheck) {
    const filePath = path.join(process.cwd(), relFile);
    if (!fs.existsSync(filePath)) continue;
    let content = fs.readFileSync(filePath, "utf-8");
    let updated = content;
    for (const [oldUrl, newUrl] of globalRenameMap) {
      updated = updated.replaceAll(oldUrl, newUrl);
    }
    if (updated !== content) {
      fs.writeFileSync(filePath, updated, "utf-8");
      console.log(`  ✅ Source file updated: ${relFile}`);
    }
  }
}

async function deleteOrphanRootFiles() {
  const rootFiles = fs.readdirSync(uploadsRoot).filter((f) => {
    const ext = path.extname(f).toLowerCase();
    return IMAGE_EXTS.has(ext) && ext !== ".webp" && !f.startsWith(".");
  });
  for (const f of rootFiles) {
    fs.unlinkSync(path.join(uploadsRoot, f));
    console.log(`  🗑️  deleted root non-webp: ${f}`);
  }
}

async function main() {
  console.log("🚀 Starting upload files migration...\n");

  const globalRenameMap: RenameMap = new Map();

  const topLevelFolders = fs
    .readdirSync(uploadsRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== "departamentos")
    .map((d) => d.name);

  for (const folder of topLevelFolders) {
    const folderPath = path.join(uploadsRoot, folder);
    const prefix = getPrefix(folder);
    const map = await processFolder(folderPath, folder, prefix, folder);
    for (const [k, v] of map) globalRenameMap.set(k, v);
  }

  const deptRoot = path.join(uploadsRoot, "departamentos");
  if (fs.existsSync(deptRoot)) {
    const deptFolders = fs
      .readdirSync(deptRoot, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    for (const deptFolder of deptFolders) {
      const deptPath = path.join(deptRoot, deptFolder);
      const relPath = `departamentos/${deptFolder}`;
      const map = await processFolder(deptPath, deptFolder, "foto", relPath);
      for (const [k, v] of map) globalRenameMap.set(k, v);
    }
  }

  console.log("\n📁 Cleaning root-level non-webp files...");
  await deleteOrphanRootFiles();

  console.log(`\n\n📊 Total files renamed: ${globalRenameMap.size}`);

  await updateDatabase(globalRenameMap);
  await updateSourceCodeRefs(globalRenameMap);

  console.log("\n✅ Migration complete!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
