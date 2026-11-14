"use client";

import { useState } from "react";
import { createSignInLink } from "./actions";

export default function SignInLink({ email }: { email: string }) {
  const [state, setState] = useState<{ link?: string; msg?: string; busy?: boolean }>({});

  async function make() {
    setState({ busy: true });
    const r = await createSignInLink(email);
    if (!r.ok || !r.link) { setState({ msg: r.message || "Couldn't create a link." }); return; }
    try { await navigator.clipboard.writeText(r.link); setState({ link: r.link, msg: "Copied. Works once, expires in 1 hour." }); }
    catch { setState({ link: r.link, msg: "Copy the link below. Works once, expires in 1 hour." }); }
  }

  return (
    <div className="signin-link">
      <button type="button" className="btn" onClick={make} disabled={state.busy}>
        {state.busy ? "Creating…" : "Copy sign-in link"}
      </button>
      {state.msg && <div className="muted small">{state.msg}</div>}
      {state.link && <input className="field small" readOnly value={state.link} onFocus={(e) => e.target.select()} aria-label="Sign-in link" />}
    </div>
  );
}
