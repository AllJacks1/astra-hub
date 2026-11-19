"use client";

import { useMemo, useRef, useState } from "react";
import { Paperclip, SendHorizontal, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { deleteMessageAction, sendMessageAction } from "@/components/messaging/actions";
import { registerAttachmentAction } from "@/components/messaging/attachments-actions";
import { ACCEPT_ATTR, MAX_FILES_PER_MESSAGE, formatBytes, isAllowedFile, randomStorageName } from "@/lib/file-allowlist";
import { errorText } from "@/lib/messaging/errors";
import { compressImage } from "@/lib/image-compress";
import { MAX_BODY, type Target } from "@/lib/messaging/validate";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const BUCKET = "astra-hub-attachments";
const MAX_TA_HEIGHT = 160;

type Props = {
  target: Target;
  me: { id: string };
  participants: Record<string, string>;
  /** Show the message right away; returns a temporary id. */
  onOptimistic: (body: string, fileCount: number) => string;
  /** Server answered: swap the temp bubble for the real message (or drop it on failure). */
  onSettled: (tempId: string, messageId: string | null) => void;
  onTyping: () => void;
};

export function Composer({ target, me, participants, onOptimistic, onSettled, onTyping }: Props) {
  const [supabase] = useState(() => createClient());
  const [draft, setDraft] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [mentions, setMentions] = useState<Record<string, string>>({});
  const [query, setQuery] = useState<string | null>(null);
  const [highlight, setHighlight] = useState(0);
  const [preparing, setPreparing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const canMention = target.kind === "channel"; // DM participants are notified anyway
  const busy = preparing || uploading;

  const candidates = useMemo(() => {
    if (query === null) return [];
    const q = query.toLowerCase();
    return Object.entries(participants)
      .filter(([id, name]) => id !== me.id && name.toLowerCase().includes(q))
      .slice(0, 6);
  }, [query, participants, me.id]);

  function autosize() {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, MAX_TA_HEIGHT)}px`;
  }

  function onChange(value: string, caret: number) {
    setDraft(value);
    autosize();
    onTyping();
    if (!canMention) return;
    const m = /(?:^|\s)@([^\s@]{0,30})$/.exec(value.slice(0, caret));
    setQuery(m ? m[1] : null);
    setHighlight(0);
  }

  function pick(id: string, name: string) {
    const ta = taRef.current;
    const caret = ta?.selectionStart ?? draft.length;
    const upto = draft.slice(0, caret);
    const m = /(^|\s)@([^\s@]{0,30})$/.exec(upto);
    if (!m) return;
    const start = upto.length - m[0].length + m[1].length;
    setDraft(draft.slice(0, start) + `@${name} ` + draft.slice(caret));
    setMentions((p) => ({ ...p, [id]: name }));
    setQuery(null);
    requestAnimationFrame(() => {
      ta?.focus();
      const pos = start + name.length + 2;
      ta?.setSelectionRange(pos, pos);
    });
  }

  async function addFiles(list: FileList | null) {
    if (!list) return;
    const picked = Array.from(list);
    if (fileRef.current) fileRef.current.value = "";
    const next = [...files];
    const problems: string[] = [];
    setPreparing(true);
    setStatus(picked.some((f) => f.type.startsWith("image/")) ? "Preparing photos…" : null);
    try {
      for (const original of picked) {
        if (next.length >= MAX_FILES_PER_MESSAGE) { problems.push(`Max ${MAX_FILES_PER_MESSAGE} files per message.`); break; }
        // Shrink photos first (saves data for sender and readers), then validate the result.
        const f = await compressImage(original);
        const check = isAllowedFile(f);
        if (!check.ok) problems.push(`${original.name}: ${errorText(check.error)}`);
        else next.push(f);
      }
    } finally {
      setFiles(next);
      setError(problems.length ? problems.join(" ") : null);
      setStatus(null);
      setPreparing(false);
    }
  }

  async function uploadOne(file: File, messageId: string): Promise<boolean> {
    const path = `${target.kind}/${target.id}/${messageId}/${randomStorageName(file.name)}`;
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });
    if (upErr) return false;
    const r = await registerAttachmentAction({ messageId, path, name: file.name, mime: file.type, size: file.size });
    return r.ok;
  }

  async function send() {
    const body = draft.trim();
    const toSend = files;
    const sentMentions = mentions;
    if ((!body && !toSend.length) || busy) return;
    setError(null);

    // Clear the box and show the bubble immediately; text-only sends don't block the next one.
    const tempId = onOptimistic(body, toSend.length);
    setDraft(""); setFiles([]); setMentions({}); setQuery(null);
    requestAnimationFrame(autosize);
    if (toSend.length) setUploading(true);

    const mentionIds = Object.entries(sentMentions)
      .filter(([, name]) => body.includes(`@${name}`))
      .map(([id]) => id);

    const res = await sendMessageAction(target, body, { mentionIds, hasAttachments: toSend.length > 0 });
    if (!res.ok || !res.messageId) {
      onSettled(tempId, null);
      // Give the text back so nothing typed is lost.
      setDraft((d) => d || body);
      setFiles((f) => (f.length ? f : toSend));
      setMentions((m) => ({ ...sentMentions, ...m }));
      setUploading(false);
      requestAnimationFrame(autosize);
      return setError(errorText(res.ok ? "send_failed" : res.error));
    }

    let failed = 0;
    for (let i = 0; i < toSend.length; i++) {
      setStatus(`Uploading ${i + 1} of ${toSend.length}…`);
      if (!(await uploadOne(toSend[i], res.messageId))) failed++;
    }

    const allFailed = toSend.length > 0 && failed === toSend.length && !body;
    if (allFailed) {
      await deleteMessageAction(res.messageId); // don't leave an empty ghost message
      setError("Upload failed. Nothing was sent.");
      setFiles((f) => (f.length ? f : toSend));
    } else if (failed) {
      setError(`${failed} file${failed > 1 ? "s" : ""} failed to upload.`);
    }
    setStatus(null);
    setUploading(false);
    onSettled(tempId, allFailed ? null : res.messageId);
  }

  const canSend = !busy && (!!draft.trim() || files.length > 0);

  return (
    <div className="relative">
      {candidates.length > 0 && (
        <ul
          role="listbox"
          className="absolute bottom-full left-0 z-10 mb-2 w-72 overflow-hidden rounded-xl border bg-popover p-1 text-sm shadow-xl"
        >
          {candidates.map(([id, name], i) => (
            <li key={id} role="option" aria-selected={i === highlight}>
              <button
                type="button"
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left",
                  i === highlight ? "bg-primary/10" : "hover:bg-muted",
                )}
                onMouseEnter={() => setHighlight(i)}
                onMouseDown={(e) => { e.preventDefault(); pick(id, name); }}
              >
                <Avatar name={name} seed={id} className="size-6 text-[9px]" />
                <span className="truncate">{name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {files.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-2">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-full bg-muted py-1 pr-1 pl-3 text-xs">
              <span className="max-w-40 truncate font-medium">{f.name}</span>
              <span className="text-muted-foreground">{formatBytes(f.size)}</span>
              <button
                type="button"
                aria-label={`Remove ${f.name}`}
                disabled={busy}
                onClick={() => setFiles(files.filter((_, j) => j !== i))}
                className="flex size-5 items-center justify-center rounded-full hover:bg-background"
              >
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {status && <p className="pb-1 text-xs text-muted-foreground" aria-live="polite">{status}</p>}
      {error && <p role="alert" className="pb-1 text-sm text-destructive">{error}</p>}

      <div className="flex items-end gap-2">
        <input ref={fileRef} type="file" multiple accept={ACCEPT_ATTR} hidden onChange={(e) => void addFiles(e.target.files)} />
        <button
          type="button"
          aria-label="Attach files"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/10 active:scale-95 disabled:opacity-50"
        >
          <Paperclip className="size-5" />
        </button>
        <textarea
          ref={taRef}
          value={draft}
          onChange={(e) => onChange(e.target.value, e.target.selectionStart)}
          onKeyDown={(e) => {
            if (candidates.length) {
              if (e.key === "ArrowDown") { e.preventDefault(); setHighlight((h) => (h + 1) % candidates.length); return; }
              if (e.key === "ArrowUp") { e.preventDefault(); setHighlight((h) => (h - 1 + candidates.length) % candidates.length); return; }
              if (e.key === "Enter" || e.key === "Tab") {
                e.preventDefault();
                const [id, name] = candidates[Math.min(highlight, candidates.length - 1)];
                return pick(id, name);
              }
            }
            if (e.key === "Escape") return setQuery(null);
            // Desktop: Enter sends. Touch devices: Enter inserts a newline.
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && !window.matchMedia("(pointer: coarse)").matches) {
              e.preventDefault();
              void send();
            }
          }}
          maxLength={MAX_BODY}
          rows={1}
          placeholder={canMention ? "Message… (@ to mention)" : "Message…"}
          aria-label="Message"
          // 16px on phones stops iOS zooming into the field.
          className="max-h-40 min-h-10 flex-1 resize-none rounded-[20px] border-0 bg-muted px-4 py-2.5 text-base leading-5 outline-none transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40 sm:text-[15px]"
        />
        <button
          type="button"
          aria-label="Send"
          onClick={() => void send()}
          disabled={!canSend}
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full transition-all active:scale-90",
            canSend ? "bg-primary text-primary-foreground shadow-md hover:brightness-110" : "text-muted-foreground opacity-60",
          )}
        >
          <SendHorizontal className="size-5" />
        </button>
      </div>
    </div>
  );
}
