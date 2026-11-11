import { currentUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "No file" }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) return Response.json({ error: "That file is over 10 MB." }, { status: 400 });

  const name = file.name.toLowerCase();
  const buf = Buffer.from(await file.arrayBuffer());
  let text = "";
  try {
    if (name.endsWith(".pdf")) {
      const { extractText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(new Uint8Array(buf));
      const out = await extractText(pdf, { mergePages: true });
      text = Array.isArray(out.text) ? out.text.join("\n\n") : out.text;
    } else if (name.endsWith(".docx")) {
      const mammoth = await import("mammoth");
      text = (await mammoth.extractRawText({ buffer: buf })).value;
    } else if (/\.(txt|md)$/.test(name)) {
      text = buf.toString("utf8");
    } else {
      return Response.json({ error: "Use a PDF, Word (.docx) or text file." }, { status: 400 });
    }
  } catch {
    return Response.json({ error: "Couldn't read that file. Paste the text into the message box instead." }, { status: 400 });
  }
  text = text.replace(/\n{3,}/g, "\n\n").trim();
  if (!text) return Response.json({ error: "That file has no readable text. If it's a scanned PDF, paste the text instead." }, { status: 400 });
  return Response.json({ name: file.name, text: text.slice(0, 40_000) });
}
