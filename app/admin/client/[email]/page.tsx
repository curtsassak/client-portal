import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import TopBar from "@/components/TopBar";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { setStatus } from "../../actions";
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
                    {t.role === "user" ? (t.display ?? t.content) : <div className="body"><ReactMarkdown remarkPlugins={[remarkGfm]}>{t.content.replace(/<<<(PROFILE|LINKEDIN)[\s\S]*?(PROFILE|LINKEDIN)>>>/g, "_[Document saved to panel]_")}</ReactMarkdown></div>}
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
