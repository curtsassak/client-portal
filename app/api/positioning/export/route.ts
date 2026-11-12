import { marked } from "marked";
import { currentUser, isAdminEmail } from "@/lib/auth";
import { getPositioning } from "@/lib/positioning";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Downloads the profile or LinkedIn draft as a Word file (opens in Word, Pages or Google Docs).
export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) return new Response("Not signed in", { status: 401 });
  const url = new URL(req.url);
  const which = url.searchParams.get("doc") === "linkedin" ? "linkedin" : "profile";
  const forEmail = url.searchParams.get("email");

  let rec: { profile: string; linkedin: string; status: string } | null = null;
  if (forEmail && isAdminEmail(user.email)) {
    const { data } = await supabaseAdmin().from("positioning").select("profile,linkedin,status").eq("email", forEmail.toLowerCase()).maybeSingle();
    rec = data;
  } else {
    rec = await getPositioning(user.id, user.email!);
  }
  const md = rec ? (which === "linkedin" ? rec.linkedin : rec.profile) : "";
  if (!md) return new Response("Nothing to download yet", { status: 404 });

  // Strip whitespace between tags so Word doesn't render stray blank lines.
  const body = (await marked.parse(md, { gfm: true })).replace(/>\s+</g, "><");
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body{font-family:Arial,sans-serif;font-size:11pt}
    h1{font-size:20pt} h2{font-size:15pt} h3{font-size:12pt}
    table{border-collapse:collapse;width:100%} td,th{border:1px solid #999;padding:4pt;vertical-align:top}
  </style></head><body>${body}</body></html>`;

  const HTMLtoDOCX = (await import("html-to-docx")).default;
  const buf = (await HTMLtoDOCX(html, null, {
    table: { row: { cantSplit: true } },
    font: "Arial",
    fontSize: 22,
    margins: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
  })) as Buffer;

  const title =
    which === "linkedin" ? "LinkedIn Profile Draft" : rec!.status === "approved" ? "Master Positioning Profile" : "Draft Positioning Profile";
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${title.replace(/ /g, "-")}.docx"`,
      "Cache-Control": "no-store",
    },
  });
}
