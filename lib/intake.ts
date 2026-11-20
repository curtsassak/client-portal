import { supabaseAdmin } from "./supabase/admin";

// Edit these to change the onboarding questions. `measures` is the three success measures.
export const INTAKE_QUESTIONS = [
  { id: "why_now", label: "What's happening in your career right now, and why did you decide to work with Curt now?" },
  { id: "goals", label: "What are your goals in working with Curt?" },
  { id: "obstacles", label: "What could get in the way of reaching those goals (time, finances, confidence, family, anything else)?" },
] as const;

export const MEASURE_HINT =
  "Make each one something you could check yes or no at the end of the program. For example: \"Have a clear target role I'm confident in\" or \"Have 10 conversations with people in my target industry,\" rather than \"feel better about my career.\"";

export type MeasureStatus = "not_started" | "in_progress" | "met" | "not_met";
export type Measure = { text: string; status: MeasureStatus; note?: string };
export type Intake = {
  user_id: string;
  email: string;
  answers: Record<string, string>;
  measures: Measure[];
  submitted_at: string | null;
  confirmed_at: string | null;
  updated_at: string;
};

export const STATUS_LABEL: Record<MeasureStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  met: "Met",
  not_met: "Not met",
};

/** Returns the intake, null if none yet, or "unavailable" if the table isn't set up (so the portal keeps working). */
export async function getIntakeByUser(userId: string): Promise<Intake | null | "unavailable"> {
  const { data, error } = await supabaseAdmin().from("intake").select("*").eq("user_id", userId).maybeSingle();
  if (error) {
    console.error("intake read failed", error.message);
    return "unavailable";
  }
  return (data as Intake) ?? null;
}

export async function getIntakeByEmail(email: string): Promise<Intake | null> {
  const { data } = await supabaseAdmin().from("intake").select("*").eq("email", email.toLowerCase()).maybeSingle();
  return (data as Intake) ?? null;
}
