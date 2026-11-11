import { currentUser } from "@/lib/auth";
import { getPositioning, savePositioning } from "@/lib/positioning";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });
  const { action } = await req.json().catch(() => ({}));
  const rec = await getPositioning(user.id, user.email!);

  if (action === "submit") {
    if (!rec.profile) return Response.json({ error: "Finish your Draft Positioning Profile first." }, { status: 400 });
    if (rec.status === "approved") return Response.json({ status: rec.status });
    await savePositioning(user.id, { status: "submitted" });
    return Response.json({ status: "submitted" });
  }
  if (action === "reset") {
    if (rec.status === "approved") return Response.json({ error: "Your positioning is approved. Ask Curt before starting over." }, { status: 400 });
    await savePositioning(user.id, { turns: [], profile: "", linkedin: "", status: "draft" });
    return Response.json({ status: "draft" });
  }
  return Response.json({ error: "Unknown action" }, { status: 400 });
}
