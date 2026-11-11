import { supabaseAdmin } from "./supabase/admin";

export type Turn = { role: "user" | "assistant"; content: string; display?: string; attach?: string };
export type Status = "draft" | "submitted" | "approved";
export type PositioningRecord = {
  user_id: string;
  email: string;
  turns: Turn[];
  profile: string;
  linkedin: string;
  status: Status;
  approved_at: string | null;
  updated_at: string;
};

export async function getPositioning(userId: string, email: string): Promise<PositioningRecord> {
  const db = supabaseAdmin();
  const { data } = await db.from("positioning").select("*").eq("user_id", userId).maybeSingle();
  if (data) return data as PositioningRecord;
  const fresh = { user_id: userId, email, turns: [], profile: "", linkedin: "", status: "draft" as Status };
  await db.from("positioning").upsert(fresh);
  return { ...fresh, approved_at: null, updated_at: new Date().toISOString() };
}

export async function savePositioning(userId: string, patch: Partial<PositioningRecord>) {
  const { error } = await supabaseAdmin()
    .from("positioning")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (error) throw error;
}

const BLOCKS = [
  { key: "profile", open: "<<<PROFILE", close: "PROFILE>>>" },
  { key: "linkedin", open: "<<<LINKEDIN", close: "LINKEDIN>>>" },
] as const;

export function extractBlocks(text: string): { profile?: string; linkedin?: string } {
  const out: { profile?: string; linkedin?: string } = {};
  for (const b of BLOCKS) {
    const i = text.lastIndexOf(b.open);
    if (i < 0) continue;
    const j = text.indexOf(b.close, i);
    if (j < 0) continue;
    out[b.key] = text.slice(i + b.open.length, j).trim();
  }
  return out;
}
