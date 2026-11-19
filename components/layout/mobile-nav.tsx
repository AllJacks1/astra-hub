"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronLeft, MessageCircle, Settings, Users } from "lucide-react";
import type { Role } from "@/lib/auth";
import { useUnreadNotifications } from "@/components/layout/live-signals";
import { cn } from "@/lib/utils";

/** An open chat (not the "new group" form). The tab bar hides there so the composer has room. */
const isThread = (path: string) => /^\/(channels|messages)\/[0-9a-f-]{36}$/i.test(path);

/** Bottom tab bar for phones (hidden from md up, where the sidebar and header links show). */
export function MobileTabBar({ role }: { role: Role }) {
  const pathname = usePathname();
  const alerts = useUnreadNotifications();
  if (isThread(pathname)) return null;

  const tabs = [
    { href: "/dashboard", label: "Chats", icon: MessageCircle, active: pathname === "/dashboard" || pathname.startsWith("/channels") || pathname.startsWith("/messages") },
    { href: "/notifications", label: "Alerts", icon: Bell, active: pathname.startsWith("/notifications"), badge: alerts },
    ...(role !== "guest" ? [{ href: "/people", label: "People", icon: Users, active: pathname.startsWith("/people") }] : []),
    { href: "/settings", label: "Settings", icon: Settings, active: pathname.startsWith("/settings") },
  ];

  return (
    <nav
      aria-label="Main"
      className="shrink-0 border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="flex">
        {tabs.map(({ href, label, icon: Icon, active, badge }) => (
          <li key={href} className="flex-1">
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              aria-label={badge ? `${label}, ${badge} unread` : label}
              className={cn(
                "relative flex flex-col items-center gap-0.5 py-2 text-[11px]",
                active ? "font-medium text-foreground" : "text-muted-foreground",
              )}
            >
              <Icon className="size-5" aria-hidden strokeWidth={active ? 2.25 : 1.75} />
              {label}
              {!!badge && (
                <span className="absolute top-1 left-1/2 ml-2 min-w-4 rounded-full bg-primary px-1 text-center text-[10px] leading-4 font-medium text-primary-foreground">
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** App header wrapper: on phones, an open chat shows its own header (with a back arrow) instead. */
export function AppHeader({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <header
      className={cn(
        "shrink-0 items-center justify-between border-b px-4 py-3",
        isThread(pathname) ? "hidden md:flex" : "flex",
      )}
    >
      {children}
    </header>
  );
}

/** "Back to chats" arrow shown only on phones, in a thread header. */
export function BackToChats() {
  return (
    <Link
      href="/dashboard"
      aria-label="Back to chats"
      className="-ml-2 flex size-9 shrink-0 items-center justify-center rounded-md hover:bg-muted md:hidden"
    >
      <ChevronLeft className="size-5" aria-hidden />
    </Link>
  );
}
