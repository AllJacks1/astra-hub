import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { conversationTitle, personName } from "@/lib/messaging/queries";
import { isUuid, MESSAGE_SELECT, PAGE_SIZE, type ThreadMessage } from "@/lib/messaging/validate";
import { Thread } from "@/components/messaging/thread";
import { BackToChats } from "@/components/layout/mobile-nav";
import { Avatar } from "@/components/ui/avatar";

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const profile = await requireProfile();
  const supabase = await createClient();

  // RLS: returns nothing unless the caller is an active participant.
  const { data: convo } = await supabase
    .from("astra_hub_conversations")
    .select("id, type, title, members:astra_hub_conversation_members(user_id, left_at, profile:astra_hub_profiles(id, full_name, email))")
    .eq("id", id)
    .maybeSingle();
  if (!convo) notFound();

  const { data: rows } = await supabase
    .from("astra_hub_messages")
    .select(MESSAGE_SELECT)
    .eq("conversation_id", id)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE + 1);

  const list = (rows ?? []) as unknown as ThreadMessage[];
  const participants: Record<string, string> = {};
  /* eslint-disable @typescript-eslint/no-explicit-any */
  for (const m of (convo.members ?? []) as any[]) participants[m.user_id] = personName(m.profile);

  return (
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b bg-background/95 px-3 py-2 backdrop-blur md:px-4 md:py-2.5">
        <BackToChats />
        <Avatar name={conversationTitle(convo, profile.id)} seed={id} className="size-10" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-semibold leading-tight">{conversationTitle(convo, profile.id)}</h1>
          <p className="text-xs text-muted-foreground">
            {convo.type === "group" ? `Group · ${Object.keys(participants).length} people (fixed)` : "Direct message"}
          </p>
        </div>
      </header>
      <div className="min-h-0 flex-1">
        <Thread
          key={id}
          target={{ kind: "conversation", id }}
          me={{ id: profile.id }}
          participants={participants}
          initial={list.slice(0, PAGE_SIZE).reverse()}
          initialHasMore={list.length > PAGE_SIZE}
        />
      </div>
    </div>
  );
}
