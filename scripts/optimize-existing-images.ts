import fs from "fs";
import path from "path";
import sharp from "sharp";

async function optimizeDirectory(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    console.log(`Directory ${dirPath} does not exist.`);
    return;
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      await optimizeDirectory(fullPath);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (![".jpg", ".jpeg", ".png", ".webp"].includes(ext)) continue;

      const stat = fs.statSync(fullPath);
      const originalSize = stat.size;

      // Skip files already under 150KB
      if (originalSize < 150 * 1024) continue;

      try {
        const inputBuffer = fs.readFileSync(fullPath);
        const image = sharp(inputBuffer, { failOnError: false }).rotate();
        const meta = await image.metadata();

        let pipeline = image.resize({
          width: 1600,
          height: 1200,
          fit: "inside",
          withoutEnlargement: true,
        });

        let outputBuffer: Buffer;

        if (ext === ".png") {
          outputBuffer = await pipeline.png({ quality: 80, compressionLevel: 8 }).toBuffer();
        } else if (ext === ".webp") {
          outputBuffer = await pipeline.webp({ quality: 80 }).toBuffer();
        } else {
          // jpg / jpeg
          outputBuffer = await pipeline.jpeg({ quality: 80, progressive: true, mozjpeg: true }).toBuffer();
        }

        // Only overwrite if it actually saved space
        if (outputBuffer.length < originalSize) {
          fs.writeFileSync(fullPath, outputBuffer);
          const savedPct = Math.round(((originalSize - outputBuffer.length) / originalSize) * 100);
          console.log(
            `✓ Optimized: ${entry.name} (${Math.round(originalSize / 1024)}KB → ${Math.round(
              outputBuffer.length / 1024
            )}KB, -${savedPct}%)`
          );
        }
      } catch (err) {
        console.warn(`Could not optimize ${entry.name}:`, err);
      }
    }
  }
}

async function main() {
  console.log("=== STARTING IMAGE OPTIMIZATION ===");
  const publicDir = path.join(process.cwd(), "public");

  console.log("\n1. Optimizing /public/guia...");
  await optimizeDirectory(path.join(publicDir, "guia"));

  console.log("\n2. Optimizing /public/uploads...");
  await optimizeDirectory(path.join(publicDir, "uploads"));

  console.log("\n=== OPTIMIZATION COMPLETED ===");
}

main().catch(console.error);
