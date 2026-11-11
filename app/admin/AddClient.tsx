"use client";

import { useFormState, useFormStatus } from "react-dom";
import { addClient, type AddState } from "./actions";

function Submit() {
  const { pending } = useFormStatus();
  return <button className="btn primary" type="submit" disabled={pending}>{pending ? "Adding…" : "Add client"}</button>;
}

export default function AddClient() {
  const [state, action] = useFormState<AddState, FormData>(addClient, { ok: false, message: "" });
  return (
    <form action={action} className="add-client">
      <div className="fieldset">
        <label htmlFor="client-name" className="label">Name</label>
        <input id="client-name" name="name" className="field" autoComplete="off" />
      </div>
      <div className="fieldset">
        <label htmlFor="client-email" className="label">Email</label>
        <input id="client-email" name="email" type="email" required className="field" autoComplete="off" />
      </div>
      <Submit />
      {state.message && <p className={`msg ${state.ok ? "" : "bad"}`}>{state.message}</p>}
    </form>
  );
}
