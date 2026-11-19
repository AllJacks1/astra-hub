"use client";

import { FileText, Film } from "lucide-react";
import { formatBytes, isImageMime } from "@/lib/file-allowlist";
import type { ThreadMessage } from "@/lib/messaging/validate";
import { cn } from "@/lib/utils";

type Attachment = NonNullable<ThreadMessage["attachments"]>[number];

export function AttachmentList({
  attachments,
  urls,
  mine,
  onImageError,
  onDownload,
}: {
  attachments: Attachment[];
  urls: Record<string, { url: string; exp: number }>;
  mine?: boolean;
  onImageError: (id: string) => void;
  onDownload: (id: string) => void;
}) {
  if (!attachments.length) return null;
  const images = attachments.filter((a) => isImageMime(a.mime_type));
  const files = attachments.filter((a) => !isImageMime(a.mime_type));

  return (
    <div className={cn("flex flex-col gap-1", mine ? "items-end" : "items-start")}>
      {images.length > 0 && (
        <div className={cn("flex flex-wrap gap-1", mine && "justify-end")}>
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
                decoding="async"
                onError={() => onImageError(a.id)}
                onClick={() => onDownload(a.id)}
                className="max-h-64 max-w-[min(18rem,100%)] cursor-zoom-in rounded-2xl border object-cover transition-opacity hover:opacity-90"
              />
            ) : (
              <div key={a.id} className="h-40 w-56 animate-pulse rounded-2xl bg-muted" aria-label="Loading image" />
            );
          })}
        </div>
      )}
      {files.map((a) => (
        <button
          key={a.id}
          type="button"
          onClick={() => onDownload(a.id)}
          className={cn(
            "flex w-72 max-w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm transition-colors",
            mine
              ? "bg-primary/10 text-foreground hover:bg-primary/15"
              : "bg-bubble-other text-bubble-other-foreground hover:brightness-95",
          )}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-background/70 text-primary" aria-hidden>
            {a.mime_type.startsWith("video/") ? <Film className="size-4" /> : <FileText className="size-4" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{a.original_file_name}</span>
            <span className="block text-xs text-muted-foreground">{formatBytes(a.file_size)}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
