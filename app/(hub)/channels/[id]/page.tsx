import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { personName } from "@/lib/messaging/queries";
import { isUuid, MESSAGE_SELECT, PAGE_SIZE, type ThreadMessage } from "@/lib/messaging/validate";
import { errorText } from "@/lib/messaging/errors";
import { joinChannelAction, leaveChannelAction } from "@/components/messaging/actions";
import { Thread } from "@/components/messaging/thread";
import { Button } from "@/components/ui/button";
import { BackToChats } from "@/components/layout/mobile-nav";
import { Hash, Lock } from "lucide-react";

export default async function ChannelPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  if (!isUuid(id)) notFound();
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: channel } = await supabase
    .from("astra_hub_channels")
    .select("id, name, description, visibility, is_mandatory")
    .eq("id", id)
    .maybeSingle();
  if (!channel) notFound();

  const { data: membership } = await supabase
    .from("astra_hub_channel_members")
    .select("user_id")
    .eq("channel_id", id)
    .eq("user_id", profile.id)
    .maybeSingle();

  if (!membership) {
    const canJoin = channel.visibility === "public" && profile.role !== "guest";
    return (
      <main className="mx-auto max-w-lg px-4 py-10">
        <h1 className="text-xl font-semibold"># {channel.name}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {canJoin ? "Join this channel to read and post messages." : "You're not a member of this channel."}
        </p>
        {canJoin && (
          <form action={joinChannelAction} className="mt-4">
            <input type="hidden" name="channelId" value={id} />
            <Button type="submit">Join channel</Button>
          </form>
        )}
      </main>
    );
  }

  const [{ data: rows }, { data: members }] = await Promise.all([
    supabase.from("astra_hub_messages").select(MESSAGE_SELECT).eq("channel_id", id)
      .order("created_at", { ascending: false }).limit(PAGE_SIZE + 1),
    supabase.from("astra_hub_channel_members")
      .select("user_id, profile:astra_hub_profiles(id, full_name, email)").eq("channel_id", id),
  ]);

  const list = (rows ?? []) as unknown as ThreadMessage[];
  const participants: Record<string, string> = {};
  /* eslint-disable @typescript-eslint/no-explicit-any */
  for (const m of (members ?? []) as any[]) participants[m.user_id] = personName(m.profile);

  return (
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b bg-background/95 px-3 py-2 backdrop-blur md:px-4 md:py-2.5">
        <BackToChats />
        <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {channel.visibility === "private" ? <Lock className="size-5" /> : <Hash className="size-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-semibold leading-tight">{channel.name}</h1>
          <p className="truncate text-xs text-muted-foreground">
            {Object.keys(participants).length} members{channel.description ? ` · ${channel.description}` : ""}
          </p>
        </div>
        {!channel.is_mandatory && (
          <form action={leaveChannelAction}>
            <input type="hidden" name="channelId" value={id} />
            <Button type="submit" variant="ghost" size="sm" className="rounded-full text-muted-foreground">Leave</Button>
          </form>
        )}
      </header>
      {error && <p role="alert" className="px-4 pt-2 text-sm text-destructive">{errorText(error)}</p>}
      <div className="min-h-0 flex-1">
        <Thread
          key={id}
          target={{ kind: "channel", id }}
          me={{ id: profile.id }}
          participants={participants}
          initial={list.slice(0, PAGE_SIZE).reverse()}
          initialHasMore={list.length > PAGE_SIZE}
        />
      </div>
    </div>
  );
}
