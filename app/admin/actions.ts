"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type AddState = { ok: boolean; message: string };

export async function addClient(_prev: AddState, form: FormData): Promise<AddState> {
  await requireAdmin();
  const email = String(form.get("email") || "").trim().toLowerCase();
  const name = String(form.get("name") || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, message: "Enter a valid email." };
  const { error } = await supabaseAdmin().from("clients").upsert({ email, name: name || null });
  if (error) return { ok: false, message: "Couldn't add that client. Try again." };
  revalidatePath("/admin");
  return { ok: true, message: `${name || email} can now sign in at the portal with ${email}.` };
}

export async function removeClient(form: FormData) {
  await requireAdmin();
  const email = String(form.get("email") || "").toLowerCase();
  await supabaseAdmin().from("clients").delete().eq("email", email);
  revalidatePath("/admin");
}

export async function setStatus(form: FormData) {
  await requireAdmin();
  const email = String(form.get("email") || "").toLowerCase();
  const to = String(form.get("to"));
  const db = supabaseAdmin();
  const { data: rec } = await db.from("positioning").select("profile").eq("email", email).maybeSingle();
  if (!rec) return;
  if (to === "approved") {
    await db
      .from("positioning")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
        profile: String(rec.profile || "").replace(/Draft Positioning Profile/g, "Master Positioning Profile"),
        updated_at: new Date().toISOString(),
      })
      .eq("email", email);
  } else if (to === "draft") {
    await db
      .from("positioning")
      .update({
        status: "draft",
        approved_at: null,
        profile: String(rec.profile || "").replace(/Master Positioning Profile/g, "Draft Positioning Profile"),
        updated_at: new Date().toISOString(),
      })
      .eq("email", email);
  }
  revalidatePath("/admin");
  revalidatePath(`/admin/client/${encodeURIComponent(email)}`);
}
