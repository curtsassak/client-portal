"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Turn = { role: "user" | "assistant"; content: string; display?: string; attach?: string };
type Status = "draft" | "submitted" | "approved";
type Initial = { turns: Turn[]; profile: string; linkedin: string; status: Status };

const STRATEGIST = "Curt";

const BLOCKS = [
  { key: "profile", open: "<<<PROFILE", close: "PROFILE>>>" },
  { key: "linkedin", open: "<<<LINKEDIN", close: "LINKEDIN>>>" },
] as const;

function extractBlocks(text: string) {
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

type Seg = { type: "md"; text: string } | { type: "card"; key: "profile" | "linkedin"; writing: boolean };

function segments(text: string): Seg[] {
  const segs: Seg[] = [];
  let rest = text;
  for (;;) {
    let first: { b: (typeof BLOCKS)[number]; i: number } | null = null;
    for (const b of BLOCKS) {
      const i = rest.indexOf(b.open);
      if (i >= 0 && (!first || i < first.i)) first = { b, i };
    }
    if (!first) break;
    if (first.i > 0) segs.push({ type: "md", text: rest.slice(0, first.i) });
    const j = rest.indexOf(first.b.close, first.i);
    if (j < 0) {
      segs.push({ type: "card", key: first.b.key, writing: true });
      return segs;
    }
    segs.push({ type: "card", key: first.b.key, writing: false });
    rest = rest.slice(j + first.b.close.length);
  }
  if (rest.trim()) segs.push({ type: "md", text: rest });
  return segs;
}

function Md({ text }: { text: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{ a: (p) => <a {...p} target="_blank" rel="noopener noreferrer" /> }}
    >
      {text}
    </ReactMarkdown>
  );
}

const SECTIONS = [
  { label: "1 · Headline", msg: "Write my LinkedIn headline. Give me 3 options and your recommendation." },
  { label: "2 · About", msg: "Now write my LinkedIn About section." },
  { label: "3 · Experience", msg: "Now rewrite my LinkedIn Experience section, role by role." },
  { label: "4 · Banner", msg: "Now give me my LinkedIn banner copy and design direction." },
];

const STARTERS = [
  { title: "Start my positioning", sub: "Begin with your target role and employers", msg: "Let's start. Walk me through Phase 1." },
  { title: "Upload my résumé", sub: "PDF, Word or text", msg: "__attach" },
  { title: "Build my evidence inventory", sub: "Pull wins and proof out of your career", msg: "I don't have a Career Evidence Inventory yet. Help me build one." },
  { title: "Research target employers", sub: "Find the problems they're hiring to solve", msg: "Help me figure out what my target employers need most and how to research it." },
];

export default function PositioningClient({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [turns, setTurns] = useState<Turn[]>(initial.turns);
  const [profile, setProfile] = useState(initial.profile);
  const [linkedin, setLinkedin] = useState(initial.linkedin);
  const [status, setStatus] = useState<Status>(initial.status);
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [input, setInput] = useState("");
  const [attach, setAttach] = useState<{ name: string; text: string } | null>(null);
  const [ptab, setPtab] = useState<"profile" | "linkedin">("profile");
  const [view, setView] = useState<"chat" | "profile">("chat");
  const [confirmReset, setConfirmReset] = useState(false);
  const [copied, setCopied] = useState(false);
  const ctl = useRef<AbortController | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Pick up Curt's approval when the client returns to the tab.
  useEffect(() => {
    const onFocus = () => { if (!busy) router.refresh(); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [busy, router]);
  useEffect(() => {
    setStatus(initial.status);
    if (initial.profile) setProfile(initial.profile);
  }, [initial.status, initial.profile]);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns.length, live, error]);

  const phase2 = status === "approved";
  const profileTitle = phase2 ? "Master Positioning Profile" : "Draft Positioning Profile";

  async function run(body: Record<string, unknown>, optimistic?: Turn) {
    if (busy) return;
    setError("");
    setNotice("");
    if (optimistic) setTurns((t) => [...t, optimistic]);
    setBusy(true);
    setLive("");
    const c = new AbortController();
    ctl.current = c;
    let full = "";
    try {
      const res = await fetch("/api/positioning/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: c.signal,
      });
      if (res.status === 401) { router.push("/login"); return; }
      if (!res.ok || !res.body) throw new Error("http");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        full += dec.decode(value, { stream: true });
        setLive(full);
      }
      if (full.startsWith("\u0000ERROR:")) {
        const [, reason, ...rest] = full.split(":");
        const MSG: Record<string, string> = {
          AUTH: "The AI service rejected the portal's key. Curt needs to check ANTHROPIC_API_KEY.",
          BILLING: "The AI account is out of credit. Curt needs to add billing at console.anthropic.com.",
          RATE: "Too many requests right now. Wait a minute and try again.",
          KEYCHARS: "The AI key has extra characters pasted into it. Curt needs to re-paste ANTHROPIC_API_KEY.",
          MODEL: "The AI model setting isn't valid.",
        };
        setLive("");
        setError(`${MSG[reason] || "The AI service returned an error."} (${rest.join(":").slice(0, 160)})`);
        return;
      }
      const blocks = extractBlocks(full);
      if (blocks.profile) { setProfile(blocks.profile); setPtab("profile"); }
      if (blocks.linkedin) { setLinkedin(blocks.linkedin); setPtab("linkedin"); }
      setTurns((t) => [...t, { role: "assistant", content: full }]);
      setLive("");
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        if (full) setTurns((t) => [...t, { role: "assistant", content: full + "\n\n_(Stopped.)_" }]);
        setLive("");
      } else {
        if (full) { setTurns((t) => [...t, { role: "assistant", content: full + "\n\n_(Reply interrupted.)_" }]); setLive(""); }
        setError("The connection dropped before the reply finished.");
      }
    } finally {
      setBusy(false);
      ctl.current = null;
    }
  }

  function send(text: string) {
    text = text.trim();
    if (!text && !attach) return;
    const lead = text || "Here's my résumé.";
    const optimistic: Turn = attach ? { role: "user", content: lead, display: lead, attach: attach.name } : { role: "user", content: lead };
    const body = attach ? { message: lead, attachName: attach.name, attachText: attach.text } : { message: lead };
    setAttach(null);
    setInput("");
    if (taRef.current) taRef.current.style.height = "auto";
    run(body, optimistic);
  }

  async function onFile(f: File) {
    setNotice(`Reading ${f.name}…`);
    const fd = new FormData();
    fd.append("file", f);
    try {
      const res = await fetch("/api/positioning/upload", { method: "POST", body: fd });
      const j = await res.json();
      if (!res.ok) { setNotice(j.error || "Couldn't read that file."); return; }
      setAttach({ name: j.name, text: j.text });
      setNotice("");
      taRef.current?.focus();
    } catch {
      setNotice("Couldn't upload that file. Paste the text into the message box instead.");
    }
  }

  async function act(action: "submit" | "reset") {
    const res = await fetch("/api/positioning/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { setNotice(j.error || "Something went wrong. Try again."); return; }
    if (action === "submit") setStatus("submitted");
    if (action === "reset") {
      setTurns([]); setProfile(""); setLinkedin(""); setStatus("draft"); setConfirmReset(false); setPtab("profile");
    }
  }

  const doc = ptab === "profile" ? profile : linkedin;

  function download() {
    const filename = ptab === "profile" ? `${profileTitle.replace(/ /g, "-")}.md` : "LinkedIn-Profile-Draft.md";
    const url = URL.createObjectURL(new Blob([doc], { type: "text/markdown" }));
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function copy() {
    try { await navigator.clipboard.writeText(doc); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    catch { setNotice("Copy didn't work here. Use Download instead."); }
  }

  const lastIsUser = turns.length > 0 && turns[turns.length - 1].role === "user";

  function renderBot(text: string) {
    return segments(text).map((s, i) =>
      s.type === "md" ? (
        <Md key={i} text={s.text} />
      ) : (
        <div className="card" key={i}>
          <div>
            <strong>{s.key === "profile" ? profileTitle : "LinkedIn profile"}</strong>
            <br />
            <span>{s.writing ? "Writing it now…" : "Updated in your profile panel"}</span>
          </div>
          {!s.writing && (
            <button type="button" className="btn" onClick={() => { setPtab(s.key); setView("profile"); }}>Open</button>
          )}
        </div>
      )
    );
  }

  return (
    <div className="workspace" data-view={view}>
      <div className="subbar">
        <ol className="track" aria-label="Progress">
          <li data-s={phase2 ? "done" : "active"}><span className="n">1</span>Positioning discovery</li>
          <li data-s={phase2 ? "done" : status === "submitted" ? "active" : "pending"}><span className="n">2</span>Strategist review</li>
          <li data-s={phase2 ? "active" : "locked"}><span className="n">3</span>LinkedIn</li>
        </ol>
        <div className="switch" role="group" aria-label="View">
          <button aria-pressed={view === "chat"} onClick={() => setView("chat")}>Conversation</button>
          <button aria-pressed={view === "profile"} onClick={() => setView("profile")}>Your profile</button>
        </div>
      </div>

      <main className="work">
        <section className="chat" aria-label="Conversation">
          <div className="log" ref={logRef} aria-live="polite">
            {turns.length === 0 && !phase2 && (
              <div className="welcome">
                <h2>Make the case for why they hire you.</h2>
                <p>We&apos;ll pin down what your target employers need solved, find the proof in your career, and build a positioning profile you&apos;ll review with {STRATEGIST}. Once {STRATEGIST} approves it, this tool rebuilds your LinkedIn on that foundation.</p>
                <p>Have your résumé ready. Two or three job descriptions you&apos;d apply for will sharpen everything.</p>
                <div className="starters">
                  {STARTERS.map((s) => (
                    <button key={s.title} type="button" onClick={() => (s.msg === "__attach" ? fileRef.current?.click() : send(s.msg))}>
                      <b>{s.title}</b>
                      <span>{s.sub}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {turns.map((t, i) =>
              t.role === "user" ? (
                <div className="msg user" key={i}>
                  {t.display ?? t.content}
                  {t.attach && <div className="chip">Attached: {t.attach}</div>}
                </div>
              ) : (
                <div className="msg bot" key={i}>
                  <div className="who">Positioning strategist</div>
                  <div className="body">{renderBot(t.content)}</div>
                </div>
              )
            )}
            {!busy && !error && lastIsUser && (
              <div className="msg bot">
                <div className="who">Positioning strategist</div>
                <div className="err">
                  <span className="muted">No reply to your last message yet.</span>
                  <button type="button" className="btn" onClick={() => run({ retry: true })}>Get reply</button>
                </div>
              </div>
            )}
            {(busy || error) && (
              <div className="msg bot">
                <div className="who">Positioning strategist</div>
                <div className="body">{live ? renderBot(live) : busy ? <p className="thinking">Thinking…</p> : null}</div>
                {error && (
                  <div className="err">
                    <span>{error}</span>
                    {lastIsUser && <button type="button" className="btn" onClick={() => run({ retry: true })}>Try again</button>}
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            {phase2 && !busy && (
              <div className="sections">
                <span>LinkedIn, in order:</span>
                {SECTIONS.map((s) => (
                  <button key={s.label} type="button" className="btn" onClick={() => send(s.msg)}>{s.label}</button>
                ))}
              </div>
            )}
            {notice && <div className="notice">{notice}</div>}
            <form
              className="composer"
              onSubmit={(e) => { e.preventDefault(); send(input); }}
            >
              <textarea
                ref={taRef}
                id="message"
                rows={2}
                value={input}
                placeholder="Answer here, or paste a job description…"
                aria-label="Your message"
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px";
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(input); }
                }}
              />
              <div className="row">
                <div className="left">
                  <button type="button" className="btn" disabled={busy} onClick={() => fileRef.current?.click()}>Attach résumé</button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.docx,.txt,.md"
                    hidden
                    onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) onFile(f); }}
                  />
                  {attach && (
                    <div className="attached">
                      <span>{attach.name}</span>
                      <button type="button" aria-label="Remove attachment" onClick={() => setAttach(null)}>×</button>
                    </div>
                  )}
                </div>
                {busy ? (
                  <button type="button" className="btn dark" onClick={() => ctl.current?.abort()}>Stop</button>
                ) : (
                  <button type="submit" className="btn primary">Send</button>
                )}
              </div>
            </form>
          </div>
        </section>

        <aside className="profile" aria-label="Your positioning">
          <div className="ptabs" role="tablist">
            <button role="tab" aria-selected={ptab === "profile"} onClick={() => setPtab("profile")}>Positioning profile</button>
            <button role="tab" aria-selected={ptab === "linkedin"} onClick={() => setPtab("linkedin")}>LinkedIn</button>
          </div>
          <div className="pbody">
            {doc ? (
              <div className="doc"><Md text={doc} /></div>
            ) : ptab === "profile" ? (
              <div className="empty">
                <b>Your Draft Positioning Profile lands here.</b>
                <span>It builds as you work through Phase 1: target, employer problems, value proposition and your three strongest differentiators with proof.</span>
              </div>
            ) : phase2 ? (
              <div className="empty"><b>Your LinkedIn drafts land here.</b><span>Headline, About, Experience, then Banner.</span></div>
            ) : (
              <div className="empty">
                <b>LinkedIn comes after strategist approval.</b>
                <span>Finish your Draft Positioning Profile and submit it for review. Once {STRATEGIST} approves it, this opens.</span>
              </div>
            )}
          </div>
          <div className="pfoot">
            {doc && (
              <div className="acts">
                <button type="button" className="btn" onClick={download}>Download</button>
                <button type="button" className="btn" onClick={copy}>{copied ? "Copied" : "Copy"}</button>
              </div>
            )}
            {ptab === "profile" && (
              <>
                {phase2 ? (
                  <div className="approved">Approved by {STRATEGIST}. LinkedIn is open.</div>
                ) : status === "submitted" ? (
                  <div className="gate"><b>Submitted for review</b><span>{STRATEGIST} will go through it with you and approve it here. You can keep refining it until then.</span></div>
                ) : profile ? (
                  <div className="gate">
                    <b>Ready for {STRATEGIST}?</b>
                    <span>Check it for accuracy, then submit it. {STRATEGIST} reviews it with you and approves it, which opens LinkedIn.</span>
                    <div><button type="button" className="btn primary" onClick={() => act("submit")}>Submit for review</button></div>
                  </div>
                ) : null}
                {!phase2 && (turns.length > 0 || profile) && (
                  confirmReset ? (
                    <div className="confirm">
                      <span>Erase this conversation and profile?</span>
                      <button type="button" className="btn dark" onClick={() => act("reset")}>Erase</button>
                      <button type="button" className="btn" onClick={() => setConfirmReset(false)}>Keep</button>
                    </div>
                  ) : (
                    <div className="acts"><button type="button" className="btn link" onClick={() => setConfirmReset(true)}>Start over</button></div>
                  )
                )}
              </>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}
