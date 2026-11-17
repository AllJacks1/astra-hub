import Link from "next/link";
import { requireRole } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole("admin");
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center gap-4 border-b px-4 py-3 text-sm">
        <Link href="/dashboard" className="font-semibold tracking-tight">Astra Team Hub</Link>
        <span className="text-muted-foreground">Admin</span>
        <Link href="/admin/invitations" className="underline-offset-4 hover:underline">Invitations</Link>
        <Link href="/admin/channels" className="underline-offset-4 hover:underline">Channels</Link>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
