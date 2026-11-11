import { redirect } from "next/navigation";
import { supabaseServer } from "./supabase/server";

export function isAdminEmail(email?: string | null) {
  const admin = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  return !!email && !!admin && email.trim().toLowerCase() === admin;
}

export async function currentUser() {
  const { data } = await supabaseServer().auth.getUser();
  return data.user ?? null;
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!isAdminEmail(user.email)) redirect("/home");
  return user;
}
