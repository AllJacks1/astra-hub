import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { personName } from "@/lib/messaging/queries";
import { createGroupDmAction } from "@/components/messaging/actions";
import { errorText } from "@/lib/messaging/errors";
import { Button } from "@/components/ui/button";

export default async function NewGroupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const profile = await requireProfile();
  if (profile.role === "guest") redirect("/dashboard");
  const { error } = await searchParams;

  const supabase = await createClient();
  let q = supabase.from("astra_hub_profiles").select("id, full_name, email, role")
    .eq("status", "active").neq("id", profile.id).order("full_name");
  if (profile.role !== "admin") q = q.neq("role", "guest");
  const { data: people } = await q;

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <h1 className="text-xl font-semibold tracking-tight">New group message</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Members are fixed once the group is created. Pick at least two other people.
      </p>
      {error && <p role="alert" className="mt-3 text-sm text-destructive">{errorText(error)}</p>}
      <form action={createGroupDmAction} className="mt-5 space-y-4">
        <label className="flex flex-col gap-1 text-sm">
          Title (optional)
          <input name="title" maxLength={80} className="h-9 rounded-md border bg-background px-3" />
        </label>
        <fieldset className="space-y-1">
          <legend className="text-sm">People</legend>
          {(people ?? []).map((p) => (
            <label key={p.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
              <input type="checkbox" name="memberIds" value={p.id} />
              {personName(p)} <span className="text-muted-foreground">{p.email}</span>
            </label>
          ))}
        </fieldset>
        <Button type="submit">Create group</Button>
      </form>
    </main>
  );
}
