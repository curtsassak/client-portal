import { redirect } from "next/navigation";
import { currentUser, isAdminEmail } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Root({ searchParams }: { searchParams: { code?: string; error_description?: string } }) {
  // If Supabase sends the sign-in link to the home page instead of /auth/callback, finish sign-in here.
  if (searchParams.code) redirect(`/auth/callback?code=${encodeURIComponent(searchParams.code)}`);
  if (searchParams.error_description) redirect("/login?error=link");
  const user = await currentUser();
  if (!user) redirect("/login");
  redirect(isAdminEmail(user.email) ? "/admin" : "/home");
}
