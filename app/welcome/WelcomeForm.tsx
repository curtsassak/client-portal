"use client";

import { useFormState, useFormStatus } from "react-dom";
import { submitIntake, type IntakeState } from "./actions";

type Q = { id: string; label: string };

function Submit() {
  const { pending } = useFormStatus();
  return <button className="btn primary" type="submit" disabled={pending}>{pending ? "Saving…" : "Submit my answers"}</button>;
}

export default function WelcomeForm({ questions, hint, initial }: { questions: readonly Q[]; hint: string; initial?: { answers: Record<string, string>; measures: string[] } }) {
  const [state, action] = useFormState<IntakeState, FormData>(submitIntake, { ok: false, message: "" });
  return (
    <form action={action} className="intake">
      {questions.map((q) => (
        <div className="fieldset" key={q.id}>
          <label htmlFor={q.id} className="q">{q.label}</label>
          <textarea id={q.id} name={q.id} className="field" rows={4} required defaultValue={initial?.answers[q.id] || ""} />
        </div>
      ))}
      <div className="fieldset">
        <span className="q">What are three ways you'll measure success at the end of our work together?</span>
        <span className="muted small">{hint}</span>
        {[1, 2, 3].map((i) => (
          <input key={i} id={`measure${i}`} name={`measure${i}`} className="field" placeholder={`Measure ${i}`} required defaultValue={initial?.measures[i - 1] || ""} aria-label={`Success measure ${i}`} />
        ))}
      </div>
      <p className="muted small">Curt will review these with you. Once submitted, they're saved as the goals for your program.</p>
      <Submit />
      {state.message && <p className={`msg ${state.ok ? "" : "bad"}`}>{state.message}</p>}
    </form>
  );
}
