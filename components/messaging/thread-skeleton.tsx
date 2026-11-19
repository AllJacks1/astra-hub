/** Shown instantly on navigation while the server loads the thread (was: frozen page). */
export function ThreadSkeleton() {
  const rows: [boolean, string][] = [
    [false, "w-48"], [false, "w-64"], [true, "w-40"], [false, "w-56"], [true, "w-72"], [true, "w-32"],
  ];
  return (
    <div className="flex h-full flex-col" aria-busy="true" aria-label="Loading conversation">
      <div className="flex shrink-0 items-center gap-3 border-b px-3 py-2 md:px-4 md:py-2.5">
        <div className="size-10 animate-pulse rounded-xl bg-muted" />
        <div className="space-y-1.5">
          <div className="h-4 w-36 animate-pulse rounded bg-muted" />
          <div className="h-3 w-20 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col justify-end gap-3 bg-chat px-3 py-4 sm:px-5">
        {rows.map(([mine, w], i) => (
          <div key={i} className={`flex items-end gap-2 ${mine ? "flex-row-reverse" : ""}`}>
            {!mine && <div className="size-7 animate-pulse rounded-full bg-muted" />}
            <div className={`h-9 ${w} animate-pulse rounded-[20px] ${mine ? "bg-primary/15" : "bg-muted"}`} />
          </div>
        ))}
      </div>
      <div className="shrink-0 border-t px-3 pt-2 pb-3 sm:px-5">
        <div className="h-10 animate-pulse rounded-[20px] bg-muted" />
      </div>
    </div>
  );
}
