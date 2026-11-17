import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { setEmailNotificationsAction } from "./actions";
import { PushToggle } from "@/components/settings/push-toggle";
import { Button } from "@/components/ui/button";

export default async function SettingsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data } = await supabase
    .from("astra_hub_profiles").select("email_notifications").eq("id", profile.id).maybeSingle();

  return (
    <main className="mx-auto max-w-xl space-y-8 px-4 py-8">
      <section>
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">{profile.email} · {profile.role}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Email alerts</h2>
        <p className="text-sm text-muted-foreground">
          We email you only for direct messages and @mentions, and at most once per conversation every 15 minutes.
        </p>
        <form action={setEmailNotificationsAction} className="flex items-center gap-3 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="enabled" defaultChecked={data?.email_notifications ?? true} />
            Send me email alerts
          </label>
          <Button type="submit" size="sm" variant="outline">Save</Button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Push notifications</h2>
        <PushToggle />
      </section>
    </main>
  );
}
