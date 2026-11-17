import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { markAllNotificationsReadAction, openNotificationAction } from "./actions";
import { Button } from "@/components/ui/button";

export default async function NotificationsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data: items } = await supabase
    .from("astra_hub_notifications")
    .select("id, type, title, body_preview, created_at, read_at")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const unread = (items ?? []).filter((n) => !n.read_at).length;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">Notifications</h1>
        {unread > 0 && (
          <form action={markAllNotificationsReadAction}>
            <Button type="submit" variant="outline" size="sm">Mark all read</Button>
          </form>
        )}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Direct messages and @mentions.</p>

      <ul className="mt-4 divide-y rounded-md border text-sm">
        {(items ?? []).map((n) => (
          <li key={n.id}>
            <form action={openNotificationAction}>
              <input type="hidden" name="id" value={n.id} />
              <button type="submit" className="flex w-full flex-col gap-0.5 px-3 py-2.5 text-left hover:bg-muted">
                <span className="flex items-center gap-2">
                  {!n.read_at && <span aria-label="Unread" className="size-2 rounded-full bg-primary" />}
                  <span className={n.read_at ? "" : "font-medium"}>{n.title}</span>
                  <span className="ml-auto text-xs text-muted-foreground" suppressHydrationWarning>
                    {new Date(n.created_at).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </span>
                </span>
                {n.body_preview && <span className="truncate text-muted-foreground">{n.body_preview}</span>}
              </button>
            </form>
          </li>
        ))}
        {!items?.length && <li className="px-3 py-4 text-muted-foreground">Nothing yet.</li>}
      </ul>
    </main>
  );
}
