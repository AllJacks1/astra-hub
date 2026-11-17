"use client";

import { useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { deleteMessageAction, sendMessageAction } from "@/components/messaging/actions";
import { registerAttachmentAction } from "@/components/messaging/attachments-actions";
import { ACCEPT_ATTR, MAX_FILES_PER_MESSAGE, formatBytes, isAllowedFile, randomStorageName } from "@/lib/file-allowlist";
import { errorText } from "@/lib/messaging/errors";
import { MAX_BODY, type Target } from "@/lib/messaging/validate";
import { Button } from "@/components/ui/button";

const BUCKET = "astra-hub-attachments";

type Props = {
  target: Target;
  me: { id: string };
  participants: Record<string, string>;
  onSent: (messageId: string) => void;
  onTyping: () => void;
};

export function Composer({ target, me, participants, onSent, onTyping }: Props) {
  const [supabase] = useState(() => createClient());
  const [draft, setDraft] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [mentions, setMentions] = useState<Record<string, string>>({});
  const [query, setQuery] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const canMention = target.kind === "channel"; // DM participants are notified anyway

  const candidates = useMemo(() => {
    if (query === null) return [];
    const q = query.toLowerCase();
    return Object.entries(participants)
      .filter(([id, name]) => id !== me.id && name.toLowerCase().includes(q))
      .slice(0, 6);
  }, [query, participants, me.id]);

  function onChange(value: string, caret: number) {
    setDraft(value);
    onTyping();
    if (!canMention) return;
    const m = /(?:^|\s)@([^\s@]{0,30})$/.exec(value.slice(0, caret));
    setQuery(m ? m[1] : null);
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

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next = [...files];
    const problems: string[] = [];
    for (const f of Array.from(list)) {
      if (next.length >= MAX_FILES_PER_MESSAGE) { problems.push(`Max ${MAX_FILES_PER_MESSAGE} files per message.`); break; }
      const check = isAllowedFile(f);
      if (!check.ok) problems.push(`${f.name}: ${errorText(check.error)}`);
      else next.push(f);
    }
    setFiles(next);
    setError(problems.length ? problems.join(" ") : null);
    if (fileRef.current) fileRef.current.value = "";
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
    if ((!body && !files.length) || busy) return;
    setBusy(true);
    setError(null);

    const mentionIds = Object.entries(mentions)
      .filter(([, name]) => body.includes(`@${name}`))
      .map(([id]) => id);

    const res = await sendMessageAction(target, body, { mentionIds, hasAttachments: files.length > 0 });
    if (!res.ok || !res.messageId) {
      setBusy(false);
      return setError(errorText(res.ok ? "send_failed" : res.error));
    }

    let failed = 0;
    for (let i = 0; i < files.length; i++) {
      setStatus(`Uploading ${i + 1} of ${files.length}…`);
      if (!(await uploadOne(files[i], res.messageId))) failed++;
    }

    let msg: string | null = null;
    if (files.length && failed === files.length && !body) {
      await deleteMessageAction(res.messageId); // don't leave an empty ghost message
      msg = "Upload failed. Nothing was sent.";
    } else if (failed) {
      msg = `${failed} file${failed > 1 ? "s" : ""} failed to upload.`;
    }

    setStatus(null);
    setError(msg);
    setBusy(false);
    if (!(files.length && failed === files.length && !body)) {
      setDraft(""); setFiles([]); setMentions({});
      onSent(res.messageId);
    }
  }

  return (
    <div className="relative">
      {candidates.length > 0 && (
        <ul className="absolute bottom-full left-0 z-10 mb-1 w-64 overflow-hidden rounded-md border bg-background text-sm shadow">
          {candidates.map(([id, name]) => (
            <li key={id}>
              <button type="button" className="w-full px-3 py-1.5 text-left hover:bg-muted" onMouseDown={(e) => { e.preventDefault(); pick(id, name); }}>
                @{name}
              </button>
            </li>
          ))}
        </ul>
      )}

      {files.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-2">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-md border px-2 py-1 text-xs">
              <span className="max-w-40 truncate">{f.name}</span>
              <span className="text-muted-foreground">{formatBytes(f.size)}</span>
              <button type="button" aria-label={`Remove ${f.name}`} disabled={busy} onClick={() => setFiles(files.filter((_, j) => j !== i))}>✕</button>
            </li>
          ))}
        </ul>
      )}

      {status && <p className="pb-1 text-xs text-muted-foreground" aria-live="polite">{status}</p>}
      {error && <p role="alert" className="pb-1 text-sm text-destructive">{error}</p>}

      <div className="flex items-end gap-2">
        <input ref={fileRef} type="file" multiple accept={ACCEPT_ATTR} hidden onChange={(e) => addFiles(e.target.files)} />
        <Button type="button" variant="outline" aria-label="Attach files" disabled={busy} onClick={() => fileRef.current?.click()}>📎</Button>
        <textarea
          ref={taRef}
          value={draft}
          onChange={(e) => onChange(e.target.value, e.target.selectionStart)}
          onKeyDown={(e) => {
            // Desktop: Enter sends. Touch devices: Enter inserts a newline.
            const touch = window.matchMedia("(pointer: coarse)").matches;
            if (e.key === "Enter" && !e.shiftKey && !touch && candidates.length === 0) {
              e.preventDefault();
              void send();
            }
            if (e.key === "Escape") setQuery(null);
          }}
          maxLength={MAX_BODY}
          rows={1}
          placeholder={canMention ? "Write a message (@ to mention)" : "Write a message"}
          aria-label="Message"
          className="max-h-40 min-h-9 flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm"
        />
        <Button onClick={send} disabled={busy || (!draft.trim() && !files.length)}>Send</Button>
      </div>
    </div>
  );
}
