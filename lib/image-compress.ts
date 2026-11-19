/**
 * Client-side photo shrinking before upload. A phone camera photo (3–8 MB) becomes roughly
 * 150–400 KB, which saves data for the sender AND for every reader who loads it in the thread.
 * Re-encoding also strips EXIF metadata (including GPS location).
 *
 * GIFs are left alone (re-encoding would drop animation). Anything that fails, or doesn't
 * come out smaller, falls back to the original file.
 */
const MAX_EDGE = 1600;
const SKIP_BELOW_BYTES = 250 * 1024;
const COMPRESSIBLE = /^image\/(jpeg|png|webp)$/;

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function compressImage(file: File): Promise<File> {
  if (!COMPRESSIBLE.test(file.type) || typeof createImageBitmap !== "function") return file;

  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < SKIP_BELOW_BYTES) {
      bitmap.close();
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) { bitmap.close(); return file; }
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    // WebP keeps transparency and is smallest; older Safari can't encode it (toBlob then
    // returns PNG), so fall back to JPEG on a white background.
    let blob = await toBlob(canvas, "image/webp", 0.8);
    if (!blob || blob.type !== "image/webp") {
      ctx.globalCompositeOperation = "destination-over";
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      blob = await toBlob(canvas, "image/jpeg", 0.82);
    }
    if (!blob || blob.size >= file.size) return file;

    const ext = blob.type === "image/webp" ? ".webp" : ".jpg";
    const base = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${base}${ext}`, { type: blob.type, lastModified: Date.now() });
  } catch {
    return file;
  }
}
