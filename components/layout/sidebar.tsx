import Link from "next/link";
import type { SidebarData } from "@/lib/messaging/queries";
import type { Role } from "@/lib/auth";

function Badge({ n }: { n: number }) {
  if (!n) return null;
  return (
    <span className="ml-auto rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
      {n > 99 ? "99+" : n}
    </span>
  );
}

export function Sidebar({ data, role }: { data: SidebarData; role: Role }) {
  const row = "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted";
  return (
    <nav className="flex flex-col gap-5 p-3" aria-label="Conversations">
      <section>
        <h2 className="px-2 pb-1 text-xs font-medium text-muted-foreground">Channels</h2>
        {data.channels.map((c) => (
          <Link key={c.id} href={`/channels/${c.id}`} className={row}>
            <span aria-hidden>{c.visibility === "private" ? "🔒" : "#"}</span>
            <span className="truncate">{c.name}</span>
            <Badge n={c.unread} />
          </Link>
        ))}
        {!data.channels.length && <p className="px-2 text-sm text-muted-foreground">No channels yet.</p>}
        {role !== "guest" && (
          <Link href="/channels" className={`${row} text-muted-foreground`}>Browse channels</Link>
        )}
      </section>

      <section>
        <h2 className="px-2 pb-1 text-xs font-medium text-muted-foreground">Messages</h2>
        {data.conversations.map((c) => (
          <Link key={c.id} href={`/messages/${c.id}`} className={row}>
            <span className="truncate">{c.title}</span>
            <Badge n={c.unread} />
          </Link>
        ))}
        {!data.conversations.length && <p className="px-2 text-sm text-muted-foreground">No messages yet.</p>}
        {role !== "guest" && (
          <>
            <Link href="/people" className={`${row} text-muted-foreground`}>People</Link>
            <Link href="/messages/new" className={`${row} text-muted-foreground`}>New group message</Link>
          </>
        )}
      </section>
    </nav>
  );
}
