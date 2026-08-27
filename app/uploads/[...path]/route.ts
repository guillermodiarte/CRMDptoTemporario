import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { readFile } from "fs/promises";
import { existsSync } from "fs";

export const dynamic = "force-dynamic";

const MIME_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  avif: "image/avif",
};

/**
 * Dynamic route to serve uploads immediately after upload without requiring a server restart or redeploy.
 * Next.js standalone mode only indexes public/ at startup, so newly created runtime files need this route handler.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;
    if (!pathSegments || pathSegments.length === 0) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const relativePath = pathSegments.join("/");
    // Sanitize path against directory traversal
    const safePath = path.normalize(relativePath).replace(/^(\.\.[\/\\])+/, "");

    // Search in all possible locations for uploads
    const possiblePaths = [
      path.join(process.cwd(), "public", "uploads", safePath),
      path.join("/app", "public", "uploads", safePath),
      path.join(process.cwd(), "..", "..", "public", "uploads", safePath),
    ];

    let foundPath: string | null = null;
    for (const p of possiblePaths) {
      if (existsSync(p)) {
        foundPath = p;
        break;
      }
    }

    if (!foundPath) {
      return new NextResponse("File Not Found", { status: 404 });
    }

    const fileBuffer = await readFile(foundPath);
    const ext = safePath.split(".").pop()?.toLowerCase() || "jpg";
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("[DYNAMIC_UPLOADS_ROUTE_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
