import Link from "next/link";
import { signOut } from "@/app/login/actions";

export default function TopBar({ email, admin }: { email?: string | null; admin?: boolean }) {
  return (
    <header className="top">
      <Link href="/" className="brand plain">
        <h1>Next Move <b>Portal</b></h1>
        <small>Curt Sassak · Career Strategy</small>
      </Link>
      <div className="top-right">
        {admin && <Link className="btn" href="/admin">Clients</Link>}
        <span className="muted small">{email}</span>
        <form action={signOut}>
          <button className="btn link" type="submit">Sign out</button>
        </form>
      </div>
    </header>
  );
}
