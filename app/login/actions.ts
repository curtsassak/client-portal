"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/auth";
import { siteOrigin } from "@/lib/origin";
import { redirect } from "next/navigation";

export type LoginState = { ok: boolean; message: string };

export async function sendLink(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, message: "Enter a valid email address." };

  let allowed = isAdminEmail(email);
  if (!allowed) {
    const { data } = await supabaseAdmin().from("clients").select("email").eq("email", email).maybeSingle();
    allowed = !!data;
  }
  // Same answer either way, so the page doesn't reveal who is a client.
  const generic = { ok: true, message: "If that email is on the client list, a sign-in link is on its way. Check your inbox." };
  if (!allowed) return generic;

  const { error } = await supabaseServer().auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${siteOrigin()}/auth/callback`, shouldCreateUser: true },
  });
  if (error) {
    if (/rate|limit/i.test(error.message)) return { ok: false, message: "Too many sign-in emails just now. Wait a few minutes and try again." };
    return { ok: false, message: "Couldn't send the link. Try again in a minute." };
  }
  return generic;
}

export async function signOut() {
  await supabaseServer().auth.signOut();
  redirect("/login");
}
