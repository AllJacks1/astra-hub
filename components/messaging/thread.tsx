"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { ArrowDown, Pencil, Trash2 } from "lucide-react";
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
import { Avatar } from "@/components/ui/avatar";
import { useMarkSpaceRead } from "@/components/layout/live-signals";
import { cn } from "@/lib/utils";

type Props = {
  target: Target;
  me: { id: string };
  /** user id -> display name for everyone in this space (server-provided, trusted) */
  participants: Record<string, string>;
  initial: ThreadMessage[]; // ascending
  initialHasMore: boolean;
};

/** Client-only state for a message we sent but the server hasn't confirmed yet. */
type LocalMessage = ThreadMessage & { pending?: boolean; uploading?: number };
type Urls = Record<string, { url: string; exp: number }>;

/** Consecutive messages from one person within this gap render as one bubble group. */
const GROUP_GAP_MS = 5 * 60 * 1000;

const sortAsc = (list: LocalMessage[]) => [...list].sort((a, b) => a.created_at.localeCompare(b.created_at));
const time = (iso: string) => new Date(iso).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
const day = (iso: string) => new Date(iso).toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric" });

export function Thread({ target, me, participants, initial, initialHasMore }: Props) {
  const [supabase] = useState(() => createClient());
  const [messages, setMessages] = useState<LocalMessage[]>(initial);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null); // touch: tapped bubble shows its actions
  const [online, setOnline] = useState<string[]>([]);
  const [typing, setTyping] = useState<Record<string, number>>({});
  const [urls, setUrls] = useState<Urls>({});
  const [awayFromBottom, setAwayFromBottom] = useState(false);

  // Latest list for callbacks, so their identity stays stable and memoized rows don't re-render.
  const messagesRef = useRef(messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);
  const lastTypingSent = useRef(0);
  const signing = useRef(false);
  const attempts = useRef<Record<string, number>>({});
  const parentColumn = target.kind === "channel" ? "channel_id" : "conversation_id";
  const names = useMemo(() => Object.values(participants), [participants]);
  const isGroup = target.kind === "channel" || Object.keys(participants).length > 2;

  const upsert = useCallback((m: LocalMessage) => {
    setMessages((prev) => {
      const i = prev.findIndex((x) => x.id === m.id);
      if (i >= 0) {
        const next = prev.slice();
        next[i] = m;
        return next[i].created_at === prev[i].created_at ? next : sortAsc(next);
      }
      const last = prev[prev.length - 1];
      // Common case: newest message. Append without re-sorting the whole list.
      return !last || last.created_at <= m.created_at ? [...prev, m] : sortAsc([...prev, m]);
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

  // A message with N attachments emits N+1 change signals in quick succession; coalesce them
  // into one fetch per message instead of N+1 round trips.
  const syncTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const scheduleSync = useCallback(
    (id: string) => {
      const timers = syncTimers.current;
      const prev = timers.get(id);
      if (prev) clearTimeout(prev);
      timers.set(id, setTimeout(() => { timers.delete(id); void syncMessage(id); }, 250));
    },
    [syncMessage],
  );
  useEffect(() => {
    const timers = syncTimers.current;
    return () => { timers.forEach(clearTimeout); timers.clear(); };
  }, []);

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
        .on("broadcast", { event: "message_insert" }, ({ payload }) => payload?.id && scheduleSync(String(payload.id)))
        .on("broadcast", { event: "message_update" }, ({ payload }) => payload?.id && scheduleSync(String(payload.id)))
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
  }, [supabase, target.kind, target.id, me.id, participants, scheduleSync]);

  // Clock for the 15-minute edit window (render must stay pure; refreshed every 30 s).
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Expire typing indicators. Only runs while someone is typing.
  const someoneTyping = Object.keys(typing).length > 0;
  useEffect(() => {
    if (!someoneTyping) return;
    const t = setInterval(() => {
      setTyping((cur) => {
        const now = Date.now();
        const next = Object.fromEntries(Object.entries(cur).filter(([, until]) => until > now));
        return Object.keys(next).length === Object.keys(cur).length ? cur : next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [someoneTyping]);

  const scrollToBottom = useCallback((smooth = false) => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, []);

  // Before paint: open at the newest message, and follow new ones while the reader is at the bottom.
  useLayoutEffect(() => {
    if (stickRef.current) scrollToBottom();
  }, [messages.length, scrollToBottom]);

  // Content that grows later (images decoding, typing bubble) keeps the view pinned too.
  useEffect(() => {
    const el = contentRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => { if (stickRef.current) scrollToBottom(); });
    ro.observe(el);
    return () => ro.disconnect();
  }, [scrollToBottom]);

  // Mark read on open and when someone else's message lands.
  let lastOtherId: string | undefined;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].sender_id !== me.id) { lastOtherId = messages[i].id; break; }
  }
  const markSpaceRead = useMarkSpaceRead();
  useEffect(() => {
    markSpaceRead(target.kind, target.id);
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

  const download = useCallback(async (id: string) => {
    const res = await signDownloadAction(id);
    if (!res.ok) return setError("Couldn't open that file.");
    window.location.assign(res.url);
  }, []);

  const onImageError = useCallback((id: string) => setUrls((p) => ({ ...p, [id]: { url: "", exp: 0 } })), []);

  const loadOlder = useCallback(async () => {
    const oldest = messages.find((m) => !m.pending);
    if (!oldest || loadingOlder) return;
    setLoadingOlder(true);
    const el = listRef.current;
    const prevHeight = el?.scrollHeight ?? 0;
    const prevTop = el?.scrollTop ?? 0;
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
      if (el) el.scrollTop = el.scrollHeight - prevHeight + prevTop;
      setLoadingOlder(false);
    });
  }, [messages, loadingOlder, supabase, parentColumn, target.id]);

  // Infinite scroll upward: load older history when the top comes into view.
  const loadOlderRef = useRef(loadOlder);
  useEffect(() => { loadOlderRef.current = loadOlder; }, [loadOlder]);
  useEffect(() => {
    const el = topRef.current;
    const root = listRef.current;
    if (!el || !root || !hasMore) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting && !stickRef.current) void loadOlderRef.current(); },
      { root, rootMargin: "200px 0px 0px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore]);

  const onTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingSent.current > 2000) {
      lastTypingSent.current = now;
      void channelRef.current?.send({ type: "broadcast", event: "typing", payload: { user_id: me.id } });
    }
  }, [me.id]);

  const saveEdit = useCallback(
    async (id: string, text: string) => {
      const before = messagesRef.current.find((m) => m.id === id);
      // Optimistic: show the new text now, roll back if the server refuses.
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, body: text, edited_at: new Date().toISOString() } : m)));
      setEditingId(null);
      const res = await editMessageAction(id, text);
      if (!res.ok) {
        if (before) upsert(before);
        return setError(errorText(res.error));
      }
      setError(null);
      void syncMessage(id);
    },
    [syncMessage, upsert],
  );

  const remove = useCallback(
    async (id: string) => {
      if (!confirm("Delete this message?")) return;
      const before = messagesRef.current.find((m) => m.id === id);
      setMessages((prev) => prev.filter((m) => m.id !== id));
      const res = await deleteMessageAction(id);
      if (!res.ok) {
        if (before) upsert(before);
        setError(errorText(res.error));
      }
    },
    [upsert],
  );

  // Optimistic send: the bubble appears instantly, then is swapped for the server copy.
  const onOptimistic = useCallback(
    (body: string, fileCount: number) => {
      const tempId = `tmp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
      stickRef.current = true;
      setError(null);
      upsert({
        id: tempId,
        channel_id: target.kind === "channel" ? target.id : null,
        conversation_id: target.kind === "conversation" ? target.id : null,
        sender_id: me.id,
        body: body || null,
        created_at: new Date().toISOString(),
        edited_at: null,
        sender: null,
        attachments: [],
        pending: true,
        uploading: fileCount,
      });
      return tempId;
    },
    [me.id, target.kind, target.id, upsert],
  );

  const onSettled = useCallback(
    (tempId: string, messageId: string | null) => {
      if (!messageId) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        return;
      }
      stickRef.current = true;
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, id: messageId } : m)));
      void syncMessage(messageId);
    },
    [syncMessage],
  );

  const startEdit = useCallback((id: string) => { setEditingId(id); setActiveId(null); }, []);
  const cancelEdit = useCallback(() => setEditingId(null), []);
  const toggleActive = useCallback((id: string) => setActiveId((cur) => (cur === id ? null : id)), []);

  const typingIds = Object.keys(typing).filter((id) => participants[id]);
  const onlineOthers = online.filter((id) => id !== me.id && participants[id]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-chat">
      {onlineOthers.length > 0 && (
        <div className="flex shrink-0 items-center gap-2 border-b bg-background/60 px-4 py-1.5 text-xs text-muted-foreground" aria-live="polite">
          <span className="size-2 rounded-full bg-emerald-500" aria-hidden />
          <span className="truncate">Active now: {onlineOthers.map((id) => participants[id]).join(", ")}</span>
        </div>
      )}

      <div className="relative min-h-0 flex-1">
        <div
          ref={listRef}
          onScroll={(e) => {
            const el = e.currentTarget;
            const gap = el.scrollHeight - el.scrollTop - el.clientHeight;
            stickRef.current = gap < 80;
            setAwayFromBottom(gap > 400);
          }}
          className="h-full overflow-y-auto overscroll-contain px-3 py-4 sm:px-5"
        >
          <div ref={contentRef} className="mx-auto flex max-w-4xl flex-col">
            <div ref={topRef} />
            {hasMore && (
              <div className="mb-4 text-center">
                <Button variant="ghost" size="sm" onClick={loadOlder} disabled={loadingOlder} className="rounded-full text-muted-foreground">
                  {loadingOlder ? "Loading…" : "Load older messages"}
                </Button>
              </div>
            )}
            {!messages.length && (
              <div className="flex flex-col items-center gap-2 py-16 text-center">
                <span className="text-4xl" aria-hidden>👋</span>
                <p className="font-medium">No messages yet</p>
                <p className="text-sm text-muted-foreground">Say hello to start the conversation.</p>
              </div>
            )}

            <ul className="flex flex-col">
              {messages.map((m, i) => {
                const prev = messages[i - 1];
                const next = messages[i + 1];
                const mine = m.sender_id === me.id;
                const showDay = !prev || day(prev.created_at) !== day(m.created_at);
                const joinsPrev =
                  !!prev && !showDay && prev.sender_id === m.sender_id &&
                  Date.parse(m.created_at) - Date.parse(prev.created_at) < GROUP_GAP_MS;
                const joinsNext =
                  !!next && next.sender_id === m.sender_id && day(next.created_at) === day(m.created_at) &&
                  Date.parse(next.created_at) - Date.parse(m.created_at) < GROUP_GAP_MS;
                const canEdit = mine && !m.pending && !!m.body && now - new Date(m.created_at).getTime() < EDIT_WINDOW_MS;
                const name = m.sender?.full_name || m.sender?.email?.split("@")[0] || participants[m.sender_id] || "Someone";
                return (
                  <MessageRow
                    key={m.id}
                    m={m}
                    mine={mine}
                    name={name}
                    showName={isGroup && !mine && !joinsPrev}
                    showDay={showDay}
                    groupStart={!joinsPrev}
                    groupEnd={!joinsNext}
                    online={online.includes(m.sender_id)}
                    canEdit={canEdit}
                    editing={editingId === m.id}
                    active={activeId === m.id}
                    names={names}
                    urls={m.attachments?.length ? urls : EMPTY_URLS}
                    onStartEdit={startEdit}
                    onCancelEdit={cancelEdit}
                    onSaveEdit={saveEdit}
                    onDelete={remove}
                    onToggle={toggleActive}
                    onDownload={download}
                    onImageError={onImageError}
                  />
                );
              })}
            </ul>

            {typingIds.length > 0 && (
              <div className="mt-2 flex items-end gap-2" aria-live="polite">
                <Avatar name={participants[typingIds[0]]} seed={typingIds[0]} className="size-7 text-[10px]" />
                <div className="flex items-center gap-1 rounded-[20px] bg-bubble-other px-4 py-3" aria-label={`${typingIds.map((id) => participants[id]).join(", ")} typing`}>
                  <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground" />
                </div>
              </div>
            )}
          </div>
        </div>

        {awayFromBottom && (
          <button
            type="button"
            onClick={() => { stickRef.current = true; scrollToBottom(true); }}
            className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border bg-background px-3 py-1.5 text-xs font-medium shadow-lg transition-transform hover:scale-105 active:scale-95"
          >
            <ArrowDown className="size-3.5" aria-hidden /> Latest
          </button>
        )}
      </div>

      <div className="shrink-0 border-t bg-background px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5">
        <div className="mx-auto max-w-4xl">
          {error && <p role="alert" className="pb-1 text-sm text-destructive">{error}</p>}
          <Composer
            target={target}
            me={me}
            participants={participants}
            onTyping={onTyping}
            onOptimistic={onOptimistic}
            onSettled={onSettled}
          />
        </div>
      </div>
    </div>
  );
}

const EMPTY_URLS: Urls = {};

type RowProps = {
  m: LocalMessage;
  mine: boolean;
  name: string;
  showName: boolean;
  showDay: boolean;
  groupStart: boolean;
  groupEnd: boolean;
  online: boolean;
  canEdit: boolean;
  editing: boolean;
  active: boolean;
  names: string[];
  urls: Urls;
  onStartEdit: (id: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
  onDownload: (id: string) => void;
  onImageError: (id: string) => void;
};

/**
 * One message. Memoized: typing, presence and URL-signing updates re-render the thread,
 * but only rows whose props changed re-render (was: every row on every tick).
 */
const MessageRow = memo(function MessageRow({
  m, mine, name, showName, showDay, groupStart, groupEnd, online, canEdit, editing, active, names, urls,
  onStartEdit, onCancelEdit, onSaveEdit, onDelete, onToggle, onDownload, onImageError,
}: RowProps) {
  const [draft, setDraft] = useState(m.body ?? "");
  const hasBody = !!m.body;

  // Messenger-style corners: the side facing the sender's avatar tightens inside a group.
  const corners = mine
    ? cn("rounded-[20px]", !groupStart && "rounded-tr-md", !groupEnd && "rounded-br-md")
    : cn("rounded-[20px]", !groupStart && "rounded-tl-md", !groupEnd && "rounded-bl-md");

  return (
    <li className={cn(groupStart ? "mt-3" : "mt-0.5", "first:mt-0")}>
      {showDay && (
        <div className="my-4 flex justify-center" suppressHydrationWarning>
          <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-medium text-muted-foreground" suppressHydrationWarning>
            {day(m.created_at)}
          </span>
        </div>
      )}

      <div className={cn("group flex items-end gap-2", mine ? "flex-row-reverse" : "flex-row")}>
        {!mine && (
          <div className="w-7 shrink-0">
            {groupEnd && <Avatar name={name} seed={m.sender_id} online={online} className="size-7 text-[10px]" />}
          </div>
        )}

        <div className={cn("flex min-w-0 max-w-[78%] flex-col gap-1 sm:max-w-[65%]", mine ? "items-end" : "items-start")}>
          {showName && <span className="px-3 text-xs font-medium text-muted-foreground">{name}</span>}

          {editing ? (
            <div className="w-[min(28rem,80vw)] space-y-2 rounded-2xl border bg-background p-2 shadow-sm">
              <textarea
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") onCancelEdit();
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSaveEdit(m.id, draft); }
                }}
                maxLength={MAX_BODY}
                className="w-full resize-none rounded-xl bg-muted/60 p-2 text-[15px] outline-none focus:ring-2 focus:ring-ring/40"
                rows={3}
              />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={onCancelEdit}>Cancel</Button>
                <Button size="sm" onClick={() => onSaveEdit(m.id, draft)}>Save</Button>
              </div>
            </div>
          ) : (
            hasBody && (
              <div
                onClick={() => onToggle(m.id)}
                title={time(m.created_at)}
                className={cn(
                  "animate-bubble-in px-3.5 py-2 shadow-[0_1px_1px_rgb(0_0_0/0.04)]",
                  corners,
                  mine ? "text-bubble-mine-foreground" : "bg-bubble-other text-bubble-other-foreground",
                  m.pending && "opacity-70",
                )}
                style={mine ? { background: "var(--bubble-mine)" } : undefined}
              >
                <MessageBody text={m.body!} names={names} mine={mine} />
              </div>
            )
          )}

          {!!m.attachments?.length && (
            <AttachmentList
              attachments={m.attachments}
              urls={urls}
              mine={mine}
              onImageError={onImageError}
              onDownload={onDownload}
            />
          )}
          {m.pending && !!m.uploading && (
            <div className="h-24 w-48 animate-pulse rounded-2xl bg-primary/10" aria-label={`Uploading ${m.uploading} file${m.uploading > 1 ? "s" : ""}`} />
          )}

          {(groupEnd || m.pending) && !editing && (
            <span className="px-2 text-[11px] text-muted-foreground" suppressHydrationWarning>
              {m.pending ? (m.uploading ? "Uploading…" : "Sending…") : time(m.created_at)}
              {m.edited_at && !m.pending && " · edited"}
            </span>
          )}
        </div>

        {mine && !editing && !m.pending && (
          <div
            className={cn(
              "mb-5 flex shrink-0 gap-0.5 transition-opacity",
              active ? "opacity-100" : "pointer-events-none opacity-0 sm:group-hover:pointer-events-auto sm:group-hover:opacity-100 sm:group-focus-within:pointer-events-auto sm:group-focus-within:opacity-100",
            )}
          >
            {canEdit && (
              <button
                type="button"
                aria-label="Edit message"
                onClick={() => { setDraft(m.body ?? ""); onStartEdit(m.id); }}
                className="flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Pencil className="size-3.5" />
              </button>
            )}
            <button
              type="button"
              aria-label="Delete message"
              onClick={() => onDelete(m.id)}
              className="flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        )}
      </div>
    </li>
  );
});
