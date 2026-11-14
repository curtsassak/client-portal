import Link from "next/link";
import TopBar from "@/components/TopBar";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import AddClient from "./AddClient";
import { removeClient } from "./actions";
import SignInLink from "./SignInLink";

export const dynamic = "force-dynamic";

const LABEL: Record<string, { text: string; cls: string }> = {
  none: { text: "Not started", cls: "" },
  draft: { text: "In progress", cls: "" },
  ready: { text: "Draft ready", cls: "gold" },
  submitted: { text: "Needs your review", cls: "alert" },
  approved: { text: "Approved", cls: "ok" },
};

export default async function Admin() {
  const user = await requireAdmin();
  const db = supabaseAdmin();
  const [{ data: clients }, { data: recs }] = await Promise.all([
    db.from("clients").select("email,name,created_at").order("created_at", { ascending: false }),
    db.from("positioning").select("email,status,profile,updated_at"),
  ]);
  const byEmail = new Map((recs || []).map((r) => [String(r.email).toLowerCase(), r]));
  const rows = (clients || []).map((c) => {
    const r = byEmail.get(c.email);
    const key = !r ? "none" : r.status === "draft" ? (r.profile ? "ready" : "draft") : r.status;
    return { ...c, key, updated: r?.updated_at as string | undefined };
  });
  const order = ["submitted", "ready", "draft", "none", "approved"];
  rows.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
  const waiting = rows.filter((r) => r.key === "submitted").length;

  return (
    <div className="page">
      <TopBar email={user.email} admin />
      <main className="admin">
        <div className="admin-head">
          <h2 className="h-xl">Clients</h2>
          <p className="muted lead">{waiting ? `${waiting} positioning profile${waiting > 1 ? "s" : ""} waiting for your review.` : "Nothing waiting for review."}</p>
        </div>

        <section className="panel">
          <h3>Add a client</h3>
          <p className="muted small">They sign in at this site with this email. No account setup on their side.</p>
          <AddClient />
        </section>

        <section className="panel">
          {rows.length === 0 ? (
            <p className="muted">No clients yet. Add one above.</p>
          ) : (
            <div className="table-wrap">
              <table className="clients">
                <thead><tr><th>Client</th><th>Positioning</th><th>Last activity</th><th></th></tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.email}>
                      <td>
                        <Link href={`/admin/client/${encodeURIComponent(r.email)}`} className="strong">{r.name || r.email}</Link>
                        {r.name && <div className="muted small">{r.email}</div>}
                      </td>
                      <td><span className={`pill ${LABEL[r.key].cls}`}>{LABEL[r.key].text}</span></td>
                      <td className="muted small">{r.updated ? new Date(r.updated).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/Chicago" }) : "—"}</td>
                      <td>
                        <SignInLink email={r.email} />
                        <form action={removeClient}>
                          <input type="hidden" name="email" value={r.email} />
                          <button className="btn link" type="submit" title="Removes sign-in access. Their work is kept.">Remove access</button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
