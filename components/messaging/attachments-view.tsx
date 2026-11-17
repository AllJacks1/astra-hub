"use client";

import { formatBytes, isImageMime } from "@/lib/file-allowlist";
import type { ThreadMessage } from "@/lib/messaging/validate";

type Attachment = NonNullable<ThreadMessage["attachments"]>[number];

export function AttachmentList({
  attachments,
  urls,
  onImageError,
  onDownload,
}: {
  attachments: Attachment[];
  urls: Record<string, { url: string; exp: number }>;
  onImageError: (id: string) => void;
  onDownload: (id: string) => void;
}) {
  if (!attachments.length) return null;
  const images = attachments.filter((a) => isImageMime(a.mime_type));
  const files = attachments.filter((a) => !isImageMime(a.mime_type));

  return (
    <div className="mt-1 space-y-2">
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((a) => {
            const u = urls[a.id];
            return u?.url ? (
              // Signed, short-lived URL: next/image's optimizer can't (and shouldn't) proxy it.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={a.id}
                src={u.url}
                alt={a.original_file_name}
                loading="lazy"
                onError={() => onImageError(a.id)}
                onClick={() => onDownload(a.id)}
                className="max-h-56 max-w-full cursor-pointer rounded-md border object-cover"
              />
            ) : (
              <div key={a.id} className="flex h-24 w-32 items-center justify-center rounded-md border text-xs text-muted-foreground">
                Loading…
              </div>
            );
          })}
        </div>
      )}
      {files.map((a) => (
        <button
          key={a.id}
          type="button"
          onClick={() => onDownload(a.id)}
          className="flex w-full max-w-sm items-center gap-2 rounded-md border px-3 py-2 text-left text-sm hover:bg-muted"
        >
          <span aria-hidden>{a.mime_type.startsWith("video/") ? "🎞" : "📎"}</span>
          <span className="min-w-0 flex-1 truncate">{a.original_file_name}</span>
          <span className="shrink-0 text-xs text-muted-foreground">{formatBytes(a.file_size)}</span>
        </button>
      ))}
    </div>
  );
}
