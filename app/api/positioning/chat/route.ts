import Anthropic from "@anthropic-ai/sdk";
import { currentUser } from "@/lib/auth";
import { extractBlocks, getPositioning, savePositioning, type Turn } from "@/lib/positioning";
import { POSITIONING_RULES } from "@/lib/prompts/positioning";

export const runtime = "nodejs";
export const maxDuration = 300;

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
const HISTORY_CHAR_BUDGET = 300_000;

function systemPrompt(status: string, profile: string, linkedin: string) {
  let s = POSITIONING_RULES + "\n\nPHASE STATE: ";
  s +=
    status === "approved"
      ? "Phase 2. The client's strategist reviewed and approved the positioning in the portal. Treat the current profile as the Master Positioning Profile and proceed with LinkedIn optimization."
      : status === "submitted"
        ? "Phase 1, submitted for strategist review. Approval has NOT happened yet. You may refine the draft if the client asks, but do not start LinkedIn work."
        : "Phase 1. Strategist approval has NOT happened. Do not start LinkedIn work.";
  if (profile) s += "\n\nLATEST SAVED POSITIONING PROFILE:\n" + profile;
  if (linkedin) s += "\n\nLATEST SAVED LINKEDIN DRAFT:\n" + linkedin;
  return s;
}

function toMessages(turns: Turn[]) {
  let t = turns.slice();
  const size = (a: Turn[]) => a.reduce((n, x) => n + x.content.length, 0);
  while (t.length > 1 && size(t) > HISTORY_CHAR_BUDGET) {
    t.shift();
    while (t.length && t[0].role !== "user") t.shift();
  }
  const out: { role: "user" | "assistant"; content: string }[] = [];
  for (const x of t) {
    const last = out[out.length - 1];
    if (last && last.role === x.role) last.content += "\n\n" + x.content;
    else out.push({ role: x.role, content: x.content });
  }
  return out;
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return new Response("Not signed in", { status: 401 });

  const body = await req.json().catch(() => ({}));
  const rec = await getPositioning(user.id, user.email!);
  const turns: Turn[] = Array.isArray(rec.turns) ? rec.turns.slice() : [];

  if (!body.retry) {
    const text = String(body.message || "").trim().slice(0, 20_000);
    const attachName = body.attachName ? String(body.attachName).slice(0, 200) : "";
    const attachText = body.attachText ? String(body.attachText).slice(0, 40_000) : "";
    if (!text && !attachText) return new Response("Empty message", { status: 400 });
    const lead = text || "Here's my résumé.";
    turns.push(
      attachText
        ? { role: "user", content: `${lead}\n\n[Attached file: ${attachName}]\n${attachText}`, display: lead, attach: attachName }
        : { role: "user", content: lead }
    );
    await savePositioning(user.id, { turns });
  }
  if (!turns.length || turns[turns.length - 1].role !== "user") return new Response("Nothing to answer", { status: 400 });

  const client = new Anthropic();
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 8000,
    system: systemPrompt(rec.status, rec.profile, rec.linkedin),
    messages: toMessages(turns),
  });

  const encoder = new TextEncoder();
  let full = "";
  let closed = false;

  const finish = async (suffix = "") => {
    if (!full.trim()) return;
    const blocks = extractBlocks(full);
    const patch: Record<string, unknown> = { turns: [...turns, { role: "assistant", content: full + suffix }] };
    if (blocks.profile) patch.profile = blocks.profile;
    if (blocks.linkedin) patch.linkedin = blocks.linkedin;
    await savePositioning(user.id, patch);
  };

  const readable = new ReadableStream({
    start(controller) {
      stream.on("text", (delta) => {
        full += delta;
        if (!closed) controller.enqueue(encoder.encode(delta));
      });
      stream
        .finalMessage()
        .then(async (msg) => {
          await finish(msg.stop_reason === "max_tokens" ? "\n\n_(Reply cut short. Ask me to continue.)_" : "");
          if (!closed) { closed = true; controller.close(); }
        })
        .catch(async (err) => {
          console.error("positioning stream error", err);
          if (full) {
            await finish("\n\n_(Reply interrupted.)_").catch(() => {});
            if (!closed) { closed = true; controller.error(err); }
            return;
          }
          // Nothing streamed: tell the browser why, so the client and Curt see a real reason.
          const status = (err as { status?: number })?.status;
          const raw = String((err as Error)?.message || err);
          const reason =
            status === 401 || /api key|x-api-key|authentication/i.test(raw) ? "AUTH"
            : /credit|billing|balance/i.test(raw) ? "BILLING"
            : status === 429 ? "RATE"
            : /ByteString/i.test(raw) ? "KEYCHARS"
            : status === 404 || /model/i.test(raw) ? "MODEL"
            : "OTHER";
          if (!closed) {
            controller.enqueue(encoder.encode(`\u0000ERROR:${reason}:${raw.slice(0, 300)}`));
            closed = true;
            controller.close();
          }
        });
    },
    cancel() {
      closed = true;
      stream.abort();
    },
  });

  return new Response(readable, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
