"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type Kind = "channel" | "conversation";
type Counts = { channels: Record<string, number>; conversations: Record<string, number>; notifications: number };
type Ctx = { counts: Counts; markRead: (kind: Kind, id: string) => void };

const UnreadContext = createContext<Ctx | null>(null);
const RESYNC_AFTER_HIDDEN_MS = 30_000;

const bucket = (k: Kind) => (k === "channel" ? "channels" : "conversations");
const pathFor = (k: Kind, id: string) => (k === "channel" ? `/channels/${id}` : `/messages/${id}`);

/**
 * Holds unread badges on the client and keeps them current from this user's private
 * signal topic. Signals carry only {kind, id}: we bump one badge locally instead of
 * re-rendering the whole layout, which on mobile used to re-download every conversation
 * and member list for every message. Full counts are re-fetched (a tiny RPC) only after
 * the app was in the background or the realtime connection dropped.
 */
export function LiveSignals({ userId, initial, children }: { userId: string; initial: Counts; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [supabase] = useState(() => createClient());
  const [counts, setCounts] = useState<Counts>(initial);
  const pathRef = useRef(pathname);
  const knownRef = useRef(initial);

  // A server re-render (after join/leave/create, router.refresh, etc.) brings fresh truth.
  const [seenInitial, setSeenInitial] = useState(initial);
  if (seenInitial !== initial) {
    setSeenInitial(initial);
    setCounts(initial);
  }
  useEffect(() => { pathRef.current = pathname; knownRef.current = initial; }, [pathname, initial]);

  const markRead = useCallback((kind: Kind, id: string) => {
    setCounts((c) => (c[bucket(kind)][id] ? { ...c, [bucket(kind)]: { ...c[bucket(kind)], [id]: 0 } } : c));
  }, []);

  useEffect(() => {
    let cancelled = false;
    let channel: RealtimeChannel | null = null;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    let hiddenAt = 0;
    let subscribedOnce = false;

    const resync = async () => {
      const [un, nt] = await Promise.all([
        supabase.rpc("astra_hub_get_unread_counts"),
        supabase.from("astra_hub_notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).is("read_at", null),
      ]);
      if (cancelled || un.error) return;
      const u = (un.data ?? {}) as Partial<Counts>;
      setCounts((c) => ({
        channels: Object.fromEntries(Object.keys(knownRef.current.channels).map((id) => [id, u.channels?.[id] ?? 0])),
        conversations: Object.fromEntries(Object.keys(knownRef.current.conversations).map((id) => [id, u.conversations?.[id] ?? 0])),
        notifications: nt.count ?? c.notifications,
      }));
      // A space we don't list yet (e.g. someone started a DM with us): re-render the sidebar once.
      const unknown = Object.keys(u.conversations ?? {}).some((id) => !(id in knownRef.current.conversations))
        || Object.keys(u.channels ?? {}).some((id) => !(id in knownRef.current.channels));
      if (unknown) router.refresh();
    };

    const onUnread = (payload: { k?: string; id?: string } | undefined) => {
      const kind = payload?.k === "channel" || payload?.k === "conversation" ? payload.k : null;
      const id = typeof payload?.id === "string" ? payload.id : null;
      if (!kind || !id) return void resync(); // old-format signal: fall back to a counts fetch
      if (pathRef.current === pathFor(kind, id)) return; // open thread marks it read itself
      if (!(id in knownRef.current[bucket(kind)])) {
        if (refreshTimer) clearTimeout(refreshTimer);
        refreshTimer = setTimeout(() => router.refresh(), 500);
        return;
      }
      setCounts((c) => ({ ...c, [bucket(kind)]: { ...c[bucket(kind)], [id]: (c[bucket(kind)][id] ?? 0) + 1 } }));
    };

    (async () => {
      await supabase.realtime.setAuth();
      if (cancelled) return;
      channel = supabase
        .channel(`user:${userId}`, { config: { private: true } })
        .on("broadcast", { event: "unread_changed" }, ({ payload }) => onUnread(payload))
        .on("broadcast", { event: "notification_insert" }, () => setCounts((c) => ({ ...c, notifications: c.notifications + 1 })))
        .subscribe((status) => {
          if (status !== "SUBSCRIBED") return;
          if (subscribedOnce) void resync(); // reconnected: we may have missed signals
          subscribedOnce = true;
        });
    })();

    const onVisibility = () => {
      if (document.visibilityState === "hidden") hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt > RESYNC_AFTER_HIDDEN_MS) void resync();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      if (refreshTimer) clearTimeout(refreshTimer);
      document.removeEventListener("visibilitychange", onVisibility);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [supabase, userId, router]);

  return <UnreadContext.Provider value={{ counts, markRead }}>{children}</UnreadContext.Provider>;
}

function useUnread(): Ctx {
  const ctx = useContext(UnreadContext);
  return ctx ?? { counts: { channels: {}, conversations: {}, notifications: 0 }, markRead: () => {} };
}

export const useMarkSpaceRead = () => useUnread().markRead;
export const useUnreadNotifications = () => useUnread().counts.notifications;

export function UnreadBadge({ kind, id }: { kind: Kind; id: string }) {
  const n = useUnread().counts[bucket(kind)][id] ?? 0;
  if (!n) return null;
  return (
    <span className="ml-auto rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
      {n > 99 ? "99+" : n}
    </span>
  );
}

export function AlertsLink() {
  const n = useUnread().counts.notifications;
  return (
    <Link href="/notifications" className="relative underline-offset-4 hover:underline" aria-label={`Notifications${n ? `, ${n} unread` : ""}`}>
      Alerts
      {n > 0 && (
        <span className="ml-1 rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">{n > 99 ? "99+" : n}</span>
      )}
    </Link>
  );
}
