"use client";

import { memo, useMemo } from "react";
import { cn } from "@/lib/utils";

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Plain text (React escapes it) with @Name highlights for known participants. */
export const MessageBody = memo(function MessageBody({ text, names, mine }: { text: string; names: string[]; mine?: boolean }) {
  const parts = useMemo(() => {
    const sorted = names.filter(Boolean).sort((a, b) => b.length - a.length);
    if (!sorted.length) return [text];
    return text.split(new RegExp(`(@(?:${sorted.map(escapeRe).join("|")}))`, "g"));
  }, [text, names]);

  return (
    <p className="whitespace-pre-wrap break-words text-[15px] leading-snug">
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <span
            key={i}
            className={cn("rounded px-0.5 font-semibold", mine ? "bg-white/20" : "bg-primary/15 text-primary")}
          >
            {p}
          </span>
        ) : (
          p
        ),
      )}
    </p>
  );
});
