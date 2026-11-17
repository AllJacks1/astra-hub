export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID_RE.test(v);
export const EDIT_WINDOW_MS = 15 * 60 * 1000;
export const MAX_BODY = 8000;
export const PAGE_SIZE = 30;

export type Target = { kind: "channel" | "conversation"; id: string };

export type ThreadMessage = {
  id: string;
  channel_id: string | null;
  conversation_id: string | null;
  sender_id: string;
  body: string | null;
  created_at: string;
  edited_at: string | null;
  sender: { id: string; full_name: string | null; email: string } | null;
};

export const MESSAGE_SELECT =
  "id, channel_id, conversation_id, sender_id, body, created_at, edited_at, sender:astra_hub_profiles(id, full_name, email)";
