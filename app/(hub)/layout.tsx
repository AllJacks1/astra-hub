import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { getSidebarData, getUnreadNotificationCount } from "@/lib/messaging/queries";
import { AlertsLink, LiveSignals } from "@/components/layout/live-signals";
import { AppHeader, MobileTabBar } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { signOut } from "./actions";
import { Button } from "@/components/ui/button";

export default async function HubLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  const [side, unreadNotifs] = await Promise.all([
    getSidebarData(profile.id),
    getUnreadNotificationCount(profile.id),
  ]);
  const initialCounts = {
    channels: Object.fromEntries(side.channels.map((c) => [c.id, c.unread])),
    conversations: Object.fromEntries(side.conversations.map((c) => [c.id, c.unread])),
    notifications: unreadNotifs,
  };

  return (
    <LiveSignals userId={profile.id} initial={initialCounts}>
    <div className="flex h-dvh flex-col">
      <AppHeader>
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold tracking-tight">
          <span aria-hidden className="flex size-8 items-center justify-center rounded-xl text-sm font-bold text-white" style={{ background: "var(--bubble-mine)" }}>A</span>
          Astra Team Hub
        </Link>
        {/* Phones use the bottom tab bar; Admin and Sign out live in Settings there. */}
        <nav className="hidden items-center gap-3 text-sm md:flex">
          {profile.role === "admin" && (
            <Link href="/admin/invitations" className="rounded-full px-3 py-1.5 hover:bg-muted">Admin</Link>
          )}
          <AlertsLink />
          <Link href="/settings" className="rounded-full px-3 py-1.5 hover:bg-muted">Settings</Link>
          <span className="text-muted-foreground">{profile.full_name ?? profile.email}</span>
          <form action={signOut}>
            <Button type="submit" variant="outline" size="sm" className="rounded-full">Sign out</Button>
          </form>
        </nav>
      </AppHeader>
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-72 shrink-0 overflow-y-auto border-r bg-sidebar md:block">
          <Sidebar data={side} role={profile.role} />
        </aside>
        <div className="min-w-0 flex-1 overflow-y-auto">{children}</div>
      </div>
      <MobileTabBar role={profile.role} />
    </div>
    </LiveSignals>
  );
}
