"use client";

/**
 * Pattern only — adapt to your state library and types.
 * Subscribe after the user is confirmed as a member of the channel/conversation.
 */
import { useEffect } from "react";
import { createClient as createBrowserClient } from "@/lib/supabase/client";

type MessageRow = {
  id: string;
  channel_id: string | null;
  conversation_id: string | null;
  sender_id: string;
  body: string | null;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
};

export function useMessagesRealtime(opts: {
  channelId?: string;
  conversationId?: string;
  onInsert: (row: MessageRow) => void;
  onUpdate: (row: MessageRow) => void;
  enabled: boolean;
}) {
  const { channelId, conversationId, onInsert, onUpdate, enabled } = opts;

  useEffect(() => {
    if (!enabled) return;
    if (!channelId && !conversationId) return;

    const supabase = createBrowserClient();
    const filter = channelId
      ? `channel_id=eq.${channelId}`
      : `conversation_id=eq.${conversationId}`;

    const topic = channelId
      ? `messages:channel:${channelId}`
      : `messages:conversation:${conversationId}`;

    const channel = supabase
      .channel(topic)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "astra_hub_messages",
          filter,
        },
        (payload) => {
          onInsert(payload.new as MessageRow);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "astra_hub_messages",
          filter,
        },
        (payload) => {
          onUpdate(payload.new as MessageRow);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [channelId, conversationId, enabled, onInsert, onUpdate]);
}

/**
 * Presence + typing: use channel.subscribe with presence and broadcast.
 * Only join topics for conversations the user can access.
 * Do not put private profile fields in presence state.
 */
