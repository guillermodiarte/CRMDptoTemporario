/**
 * Centralized helper for resolving the uploads directory path.
 *
 * In production (Docker / Dokploy) the `start.sh` script expects a persistent
 * volume to be mounted at `/app/public/uploads`. All API routes must write
 * files there — NOT relative to `process.cwd()` — so that uploaded images
 * survive container redeploys.
 *
 * In local development the directory is resolved from `process.cwd()` as usual.
 */

import fs from "fs";
import path from "path";

/** The well-known persistent volume path used in Docker / Dokploy deployments */
const PROD_UPLOADS_ROOT = "/app/public/uploads";

/**
 * Returns the absolute path to the uploads root directory.
 * Prefers the persistent volume in production, falls back to the local
 * `public/uploads` directory for development.
 */
export function getUploadsRoot(): string {
  if (fs.existsSync(PROD_UPLOADS_ROOT)) {
    return PROD_UPLOADS_ROOT;
  }
  return path.join(process.cwd(), "public", "uploads");
}

/**
 * Returns the absolute path for a specific sub-folder inside uploads.
 * Creates the directory if it doesn't exist.
 */
export function getUploadsDir(subDir: string): string {
  const dir = path.join(getUploadsRoot(), subDir);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Resolves a `/uploads/...` URL to its absolute path on disk.
 * Returns null if the path would escape the uploads root (path traversal guard).
 */
export function resolveUploadUrl(urlPath: string): string | null {
  if (!urlPath.startsWith("/uploads/")) return null;
  const relative = urlPath.replace(/^\/uploads\//, "").replace(/\.\./g, "");
  const root = getUploadsRoot();
  const absolute = path.join(root, relative);
  // Guard against traversal
  if (!absolute.startsWith(root)) return null;
  return absolute;
}
