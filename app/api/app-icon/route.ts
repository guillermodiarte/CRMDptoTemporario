import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import sharp from "sharp";
import { getSiteConfig } from "@/lib/site-config-loader";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const isMaskable = searchParams.get("maskable") === "1" || searchParams.get("maskable") === "true";
    const sizeParam = parseInt(searchParams.get("size") || "512", 10);
    const targetSize = isNaN(sizeParam) || sizeParam < 64 || sizeParam > 1024 ? 512 : sizeParam;

    const config = await getSiteConfig();
    const rawIconUrl = config.appIconUrl || "/icon.png";

    // Resolve local file path
    let localPath = "";
    if (rawIconUrl.startsWith("/")) {
      localPath = path.join(process.cwd(), "public", rawIconUrl.replace(/^\//, ""));
    } else {
      localPath = path.join(process.cwd(), "public", "icon.png");
    }

    let inputBuffer: Buffer;
    try {
      inputBuffer = await fs.readFile(localPath);
    } catch {
      // Fallback to default icon.png if file not found
      const defaultPath = path.join(process.cwd(), "public", "icon.png");
      inputBuffer = await fs.readFile(defaultPath);
    }

    if (!isMaskable) {
      // Return normal optimized icon
      const optimized = await sharp(inputBuffer)
        .resize(targetSize, targetSize, { fit: "inside", withoutEnlargement: true })
        .png()
        .toBuffer();

      return new NextResponse(new Uint8Array(optimized), {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
        },
      });
    }

    // Maskable Adaptive Icon generation:
    // 1. Trim transparent whitespace around logo to find actual content bounds
    let trimmed = sharp(inputBuffer).trim();
    let meta = await trimmed.metadata();

    // Safe zone is 80-84% of canvas size to ensure it fills the circle/squircle like Mercado Libre
    // without clipping important artwork in Android launcher masks
    const safeDim = Math.round(targetSize * 0.82);
    const contentWidth = meta.width || targetSize;
    const contentHeight = meta.height || targetSize;

    const scale = Math.min(safeDim / contentWidth, safeDim / contentHeight);
    const scaledWidth = Math.max(1, Math.round(contentWidth * scale));
    const scaledHeight = Math.max(1, Math.round(contentHeight * scale));

    const resizedArtwork = await sharp(inputBuffer)
      .trim()
      .resize(scaledWidth, scaledHeight, { fit: "inside" })
      .toBuffer();

    // 2. Create solid full-bleed white canvas (fills 100% of circle, eliminating legacy white borders)
    const maskableBuffer = await sharp({
      create: {
        width: targetSize,
        height: targetSize,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .composite([{ input: resizedArtwork, gravity: "centre" }])
      .png()
      .toBuffer();

    return new NextResponse(new Uint8Array(maskableBuffer), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("Error generating app icon:", error);
    return new NextResponse("Error generating icon", { status: 500 });
  }
}
