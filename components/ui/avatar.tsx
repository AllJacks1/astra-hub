import { cn } from "@/lib/utils";

/** Stable hue per name so each person keeps the same color everywhere. */
function hue(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % 360;
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export function Avatar({
  name,
  seed,
  className,
  online,
}: {
  name: string;
  /** Usually the user id; falls back to the name. */
  seed?: string;
  className?: string;
  online?: boolean;
}) {
  const h = hue(seed ?? name);
  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-flex size-9 shrink-0 select-none items-center justify-center rounded-full text-xs font-semibold text-white",
        className,
      )}
      style={{ background: `linear-gradient(135deg, oklch(0.68 0.15 ${h}), oklch(0.55 0.17 ${(h + 40) % 360}))` }}
    >
      {initials(name)}
      {online && (
        <span className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-background bg-emerald-500" />
      )}
    </span>
  );
}
