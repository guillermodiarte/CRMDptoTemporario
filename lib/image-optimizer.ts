import sharp from "sharp";

export interface OptimizeOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: "webp" | "jpeg" | "original";
}

/**
 * Optimizes an image buffer:
 * - Auto-rotates according to EXIF orientation metadata
 * - Resizes to maximum bounding box (default 1600x1200) without enlargement
 * - Compresses to modern WebP (default) or progressive JPEG
 * - Dramatic reduction in file size (typically 80-95% smaller) while preserving high visual quality
 */
export async function optimizeImageBuffer(
  inputBuffer: Buffer,
  options: OptimizeOptions = {}
): Promise<{
  buffer: Buffer;
  extension: string;
  mimeType: string;
  width?: number;
  height?: number;
}> {
  const {
    maxWidth = 1600,
    maxHeight = 1200,
    quality = 80,
    format = "webp",
  } = options;

  try {
    const image = sharp(inputBuffer, { failOnError: false }).rotate();
    const metadata = await image.metadata();

    // Check if it's already small enough and should stay original
    let pipeline = image.resize({
      width: maxWidth,
      height: maxHeight,
      fit: "inside",
      withoutEnlargement: true,
    });

    if (format === "webp") {
      pipeline = pipeline.webp({
        quality,
        effort: 4,
      });
      const outputBuffer = await pipeline.toBuffer();
      return {
        buffer: outputBuffer,
        extension: "webp",
        mimeType: "image/webp",
        width: metadata.width,
        height: metadata.height,
      };
    } else if (format === "jpeg") {
      pipeline = pipeline.jpeg({
        quality,
        progressive: true,
        mozjpeg: true,
      });
      const outputBuffer = await pipeline.toBuffer();
      return {
        buffer: outputBuffer,
        extension: "jpg",
        mimeType: "image/jpeg",
        width: metadata.width,
        height: metadata.height,
      };
    } else {
      // Keep original format but compress & resize
      const origFormat = metadata.format || "jpeg";
      if (origFormat === "png") {
        pipeline = pipeline.png({ quality, compressionLevel: 8 });
      } else if (origFormat === "webp") {
        pipeline = pipeline.webp({ quality });
      } else {
        pipeline = pipeline.jpeg({ quality, progressive: true });
      }
      const outputBuffer = await pipeline.toBuffer();
      return {
        buffer: outputBuffer,
        extension: origFormat === "jpeg" ? "jpg" : origFormat,
        mimeType: `image/${origFormat}`,
        width: metadata.width,
        height: metadata.height,
      };
    }
  } catch (error) {
    console.warn("Could not optimize image with sharp, returning original buffer:", error);
    return {
      buffer: inputBuffer,
      extension: "jpg",
      mimeType: "image/jpeg",
    };
  }
}
