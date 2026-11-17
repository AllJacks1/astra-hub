"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { deleteMessageAction, editMessageAction, markReadAction } from "@/components/messaging/actions";
import { signAttachmentsAction, signDownloadAction } from "@/components/messaging/attachments-actions";
import { Composer } from "@/components/messaging/composer";
import { MessageBody } from "@/components/messaging/message-body";
import { AttachmentList } from "@/components/messaging/attachments-view";
import { isImageMime } from "@/lib/file-allowlist";
import { errorText } from "@/lib/messaging/errors";
import { EDIT_WINDOW_MS, MAX_BODY, MESSAGE_SELECT, PAGE_SIZE, type Target, type ThreadMessage } from "@/lib/messaging/validate";
import { Button } from "@/components/ui/button";

type Props = {
  target: Target;
  me: { id: string };
  /** user id -> display name for everyone in this space (server-provided, trusted) */
  participants: Record<string, string>;
  initial: ThreadMessage[]; // ascending
  initialHasMore: boolean;
};

const sortAsc = (list: ThreadMessage[]) => [...list].sort((a, b) => a.created_at.localeCompare(b.created_at));
const time = (iso: string) => new Date(iso).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
const day = (iso: string) => new Date(iso).toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric" });

export function Thread({ target, me, participants, initial, initialHasMore }: Props) {
  const [supabase] = useState(() => createClient());
  const [messages, setMessages] = useState<ThreadMessage[]>(initial);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [online, setOnline] = useState<string[]>([]);
  const [typing, setTyping] = useState<Record<string, number>>({});
  const [urls, setUrls] = useState<Record<string, { url: string; exp: number }>>({});

  const channelRef = useRef<RealtimeChannel | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);
  const lastTypingSent = useRef(0);
  const signing = useRef(false);
  const attempts = useRef<Record<string, number>>({});
  const parentColumn = target.kind === "channel" ? "channel_id" : "conversation_id";
  const names = useMemo(() => Object.values(participants), [participants]);

  const upsert = useCallback((m: ThreadMessage) => {
    setMessages((prev) => {
      const i = prev.findIndex((x) => x.id === m.id);
      return sortAsc(i >= 0 ? prev.map((x, j) => (j === i ? m : x)) : [...prev, m]);
    });
  }, []);

  /** Fetch one message through RLS. Missing => deleted or inaccessible => remove it. */
  const syncMessage = useCallback(
    async (id: string) => {
      const { data } = await supabase.from("astra_hub_messages").select(MESSAGE_SELECT).eq("id", id).maybeSingle();
      if (data) upsert(data as unknown as ThreadMessage);
      else setMessages((prev) => prev.filter((m) => m.id !== id));
    },
    [supabase, upsert],
  );

  // Realtime: private topic, membership enforced by RLS on realtime.messages.
  useEffect(() => {
    let cancelled = false;
    let channel: RealtimeChannel | null = null;

    (async () => {
      await supabase.realtime.setAuth();
      if (cancelled) return;
      channel = supabase.channel(`${target.kind}:${target.id}`, {
        config: { private: true, broadcast: { self: false }, presence: { key: me.id } },
      });
      channelRef.current = channel;
      channel
        // Payloads are only signals. Content always comes from an RLS-checked fetch.
        .on("broadcast", { event: "message_insert" }, ({ payload }) => payload?.id && void syncMessage(String(payload.id)))
        .on("broadcast", { event: "message_update" }, ({ payload }) => payload?.id && void syncMessage(String(payload.id)))
        .on("broadcast", { event: "typing" }, ({ payload }) => {
          const uid = String(payload?.user_id ?? "");
          if (uid && uid !== me.id && participants[uid]) setTyping((t) => ({ ...t, [uid]: Date.now() + 3500 }));
        })
        .on("presence", { event: "sync" }, () => setOnline(Object.keys(channel?.presenceState() ?? {})))
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") await channel?.track({ online_at: Date.now() });
        });
    })();

    return () => {
      cancelled = true;
      channelRef.current = null;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [supabase, target.kind, target.id, me.id, participants, syncMessage]);

  // Expire typing indicators.
  useEffect(() => {
    const t = setInterval(() => {
      setTyping((cur) => {
        const now = Date.now();
        const next = Object.fromEntries(Object.entries(cur).filter(([, until]) => until > now));
        return Object.keys(next).length === Object.keys(cur).length ? cur : next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Stick to bottom when new messages arrive (unless the reader scrolled up).
  useEffect(() => {
    const el = listRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [messages.length, urls]);

  // Mark read on open and when someone else's message lands.
  const lastOtherId = [...messages].reverse().find((m) => m.sender_id !== me.id)?.id;
  useEffect(() => {
    void markReadAction(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.kind, target.id, lastOtherId]);

  // Batch-sign image previews (short-lived URLs; re-signed on expiry or load error).
  useEffect(() => {
    if (signing.current) return;
    const now = Date.now();
    const need = messages
      .flatMap((m) => m.attachments ?? [])
      .filter((a) => isImageMime(a.mime_type))
      .map((a) => a.id)
      .filter((id) => !(urls[id] && urls[id].exp > now + 15_000) && (attempts.current[id] ?? 0) < 3);
    if (!need.length) return;
    need.forEach((id) => (attempts.current[id] = (attempts.current[id] ?? 0) + 1));
    signing.current = true;
    signAttachmentsAction(need.slice(0, 50))
      .then((res) => {
        if (!res.ok) return;
        const exp = Date.now() + (res.expiresIn - 10) * 1000;
        setUrls((prev) => ({
          ...prev,
          ...Object.fromEntries(Object.entries(res.urls).map(([id, url]) => [id, { url, exp }])),
        }));
      })
      .finally(() => { signing.current = false; });
  }, [messages, urls]);

  async function download(id: string) {
    const res = await signDownloadAction(id);
    if (!res.ok) return setError("Couldn't open that file.");
    window.location.assign(res.url);
  }

  async function loadOlder() {
    const oldest = messages[0];
    if (!oldest) return;
    const el = listRef.current;
    const prevHeight = el?.scrollHeight ?? 0;
    const { data } = await supabase
      .from("astra_hub_messages")
      .select(MESSAGE_SELECT)
      .eq(parentColumn, target.id)
      .lt("created_at", oldest.created_at)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE + 1);
    const rows = (data ?? []) as unknown as ThreadMessage[];
    setHasMore(rows.length > PAGE_SIZE);
    stickRef.current = false;
    setMessages((prev) => sortAsc([...rows.slice(0, PAGE_SIZE), ...prev]));
    requestAnimationFrame(() => {
      if (el) el.scrollTop = el.scrollHeight - prevHeight;
    });
  }

  function onTyping() {
    const now = Date.now();
    if (now - lastTypingSent.current > 2000) {
      lastTypingSent.current = now;
      void channelRef.current?.send({ type: "broadcast", event: "typing", payload: { user_id: me.id } });
    }
  }

  async function saveEdit(id: string) {
    const res = await editMessageAction(id, editText);
    if (!res.ok) return setError(errorText(res.error));
    setEditingId(null);
    setError(null);
    void syncMessage(id);
  }

  async function remove(id: string) {
    if (!confirm("Delete this message?")) return;
    const res = await deleteMessageAction(id);
    if (!res.ok) return setError(errorText(res.error));
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }

  const typingNames = Object.keys(typing).map((id) => participants[id]).filter(Boolean);
  const onlineOthers = online.filter((id) => id !== me.id && participants[id]).map((id) => participants[id]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b px-4 py-1.5 text-xs text-muted-foreground" aria-live="polite">
        {onlineOthers.length ? `Online: ${onlineOthers.join(", ")}` : "No one else is online"}
      </div>

      <div
        ref={listRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="min-h-0 flex-1 overflow-y-auto px-4 py-3"
      >
        {hasMore && (
          <div className="mb-3 text-center">
            <Button variant="outline" size="sm" onClick={loadOlder}>Load older messages</Button>
          </div>
        )}
        {!messages.length && <p className="py-10 text-center text-sm text-muted-foreground">No messages yet. Say hello.</p>}

        <ul className="space-y-3">
          {messages.map((m, i) => {
            const mine = m.sender_id === me.id;
            const showDay = i === 0 || day(messages[i - 1].created_at) !== day(m.created_at);
            const canEdit = mine && !!m.body && Date.now() - new Date(m.created_at).getTime() < EDIT_WINDOW_MS;
            const name = m.sender?.full_name || m.sender?.email?.split("@")[0] || participants[m.sender_id] || "Someone";
            return (
              <li key={m.id}>
                {showDay && (
                  <div className="my-2 text-center text-xs text-muted-foreground" suppressHydrationWarning>
                    {day(m.created_at)}
                  </div>
                )}
                <div className="group">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium">{mine ? "You" : name}</span>
                    <span className="text-xs text-muted-foreground" suppressHydrationWarning>{time(m.created_at)}</span>
                    {m.edited_at && <span className="text-xs text-muted-foreground">(edited)</span>}
                    {mine && editingId !== m.id && (
                      <span className="ml-auto flex gap-2 text-xs opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                        {canEdit && (
                          <button className="underline-offset-2 hover:underline" onClick={() => { setEditingId(m.id); setEditText(m.body ?? ""); }}>
                            Edit
                          </button>
                        )}
                        <button className="underline-offset-2 hover:underline" onClick={() => remove(m.id)}>Delete</button>
                      </span>
                    )}
                  </div>
                  {editingId === m.id ? (
                    <div className="mt-1 space-y-2">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        maxLength={MAX_BODY}
                        className="w-full rounded-md border bg-background p-2 text-sm"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => saveEdit(m.id)}>Save</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    m.body && <MessageBody text={m.body} names={names} />
                  )}
                  <AttachmentList
                    attachments={m.attachments ?? []}
                    urls={urls}
                    onImageError={(id) => setUrls((p) => ({ ...p, [id]: { url: "", exp: 0 } }))}
                    onDownload={download}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="shrink-0 border-t p-3">
        <div className="h-4 text-xs text-muted-foreground" aria-live="polite">
          {typingNames.length > 0 && `${typingNames.join(", ")} ${typingNames.length > 1 ? "are" : "is"} typing…`}
        </div>
        {error && <p role="alert" className="pb-1 text-sm text-destructive">{error}</p>}
        <Composer
          target={target}
          me={me}
          participants={participants}
          onTyping={onTyping}
          onSent={(id) => {
            stickRef.current = true;
            void syncMessage(id);
          }}
        />
      </div>
    </div>
  );
}
