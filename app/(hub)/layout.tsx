import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { signOut } from "./actions";
import { Button } from "@/components/ui/button";

export default async function HubLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b px-4 py-3">
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
      <div className="flex-1">{children}</div>
    </div>
  );
}
