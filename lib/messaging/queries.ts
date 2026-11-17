import "server-only";
import { createClient } from "@/lib/supabase/server";

export type SidebarData = {
  channels: { id: string; name: string; visibility: string; is_mandatory: boolean; unread: number }[];
  conversations: { id: string; type: string; title: string; unread: number }[];
};

type Person = { id: string; full_name: string | null; email: string };
export const personName = (p: Person | null | undefined) => p?.full_name || p?.email?.split("@")[0] || "Someone";

/* eslint-disable @typescript-eslint/no-explicit-any */
export function conversationTitle(c: any, meId: string): string {
  if (c.title) return c.title;
  const others = (c.members ?? [])
    .filter((m: any) => m.user_id !== meId && !m.left_at)
    .map((m: any) => personName(m.profile));
  return others.length ? others.join(", ") : "Conversation";
}

export async function getSidebarData(meId: string): Promise<SidebarData> {
  const supabase = await createClient();
  const [ch, cv, un] = await Promise.all([
    supabase
      .from("astra_hub_channel_members")
      .select("channel:astra_hub_channels(id, name, visibility, is_mandatory, archived_at)")
      .eq("user_id", meId),
    supabase
      .from("astra_hub_conversation_members")
      .select(
        "conversation:astra_hub_conversations(id, type, title, updated_at, members:astra_hub_conversation_members(user_id, left_at, profile:astra_hub_profiles(id, full_name, email)))",
      )
      .eq("user_id", meId)
      .is("left_at", null),
    supabase.rpc("astra_hub_get_unread_counts"),
  ]);

  const unread = (un.data ?? { channels: {}, conversations: {} }) as {
    channels: Record<string, number>;
    conversations: Record<string, number>;
  };

  const channels = ((ch.data ?? []) as any[])
    .map((r) => r.channel)
    .filter((c) => c && !c.archived_at)
    .map((c) => ({ id: c.id, name: c.name, visibility: c.visibility, is_mandatory: c.is_mandatory, unread: unread.channels[c.id] ?? 0 }))
    .sort((a, b) => Number(b.is_mandatory) - Number(a.is_mandatory) || a.name.localeCompare(b.name));

  const conversations = ((cv.data ?? []) as any[])
    .map((r) => r.conversation)
    .filter(Boolean)
    .sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""))
    .map((c) => ({ id: c.id, type: c.type, title: conversationTitle(c, meId), unread: unread.conversations[c.id] ?? 0 }));

  return { channels, conversations };
}
