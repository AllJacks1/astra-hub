import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { personName } from "@/lib/messaging/queries";
import { startDirectAction } from "@/components/messaging/actions";
import { errorText } from "@/lib/messaging/errors";
import { Button } from "@/components/ui/button";

export default async function PeoplePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const profile = await requireProfile();
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: people } = await supabase
    .from("astra_hub_profiles")
    .select("id, full_name, email, role")
    .eq("status", "active")
    .neq("id", profile.id)
    .order("full_name");

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-xl font-semibold tracking-tight">People</h1>
      {error && <p role="alert" className="mt-3 text-sm text-destructive">{errorText(error)}</p>}
      <ul className="mt-4 divide-y rounded-md border text-sm">
        {(people ?? []).map((p) => {
          const canMessage = profile.role !== "guest" && (p.role !== "guest" || profile.role === "admin");
          return (
            <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <div className="min-w-0">
                <div className="font-medium">{personName(p)}</div>
                <div className="truncate text-muted-foreground">{p.email} · {p.role}</div>
              </div>
              {canMessage && (
                <form action={startDirectAction}>
                  <input type="hidden" name="otherUserId" value={p.id} />
                  <Button type="submit" size="sm" variant="outline">Message</Button>
                </form>
              )}
            </li>
          );
        })}
        {!people?.length && <li className="px-3 py-4 text-muted-foreground">No one else yet.</li>}
      </ul>
    </main>
  );
}
