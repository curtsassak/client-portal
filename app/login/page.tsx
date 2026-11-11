"use client";

import { useFormState, useFormStatus } from "react-dom";
import { sendLink, type LoginState } from "./actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button className="btn primary" type="submit" disabled={pending}>
      {pending ? "Sending…" : "Email me a sign-in link"}
    </button>
  );
}

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  const [state, action] = useFormState<LoginState, FormData>(sendLink, { ok: false, message: "" });
  return (
    <main className="login">
      <div className="login-card">
        <div className="brand">
          <h1>Next Move <b>Portal</b></h1>
          <small>Curt Sassak · Career Strategy</small>
        </div>
        <p className="muted">Sign in with the email you gave Curt. We'll send you a one-time link, no password needed.</p>
        <form action={action} className="stack">
          <label htmlFor="email" className="label">Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" className="field" />
          <Submit />
        </form>
        {searchParams.error && !state.message && <p className="msg bad">That link expired or was already used. Request a new one.</p>}
        {state.message && <p className={`msg ${state.ok ? "" : "bad"}`}>{state.message}</p>}
      </div>
    </main>
  );
}
