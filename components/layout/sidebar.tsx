"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Hash, Lock, PenSquare, Users } from "lucide-react";
import type { SidebarData } from "@/lib/messaging/queries";
import type { Role } from "@/lib/auth";
import { UnreadBadge } from "@/components/layout/live-signals";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const row =
  "group flex items-center gap-3 rounded-xl px-2 py-2 text-sm transition-colors hover:bg-muted active:scale-[0.99]";
const activeRow = "bg-primary/10 text-foreground font-semibold hover:bg-primary/15";

export function Sidebar({ data, role }: { data: SidebarData; role: Role }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-6 p-3" aria-label="Conversations">
      <section>
        <h2 className="px-2 pb-1.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Channels</h2>
        {data.channels.map((c) => {
          const href = `/channels/${c.id}`;
          const active = pathname === href;
          return (
            <Link key={c.id} href={href} aria-current={active ? "page" : undefined} className={cn(row, active && activeRow)}>
              <span
                aria-hidden
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-xl",
                  active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground group-hover:bg-background",
                )}
              >
                {c.visibility === "private" ? <Lock className="size-4" /> : <Hash className="size-4" />}
              </span>
              <span className="truncate">{c.name}</span>
              <UnreadBadge kind="channel" id={c.id} />
            </Link>
          );
        })}
        {!data.channels.length && <p className="px-2 text-sm text-muted-foreground">No channels yet.</p>}
        {role !== "guest" && (
          <Link href="/channels" className={cn(row, "text-muted-foreground", pathname === "/channels" && activeRow)}>
            <span className="flex size-9 items-center justify-center" aria-hidden><Compass className="size-4" /></span>
            Browse channels
          </Link>
        )}
      </section>

      <section>
        <h2 className="px-2 pb-1.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Messages</h2>
        {data.conversations.map((c) => {
          const href = `/messages/${c.id}`;
          const active = pathname === href;
          return (
            <Link key={c.id} href={href} aria-current={active ? "page" : undefined} className={cn(row, active && activeRow)}>
              <Avatar name={c.title} seed={c.id} />
              <span className="min-w-0 flex-1">
                <span className="block truncate">{c.title}</span>
                <span className="block text-xs font-normal text-muted-foreground">{c.type === "group" ? "Group" : "Direct message"}</span>
              </span>
              <UnreadBadge kind="conversation" id={c.id} />
            </Link>
          );
        })}
        {!data.conversations.length && <p className="px-2 text-sm text-muted-foreground">No messages yet.</p>}
        {role !== "guest" && (
          <>
            <Link href="/people" className={cn(row, "text-muted-foreground", pathname === "/people" && activeRow)}>
              <span className="flex size-9 items-center justify-center" aria-hidden><Users className="size-4" /></span>
              People
            </Link>
            <Link href="/messages/new" className={cn(row, "text-muted-foreground", pathname === "/messages/new" && activeRow)}>
              <span className="flex size-9 items-center justify-center" aria-hidden><PenSquare className="size-4" /></span>
              New group message
            </Link>
          </>
        )}
      </section>
    </nav>
  );
}
