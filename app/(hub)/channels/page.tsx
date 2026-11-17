import Link from "next/link";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { joinChannelAction } from "@/components/messaging/actions";
import { errorText } from "@/lib/messaging/errors";
import { Button } from "@/components/ui/button";

export default async function BrowseChannelsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const profile = await requireProfile();
  if (profile.role === "guest") redirect("/dashboard"); // guests have no directory
  const { error } = await searchParams;

  const supabase = await createClient();
  const [{ data: all }, { data: mine }] = await Promise.all([
    supabase.from("astra_hub_channels").select("id, name, description, visibility").eq("visibility", "public").order("name"),
    supabase.from("astra_hub_channel_members").select("channel_id").eq("user_id", profile.id),
  ]);
  const joined = new Set((mine ?? []).map((m) => m.channel_id));

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-xl font-semibold tracking-tight">Browse channels</h1>
      {error && <p role="alert" className="mt-3 text-sm text-destructive">{errorText(error)}</p>}
      <ul className="mt-4 divide-y rounded-md border text-sm">
        {(all ?? []).map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-3 px-3 py-3">
            <div className="min-w-0">
              <div className="font-medium"># {c.name}</div>
              {c.description && <div className="truncate text-muted-foreground">{c.description}</div>}
            </div>
            {joined.has(c.id) ? (
              <Link href={`/channels/${c.id}`} className="text-sm underline-offset-4 hover:underline">Open</Link>
            ) : (
              <form action={joinChannelAction}>
                <input type="hidden" name="channelId" value={c.id} />
                <Button type="submit" size="sm">Join</Button>
              </form>
            )}
          </li>
        ))}
        {!all?.length && <li className="px-3 py-4 text-muted-foreground">No public channels yet.</li>}
      </ul>
    </main>
  );
}
