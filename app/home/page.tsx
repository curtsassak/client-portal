import Link from "next/link";
import TopBar from "@/components/TopBar";
import { requireUser, isAdminEmail } from "@/lib/auth";
import { getPositioning } from "@/lib/positioning";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requireUser();
  const rec = await getPositioning(user.id, user.email!);
  const approved = rec.status === "approved";
  const posState =
    approved ? "Approved · LinkedIn open" : rec.status === "submitted" ? "Submitted for Curt's review" : rec.profile ? "Draft ready" : rec.turns.length ? "In progress" : "Start here";

  return (
    <div className="page">
      <TopBar email={user.email} admin={isAdminEmail(user.email)} />
      <main className="home">
        <h2 className="h-xl">Your tools</h2>
        <p className="muted lead">Positioning comes first. Once Curt approves it, your Résumé and Content tools build on it.</p>
        <div className="tools">
          <Link href="/positioning" className="tool live">
            <span className="tool-step">Step 1</span>
            <b>Executive Positioning</b>
            <span>Why a specific employer should hire you, backed by proof. Then your LinkedIn.</span>
            <span className={`pill ${approved ? "ok" : "gold"}`}>{posState}</span>
          </Link>
          <div className="tool locked" aria-disabled="true">
            <span className="tool-step">Step 2</span>
            <b>Résumé</b>
            <span>Built on your approved positioning.</span>
            <span className="pill">{approved ? "Coming soon" : "Opens after approval"}</span>
          </div>
          <div className="tool locked" aria-disabled="true">
            <span className="tool-step">Step 3</span>
            <b>Content</b>
            <span>Posts that reinforce your positioning.</span>
            <span className="pill">{approved ? "Coming soon" : "Opens after approval"}</span>
          </div>
        </div>
      </main>
    </div>
  );
}
