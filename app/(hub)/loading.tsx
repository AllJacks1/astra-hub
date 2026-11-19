/** Instant feedback for any hub page while its server data loads. */
export default function Loading() {
  return (
    <div className="space-y-3 px-4 py-8 md:mx-auto md:max-w-3xl" aria-busy="true" aria-label="Loading">
      <div className="h-7 w-48 animate-pulse rounded-lg bg-muted" />
      <div className="h-4 w-72 animate-pulse rounded bg-muted" />
      <div className="mt-6 space-y-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
