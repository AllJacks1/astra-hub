import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { getSidebarData } from "@/lib/messaging/queries";
import { Sidebar } from "@/components/layout/sidebar";
import { signOut } from "./actions";
import { Button } from "@/components/ui/button";

export default async function HubLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  const side = await getSidebarData(profile.id);

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex shrink-0 items-center justify-between border-b px-4 py-3">
        <Link href="/dashboard" className="font-semibold tracking-tight">Astra Team Hub</Link>
        <nav className="flex items-center gap-3 text-sm">
          {profile.role === "admin" && (
            <Link href="/admin/invitations" className="underline-offset-4 hover:underline">Admin</Link>
          )}
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
