/** Shared allowlist — keep in sync with astra_hub_register_attachment */

export const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB
export const MAX_FILES_PER_MESSAGE = 10;

export const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "video/mp4",
]);

const BLOCKED_EXT = /\.(svg|exe|bat|cmd|scr|js|msi|dll|zip)$/i;

export function isAllowedFile(file: { name: string; type: string; size: number }): {
  ok: boolean;
  error?: string;
} {
  if (file.size <= 0 || file.size > MAX_FILE_BYTES) {
    return { ok: false, error: "file_too_large" };
  }
  if (BLOCKED_EXT.test(file.name)) {
    return { ok: false, error: "extension_not_allowed" };
  }
  const mime = (file.type || "").toLowerCase();
  if (!ALLOWED_MIME.has(mime)) {
    return { ok: false, error: "mime_not_allowed" };
  }
  return { ok: true };
}

export function randomStorageName(originalName: string): string {
  const ext = originalName.includes(".")
    ? originalName.slice(originalName.lastIndexOf(".")).toLowerCase()
    : "";
  const safeExt = /^\.[a-z0-9]{1,8}$/.test(ext) ? ext : "";
  return `${crypto.randomUUID()}${safeExt}`;
}
