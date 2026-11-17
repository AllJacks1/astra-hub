"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

/**
 * Subscribes to this user's private signal topic. The database sends id-only signals when
 * a message lands in one of your spaces or a notification is created; we just refresh the
 * server-rendered sidebar/bell. No content travels on this topic.
 */
export function LiveSignals({ userId }: { userId: string }) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    let cancelled = false;
    let channel: RealtimeChannel | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const refresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 500);
    };

    (async () => {
      await supabase.realtime.setAuth();
      if (cancelled) return;
      channel = supabase
        .channel(`user:${userId}`, { config: { private: true } })
        .on("broadcast", { event: "unread_changed" }, refresh)
        .on("broadcast", { event: "notification_insert" }, refresh)
        .subscribe();
    })();

    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [supabase, userId, router]);

  return null;
}
