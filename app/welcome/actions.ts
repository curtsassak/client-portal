"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { INTAKE_QUESTIONS, getIntakeByUser, type Measure } from "@/lib/intake";

export type IntakeState = { ok: boolean; message: string };

export async function submitIntake(_prev: IntakeState, form: FormData): Promise<IntakeState> {
  const user = await requireUser();
  const existing = await getIntakeByUser(user.id);
  if (existing && existing !== "unavailable" && existing.submitted_at) return { ok: false, message: "Your answers are already submitted. Ask Curt if you need to change them." };

  const answers: Record<string, string> = {};
  for (const q of INTAKE_QUESTIONS) {
    const v = String(form.get(q.id) || "").trim().slice(0, 4000);
    if (!v) return { ok: false, message: "Please answer every question." };
    answers[q.id] = v;
  }
  const measures: Measure[] = [1, 2, 3].map((i) => ({ text: String(form.get(`measure${i}`) || "").trim().slice(0, 500), status: "not_started" as const }));
  if (measures.some((m) => !m.text)) return { ok: false, message: "Please add all three ways you'll measure success." };

  const now = new Date().toISOString();
  const { error } = await supabaseAdmin().from("intake").upsert({
    user_id: user.id,
    email: user.email!.toLowerCase(),
    answers,
    measures,
    submitted_at: now,
    updated_at: now,
  });
  if (error) return { ok: false, message: "Couldn't save your answers. Try again in a minute." };
  redirect("/home");
}
