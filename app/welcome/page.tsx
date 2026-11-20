import { redirect } from "next/navigation";
import TopBar from "@/components/TopBar";
import { requireUser, isAdminEmail } from "@/lib/auth";
import { INTAKE_QUESTIONS, MEASURE_HINT, getIntakeByUser } from "@/lib/intake";
import WelcomeForm from "./WelcomeForm";

export const dynamic = "force-dynamic";

export default async function Welcome() {
  const user = await requireUser();
  const intake = await getIntakeByUser(user.id);
  if (intake === "unavailable" || (intake && intake.submitted_at)) redirect("/home");
  return (
    <div className="page">
      <TopBar email={user.email} admin={isAdminEmail(user.email)} />
      <main className="home narrow">
        <h2 className="h-xl">Welcome. Let&apos;s set your goals.</h2>
        <p className="muted lead">Before you start, answer a few questions so you and Curt agree on what success looks like. Your progress against these goals is tracked through the program.</p>
        <WelcomeForm questions={INTAKE_QUESTIONS} hint={MEASURE_HINT} initial={intake ? { answers: intake.answers, measures: intake.measures.map((m) => m.text) } : undefined} />
      </main>
    </div>
  );
}
