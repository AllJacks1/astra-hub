"use client";

import { useMemo } from "react";

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Plain text (React escapes it) with @Name highlights for known participants. */
export function MessageBody({ text, names }: { text: string; names: string[] }) {
  const parts = useMemo(() => {
    const sorted = names.filter(Boolean).sort((a, b) => b.length - a.length);
    if (!sorted.length) return [text];
    return text.split(new RegExp(`(@(?:${sorted.map(escapeRe).join("|")}))`, "g"));
  }, [text, names]);

  return (
    <p className="whitespace-pre-wrap break-words text-sm">
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <span key={i} className="rounded bg-primary/10 px-0.5 font-medium">{p}</span>
        ) : (
          p
        ),
      )}
    </p>
  );
}
