import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { personName } from "@/lib/messaging/queries";
import { errorText } from "@/lib/messaging/errors";
import { addChannelMemberAction, createChannelAction } from "./actions";
import { Button } from "@/components/ui/button";

export default async function AdminChannelsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; created?: string; added?: string }>;
}) {
  await requireRole("admin");
  const { error, created, added } = await searchParams;
  const supabase = await createClient();
  const [{ data: channels }, { data: people }] = await Promise.all([
    supabase.from("astra_hub_channels").select("id, name, visibility, is_mandatory").order("name"),
    supabase.from("astra_hub_profiles").select("id, full_name, email, role").eq("status", "active").order("full_name"),
  ]);

  const field = "h-9 rounded-md border bg-background px-3 text-sm";
  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      {error && <p role="alert" className="text-sm text-destructive">{errorText(error)}</p>}
      {created && <p className="text-sm">Channel created.</p>}
      {added && <p className="text-sm">Member added.</p>}

      <section>
        <h1 className="text-xl font-semibold tracking-tight">Create channel</h1>
        <form action={createChannelAction} className="mt-4 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm">Name<input name="name" required maxLength={80} className={field} /></label>
          <label className="flex flex-col gap-1 text-sm">Description<input name="description" maxLength={300} className={`${field} w-64`} /></label>
          <label className="flex flex-col gap-1 text-sm">
            Visibility
            <select name="visibility" defaultValue="private" className={field}>
              <option value="private">Private</option>
              <option value="public">Public</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="mandatory" /> Mandatory (announcements)</label>
          <Button type="submit">Create</Button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-semibold tracking-tight">Add a member</h2>
        <form action={addChannelMemberAction} className="mt-3 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Channel
            <select name="channelId" required className={field}>
              {(channels ?? []).map((c) => <option key={c.id} value={c.id}>{c.name} ({c.visibility})</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Person
            <select name="userId" required className={field}>
              {(people ?? []).map((p) => <option key={p.id} value={p.id}>{personName(p)} ({p.role})</option>)}
            </select>
          </label>
          <Button type="submit">Add</Button>
        </form>
        <p className="mt-2 text-sm text-muted-foreground">This is how guests get access to a channel.</p>
      </section>
    </main>
  );
}
