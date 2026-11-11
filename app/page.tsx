import { redirect } from "next/navigation";
import { currentUser, isAdminEmail } from "@/lib/auth";

export default async function Root() {
  const user = await currentUser();
  if (!user) redirect("/login");
  redirect(isAdminEmail(user.email) ? "/admin" : "/home");
}
