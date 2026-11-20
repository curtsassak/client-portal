import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import TopBar from "@/components/TopBar";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { setStatus, updateMeasures, setGoalsConfirmed } from "../../actions";
import { getIntakeByEmail, INTAKE_QUESTIONS, STATUS_LABEL } from "@/lib/intake";
import type { Turn } from "@/lib/positioning";

export const dynamic = "force-dynamic";

export default async function ClientDetail({ params }: { params: { email: string } }) {
  const user = await requireAdmin();
  const email = decodeURIComponent(params.email).toLowerCase();
  const db = supabaseAdmin();
  const [{ data: client }, { data: rec }] = await Promise.all([
    db.from("clients").select("email,name").eq("email", email).maybeSingle(),
    db.from("positioning").select("*").eq("email", email).maybeSingle(),
  ]);
  const name = client?.name || email;
  const intake = await getIntakeByEmail(email).catch(() => null);
  const fmt = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/Chicago" });
  const turns: Turn[] = (rec?.turns as Turn[]) || [];

  return (
    <div className="page">
      <TopBar email={user.email} admin />
      <main className="admin">
        <Link href="/admin" className="btn link">← All clients</Link>
        <div className="admin-head">
          <h2 className="h-xl">{name}</h2>
          <p className="muted">{email}</p>
        </div>

        {intake?.submitted_at ? (
          <section className="panel goals-admin">
            <div className="goals-head">
              <h3>Goals and success measures</h3>
              <span className={`pill ${intake.confirmed_at ? "ok" : "gold"}`}>
                {intake.confirmed_at ? `Confirmed ${fmt(intake.confirmed_at)}` : `Submitted ${fmt(intake.submitted_at)}, not yet confirmed`}
              </span>
            </div>
            {INTAKE_QUESTIONS.map((q) => (
              <div key={q.id} className="qa">
                <div className="muted small">{q.label}</div>
                <p>{intake.answers[q.id]}</p>
              </div>
            ))}
            <form action={updateMeasures} className="measure-form">
              <input type="hidden" name="email" value={email} />
              {intake.measures.map((m, i) => (
                <div key={i} className="measure-row">
                  <div className="strong">{i + 1}. {m.text}</div>
                  <select name={`status${i}`} defaultValue={m.status} className="field" aria-label={`Status for measure ${i + 1}`}>
                    {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  <input name={`note${i}`} defaultValue={m.note || ""} className="field" placeholder="Note (visible to client)" aria-label={`Note for measure ${i + 1}`} />
                </div>
              ))}
              <div className="review-acts"><button className="btn primary" type="submit">Save progress</button></div>
            </form>
            <form action={setGoalsConfirmed} className="review-acts">
              <input type="hidden" name="email" value={email} />
              {!intake.confirmed_at && <button className="btn" name="to" value="confirm" type="submit">Confirm goals (agreed with client)</button>}
              <button className="btn link" name="to" value="reopen" type="submit">Reopen for client to edit</button>
            </form>
          </section>
        ) : (
          <section className="panel"><p className="muted">{name} hasn&apos;t submitted onboarding goals yet. They&apos;ll be asked to the next time they sign in.</p></section>
        )}

        {!rec ? (
          <section className="panel"><p className="muted">{name} hasn&apos;t opened the Positioning tool yet.</p></section>
        ) : (
          <>
            <section className="panel review">
              <div>
                <h3>Positioning status: {rec.status === "approved" ? "Approved" : rec.status === "submitted" ? "Submitted for your review" : rec.profile ? "Draft ready, not submitted" : "In progress"}</h3>
                <p className="muted small">
                  {rec.status === "approved"
                    ? "LinkedIn optimization is open for this client."
                    : "Approving marks this as their Master Positioning Profile and opens LinkedIn optimization."}
                </p>
              </div>
              <div className="review-acts">
                {rec.profile && <a className="btn" href={`/api/positioning/export?doc=profile&email=${encodeURIComponent(email)}`}>Download profile (Word)</a>}
                {rec.linkedin && <a className="btn" href={`/api/positioning/export?doc=linkedin&email=${encodeURIComponent(email)}`}>Download LinkedIn (Word)</a>}
              </div>
              <form action={setStatus} className="review-acts">
                <input type="hidden" name="email" value={email} />
                {rec.status !== "approved" ? (
                  <button className="btn primary" name="to" value="approved" type="submit" disabled={!rec.profile}>Approve positioning</button>
                ) : (
                  <button className="btn" name="to" value="draft" type="submit">Reopen as draft</button>
                )}
                {rec.status === "submitted" && <button className="btn" name="to" value="draft" type="submit">Send back for changes</button>}
              </form>
            </section>

            {rec.direction && (
              <section className="panel doc">
                <div className="review-acts" style={{ marginBottom: 8 }}>
                  <a className="btn" href={`/api/positioning/export?doc=direction&email=${encodeURIComponent(email)}`}>Download Direction Plan (Word)</a>
                </div>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{rec.direction}</ReactMarkdown>
              </section>
            )}

            <div className="detail-grid">
              <section className="panel doc">
                {rec.profile ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{rec.profile}</ReactMarkdown> : <p className="muted">No profile yet.</p>}
              </section>
              <section className="panel doc">
                {rec.linkedin ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{rec.linkedin}</ReactMarkdown> : <p className="muted">No LinkedIn drafts yet.</p>}
              </section>
            </div>

            <details className="panel">
              <summary>Conversation ({turns.length} messages)</summary>
              <div className="transcript">
                {turns.map((t, i) => (
                  <div key={i} className={`msg ${t.role === "user" ? "user" : "bot"}`}>
                    {t.role === "user" ? (t.display ?? t.content) : <div className="body"><ReactMarkdown remarkPlugins={[remarkGfm]}>{t.content.replace(/<<<(PROFILE|LINKEDIN|DIRECTION)[\s\S]*?(PROFILE|LINKEDIN|DIRECTION)>>>/g, "_[Document saved to panel]_")}</ReactMarkdown></div>}
                    {t.attach && <div className="chip">Attached: {t.attach}</div>}
                  </div>
                ))}
              </div>
            </details>
          </>
        )}
      </main>
    </div>
  );
}
