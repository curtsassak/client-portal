import TopBar from "@/components/TopBar";
import { requireUser, isAdminEmail } from "@/lib/auth";
import { getPositioning } from "@/lib/positioning";
import PositioningClient from "./PositioningClient";

export const dynamic = "force-dynamic";

export default async function PositioningPage() {
  const user = await requireUser();
  const rec = await getPositioning(user.id, user.email!);
  return (
    <div className="page app">
      <TopBar email={user.email} admin={isAdminEmail(user.email)} />
      <PositioningClient
        initial={{
          turns: (rec.turns || []).map((t) => ({ role: t.role, content: t.content, display: t.display, attach: t.attach })),
          profile: rec.profile,
          linkedin: rec.linkedin,
          status: rec.status,
        }}
      />
    </div>
  );
}
