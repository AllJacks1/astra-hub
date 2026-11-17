import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { getSidebarData, getUnreadNotificationCount } from "@/lib/messaging/queries";
import { LiveSignals } from "@/components/layout/live-signals";
import { Sidebar } from "@/components/layout/sidebar";
import { signOut } from "./actions";
import { Button } from "@/components/ui/button";

export default async function HubLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  const [side, unreadNotifs] = await Promise.all([
    getSidebarData(profile.id),
    getUnreadNotificationCount(profile.id),
  ]);

  return (
    <div className="flex h-dvh flex-col">
      <LiveSignals userId={profile.id} />
      <header className="flex shrink-0 items-center justify-between border-b px-4 py-3">
        <Link href="/dashboard" className="font-semibold tracking-tight">Astra Team Hub</Link>
        <nav className="flex items-center gap-3 text-sm">
          {profile.role === "admin" && (
            <Link href="/admin/invitations" className="underline-offset-4 hover:underline">Admin</Link>
          )}
          <Link href="/notifications" className="relative underline-offset-4 hover:underline" aria-label={`Notifications${unreadNotifs ? `, ${unreadNotifs} unread` : ""}`}>
            Alerts
            {unreadNotifs > 0 && (
              <span className="ml-1 rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
                {unreadNotifs > 99 ? "99+" : unreadNotifs}
              </span>
            )}
          </Link>
          <Link href="/settings" className="underline-offset-4 hover:underline">Settings</Link>
          <span className="hidden text-muted-foreground sm:inline">{profile.full_name ?? profile.email}</span>
          <form action={signOut}>
            <Button type="submit" variant="outline" size="sm">Sign out</Button>
          </form>
        </nav>
      </header>
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-64 shrink-0 overflow-y-auto border-r md:block">
          <Sidebar data={side} role={profile.role} />
        </aside>
        <div className="min-w-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
